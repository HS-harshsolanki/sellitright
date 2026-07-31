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

  // Guard: if the user already has this number verified in the DB, skip MSG91 and
  // just re-write user_metadata so the JWT gets refreshed. This handles the
  // re-verify loop caused by a stale JWT.
  const { data: alreadyVerified } = await (admin as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .from('profiles')
    .select('phone_verified')
    .eq('id', user.id)
    .eq('phone', phone)
    .maybeSingle()

  if (alreadyVerified?.phone_verified) {
    // Re-write metadata so the JWT will be fresh on next refreshSession()
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, phone, phone_verified: true },
    })
    return NextResponse.json({ message: 'Phone already verified.', phone })
  }

  const MAX_VERIFY_ATTEMPTS = 5

  // Find the most recent unexpired, unused OTP request for this user+phone
  const now = new Date().toISOString()
  const { data: rows } = await otpTable(admin)
    .select('id, otp_hash, attempt_count')
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

  const {
    id: rowId,
    otp_hash: reqId,
    attempt_count: attemptCount,
  } = rows[0] as { id: string; otp_hash: string; attempt_count: number | null }

  // Increment attempt counter and lock out after MAX_VERIFY_ATTEMPTS failures
  const attempts = (attemptCount ?? 0) + 1
  if (attempts > MAX_VERIFY_ATTEMPTS) {
    await otpTable(admin).update({ used: true }).eq('id', rowId)
    return NextResponse.json(
      { error: 'Too many incorrect attempts. Please request a new OTP.' },
      { status: 429 },
    )
  }
  await otpTable(admin).update({ attempt_count: attempts }).eq('id', rowId)

  // Block if another verified account already holds this phone number BEFORE consuming the OTP.
  // Doing this first ensures a 409 doesn't waste the user's OTP.
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
    // Check whether the existing holder is a ghost phone-auth account
    // (created by the old Firebase phone-auth system, email = phone.XXXXXXXXXX@chapternew.app).
    // These accounts are safe to release — the real user is verifying via OTP.
    const { data: holderAuthUser } = await admin.auth.admin.getUserById(existingHolder.id)
    const holderEmail = holderAuthUser?.user?.email ?? ''
    const isGhostAccount = /^phone\.\d+@chapternew\.app$/.test(holderEmail)

    if (isGhostAccount) {
      // Release the ghost account's phone claim so the real user can take it.
      // Also clear auth metadata — the handle_user_update trigger re-reads raw_user_meta_data
      // on any auth.users UPDATE, so leaving stale metadata would cause the trigger to
      // re-populate profiles.phone_verified on the ghost account.
      logger.error('[verify-otp] releasing ghost phone-auth account claim', {
        ghostId: existingHolder.id,
        phone,
      })
      await Promise.all([
        (admin as any) // eslint-disable-line @typescript-eslint/no-explicit-any
          .from('profiles')
          .update({ phone: null, phone_verified: false })
          .eq('id', existingHolder.id),
        admin.auth.admin.updateUserById(existingHolder.id, {
          user_metadata: {
            ...(holderAuthUser?.user?.user_metadata ?? {}),
            phone: null,
            phone_verified: false,
          },
        }),
      ])
    } else {
      return NextResponse.json(
        {
          error:
            'This phone number is already linked to another account. If you believe this is a mistake, please contact support.',
          code: 'PHONE_ALREADY_CLAIMED',
        },
        { status: 409 },
      )
    }
  }

  // Delegate verification to MSG91 widget (it is the authoritative OTP source)
  const { valid, message } = await verifyOtpWithWidget(otp, reqId)
  if (!valid) {
    return NextResponse.json(
      { error: message ?? 'Incorrect or expired OTP. Please try again.' },
      { status: 422 },
    )
  }

  // Mark ALL unused OTP rows for this user+phone as used (not just the matched one).
  // This prevents stale rows from counting toward the rate limit and avoids the
  // "re-verify loop" where leftover unused rows trick the send-limit check.
  const { error: markUsedError } = await otpTable(admin)
    .update({ used: true })
    .eq('user_id', user.id)
    .eq('phone', phone)
    .eq('used', false)
  if (markUsedError) {
    logger.error('[verify-otp] failed to mark OTP rows used', { error: markUsedError.message })
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
