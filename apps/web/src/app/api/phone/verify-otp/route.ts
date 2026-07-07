import crypto from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// phone_otp_requests is a new table not yet in the generated Supabase types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function otpTable(client: ReturnType<typeof createServiceClient>): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).from('phone_otp_requests')
}

const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/
// Max failed verify attempts before the OTP row is invalidated
const MAX_ATTEMPTS = 5

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

function hashOtp(otp: string, phone: string, userId: string): string {
  const secret = process.env.OTP_HMAC_SECRET
  if (!secret) throw new Error('[otp] OTP_HMAC_SECRET is not configured')
  return crypto.createHmac('sha256', secret).update(`${otp}:${phone}:${userId}`).digest('hex')
}

// POST /api/phone/verify-otp
// Body: { phone: string, otp: string }
// Validates the OTP and sets user_metadata.phone + phone_verified: true on success.
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

  // Find the most recent valid (unused, unexpired, under attempt limit) OTP for this user+phone
  const { data: otpRow, error: fetchError } = await otpTable(admin)
    .select('id, otp_hash, attempts, expires_at')
    .eq('user_id', user.id)
    .eq('phone', phone)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchError) {
    logger.error('[verify-otp] DB fetch error', { error: fetchError.message })
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 })
  }

  if (!otpRow) {
    return NextResponse.json(
      { error: 'No valid OTP found. Please request a new one.' },
      { status: 404 },
    )
  }

  const expectedHash = hashOtp(otp, phone, user.id)
  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedHash, 'hex'),
    Buffer.from(otpRow.otp_hash, 'hex'),
  )

  if (!isValid) {
    // Increment attempts counter
    await otpTable(admin)
      .update({ attempts: otpRow.attempts + 1 })
      .eq('id', otpRow.id)

    const remaining = MAX_ATTEMPTS - otpRow.attempts - 1
    if (remaining <= 0) {
      return NextResponse.json(
        { error: 'Too many incorrect attempts. Please request a new OTP.' },
        { status: 422 },
      )
    }
    return NextResponse.json(
      { error: `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` },
      { status: 422 },
    )
  }

  // OTP correct — mark as used
  await otpTable(admin).update({ used: true }).eq('id', otpRow.id)

  // Persist phone + verified flag to user_metadata via service role
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
