import { NextRequest, NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
import { getMsg91Config, isMsg91Configured, sendSmsOtp } from '@/lib/msg91'
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
    const cfg = getMsg91Config()
    return NextResponse.json(
      { error: 'Verification service not configured.', debug: cfg },
      { status: 503 },
    )
  }

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  // Rate limit: max SEND_RATE_LIMIT sends for this phone in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await otpTable(admin)
    .select('id', { count: 'exact', head: true })
    .eq('phone', phone)
    .gte('created_at', oneHourAgo)

  if ((count ?? 0) >= SEND_RATE_LIMIT) {
    return NextResponse.json(
      { error: 'Too many OTP requests. Please wait before trying again.' },
      { status: 429 },
    )
  }

  // Ask MSG91 to send the OTP — it generates the code and returns a reqId
  let reqId: string
  try {
    const result = await sendSmsOtp(phone)
    reqId = result.reqId
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    logger.error('[send-otp] MSG91 send failed', { error: errMsg })
    // TODO: remove debug detail before final production hardening
    return NextResponse.json(
      { error: 'Failed to send OTP. Please try again.', debug: errMsg },
      { status: 502 },
    )
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
  })
}
