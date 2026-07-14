import { NextRequest, NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
import { verifyOtpWithWidget } from '@/lib/msg91'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function otpTable(client: ReturnType<typeof createServiceClient>): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).from('phone_otp_requests')
}

// POST /api/phone/verify-otp
// Body: { phone: string, otp: string }
// Looks up the most recent reqId for this phone, then verifies via MSG91 widget.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to verify your phone.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const rawPhone = (body as { phone?: unknown; otp?: unknown })?.phone
  const rawOtp = (body as { phone?: unknown; otp?: unknown })?.otp

  if (typeof rawPhone !== 'string' || typeof rawOtp !== 'string') {
    return NextResponse.json({ error: 'phone and otp are required.' }, { status: 400 })
  }

  const phone = normalizePhone(rawPhone)
  if (!INDIAN_MOBILE_RE.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone number.' }, { status: 422 })
  }

  const otp = rawOtp.replace(/\D/g, '').slice(0, 6)
  if (otp.length !== 6) {
    return NextResponse.json({ error: 'OTP must be 6 digits.' }, { status: 422 })
  }

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  // Find the most recent unexpired, unused OTP request for this user+phone
  const now = new Date().toISOString()
  const { data: rows } = await otpTable(admin)
    .select('id, otp_hash')
    .eq('user_id', user.id)
    .eq('phone', phone)
    .eq('used', false)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!rows || rows.length === 0) {
    return NextResponse.json(
      { error: 'No valid OTP found. Please request a new one.' },
      { status: 404 },
    )
  }

  const { id: rowId, otp_hash: reqId } = rows[0] as { id: string; otp_hash: string }

  // Delegate verification to MSG91 widget (it is the authoritative OTP source)
  const { valid, message } = await verifyOtpWithWidget(otp, reqId)
  if (!valid) {
    return NextResponse.json(
      { error: message ?? 'Incorrect or expired OTP. Please try again.' },
      { status: 422 },
    )
  }

  // Mark the OTP request as used so it can't be replayed
  await otpTable(admin).update({ used: true }).eq('id', rowId)

  // Block if another verified account already holds this phone number.
  // .neq('id', user.id) allows the same user to re-verify their own number.
  const { data: existingHolder, error: uniquenessError } = await (admin as any)
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .eq('phone_verified', true)
    .neq('id', user.id)
    .maybeSingle()

  if (uniquenessError) {
    logger.error('[verify-otp] uniqueness check failed', { error: uniquenessError.message })
    return NextResponse.json(
      { error: 'Verification failed. Please try again or contact support.' },
      { status: 500 },
    )
  }

  if (existingHolder) {
    return NextResponse.json(
      {
        error:
          'This phone number is already linked to another account. If you believe this is a mistake, please contact support.',
        code: 'PHONE_ALREADY_CLAIMED',
      },
      { status: 409 },
    )
  }

  // Persist verified phone to user metadata
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      phone,
      phone_verified: true,
    },
  })

  if (updateError) {
    logger.error('[verify-otp] failed to update user metadata', { error: updateError.message })
    return NextResponse.json(
      { error: 'Phone verified but profile update failed. Please contact support.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ message: 'Phone verified successfully.', phone })
}
