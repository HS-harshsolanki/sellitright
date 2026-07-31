import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
import { isMsg91Configured, sendSmsOtp } from '@/lib/msg91'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// phone_otp_requests is a new table not yet in the generated Supabase types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function otpTable(client: ReturnType<typeof createServiceClient>): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).from('phone_otp_requests')
}

const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/
const OTP_TTL_MINUTES = 10
const SEND_RATE_LIMIT = 5

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

// POST /api/phone/send-otp
// Body: { phone: string }
// Asks MSG91 to send an OTP SMS; stores the reqId in phone_otp_requests for verification.
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

  const rawPhone = (body as { phone?: unknown })?.phone
  if (typeof rawPhone !== 'string') {
    return NextResponse.json({ error: 'phone is required.' }, { status: 400 })
  }

  const phone = normalizePhone(rawPhone)
  if (!INDIAN_MOBILE_RE.test(phone)) {
    return NextResponse.json(
      { error: 'Enter a valid 10-digit Indian mobile number.' },
      { status: 422 },
    )
  }

  if (!isMsg91Configured()) {
    return NextResponse.json({ error: 'Verification service not configured.' }, { status: 503 })
  }

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  // Guard: if this user already has this phone verified in the DB, don't send another OTP.
  // This prevents re-verification loops when the client JWT is stale.
  const { data: existingVerified } = await (admin as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .from('profiles')
    .select('phone, phone_verified')
    .eq('id', user.id)
    .maybeSingle()

  if (existingVerified?.phone_verified && existingVerified.phone === phone) {
    return NextResponse.json(
      {
        error: 'This number is already verified on your account.',
        code: 'ALREADY_VERIFIED',
      },
      { status: 409 },
    )
  }

  // Check if another account holds this phone. If it is a ghost phone-auth account
  // (email = phone.XXXXXXXXXX@chapternew.app), release it now so the real user
  // can verify without hitting PHONE_ALREADY_CLAIMED at verify time.
  const { data: otherHolder } = await (admin as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .eq('phone_verified', true)
    .neq('id', user.id)
    .maybeSingle()

  if (otherHolder) {
    const { data: holderAuth } = await admin.auth.admin.getUserById(otherHolder.id)
    const holderEmail = holderAuth?.user?.email ?? ''
    if (/^phone\.\d+@chapternew\.app$/.test(holderEmail)) {
      logger.error('[send-otp] pre-releasing ghost phone-auth account claim', {
        ghostId: otherHolder.id,
        phone,
      })
      await Promise.all([
        (admin as any) // eslint-disable-line @typescript-eslint/no-explicit-any
          .from('profiles')
          .update({ phone: null, phone_verified: false })
          .eq('id', otherHolder.id),
        // Also clear auth metadata so the handle_user_update trigger can't re-populate profiles
        admin.auth.admin.updateUserById(otherHolder.id, {
          user_metadata: {
            ...(holderAuth?.user?.user_metadata ?? {}),
            phone: null,
            phone_verified: false,
          },
        }),
      ])
    }
  }

  // Rate limit: max SEND_RATE_LIMIT sends for this phone in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error: countError } = await otpTable(admin)
    .select('id', { count: 'exact', head: true })
    .eq('phone', phone)
    .gte('created_at', oneHourAgo)

  if (countError) {
    logger.error('[send-otp] rate-limit query failed', { error: countError.message })
    return NextResponse.json(
      { error: 'Verification service temporarily unavailable.' },
      { status: 503 },
    )
  }

  if ((count ?? 0) >= SEND_RATE_LIMIT) {
    return NextResponse.json(
      { error: 'Too many OTP requests. Please wait before trying again.' },
      { status: 429 },
    )
  }

  // Ask MSG91 to send the OTP — it generates the code and returns a reqId.
  // If MSG91 rejects the auth key (e.g. key invalid in dev/staging), fall back to a
  // deterministic dev OTP so the rest of the flow can be tested without a live key.
  // The dev OTP is printed to the server console — check your Next.js terminal.
  let reqId: string
  let devOtp: string | null = null
  try {
    const result = await sendSmsOtp(phone)
    reqId = result.reqId
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    logger.error('[send-otp] MSG91 send failed', { error: errMsg })

    if (process.env.NODE_ENV !== 'production') {
      // Dev fallback: deterministic 6-digit OTP from SHA-256(phone + date)
      const today = new Date().toISOString().slice(0, 10)
      const hash = createHash('sha256').update(`${phone}-${today}-dev`).digest('hex')
      devOtp = hash.slice(-6).replace(/[a-f]/g, (c) => String(c.charCodeAt(0) % 10))
      reqId = `dev-${phone}-${Date.now()}`
      logger.error('[send-otp] using DEV fallback OTP (value suppressed in logs)', {
        phone: `+91${phone.slice(0, 4)}****`,
      })
    } else {
      return NextResponse.json({ error: 'Failed to send OTP. Please try again.' }, { status: 502 })
    }
  }

  // Store reqId in otp_hash column (reused as generic text store for the request token)
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString()
  const { error: insertError } = await otpTable(admin).insert({
    user_id: user.id,
    phone,
    otp_hash: reqId,
    expires_at: expiresAt,
  })

  if (insertError) {
    logger.error('[send-otp] failed to store reqId', { error: insertError.message })
    return NextResponse.json({ error: 'Failed to initiate verification.' }, { status: 500 })
  }

  return NextResponse.json({
    message: `OTP sent via SMS to +91 ${phone.slice(0, 5)}XXXXX`,
    expiresInMinutes: OTP_TTL_MINUTES,
    // In dev mode when MSG91 fails, return the OTP so the tester can use it
    ...(devOtp ? { devOtp } : {}),
  })
}
