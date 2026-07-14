import { NextRequest, NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
import { isMsg91Configured, verifyOtpWithWidget } from '@/lib/msg91'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

// POST /api/phone/verify-otp
// Body: { phone: string, otp: string }
// Validates the OTP via MSG91 widget and sets user_metadata.phone + phone_verified: true on success.
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

  // Verify OTP via MSG91 widget (authoritative check — no local hash needed)
  if (!isMsg91Configured()) {
    return NextResponse.json({ error: 'Verification service not configured.' }, { status: 503 })
  }

  const { valid, message } = await verifyOtpWithWidget(phone, otp)
  if (!valid) {
    return NextResponse.json(
      { error: message ?? 'Incorrect or expired OTP. Please try again.' },
      { status: 422 },
    )
  }

  // OTP correct — persist verified phone to user metadata
  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

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
