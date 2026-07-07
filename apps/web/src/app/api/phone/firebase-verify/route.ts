import { NextRequest, NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
import { getFirebaseAdminAuth } from '@/lib/firebase/admin'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/

function normalizePhone(raw: string): string {
  // Strip country code +91 or 91 prefix, spaces, dashes
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

// POST /api/phone/firebase-verify
// Body: { idToken: string }
// Verifies a Firebase ID token that contains a phone_number claim,
// then writes phone + phone_verified: true to Supabase user_metadata.
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

  const idToken = (body as { idToken?: unknown })?.idToken
  if (typeof idToken !== 'string' || !idToken) {
    return NextResponse.json({ error: 'idToken is required.' }, { status: 400 })
  }

  // Verify the Firebase ID token server-side — this is the trust anchor
  let firebasePhone: string
  let firebaseUid: string
  try {
    const adminAuth = getFirebaseAdminAuth()
    const decoded = await adminAuth.verifyIdToken(idToken)

    if (!decoded.phone_number) {
      return NextResponse.json({ error: 'No phone number in Firebase token.' }, { status: 422 })
    }
    firebasePhone = decoded.phone_number // E.164 format e.g. "+919876543210"
    firebaseUid = decoded.uid
  } catch (err) {
    logger.error('[firebase-verify] token verification failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Invalid or expired verification token.' }, { status: 401 })
  }

  // Bind Firebase identity to Supabase user — prevent cross-account phone theft
  // Firebase UID should match the Supabase user's firebase_uid in metadata,
  // OR this is the first time linking (no existing firebase_uid stored yet).
  const existingFirebaseUid = user.user_metadata?.firebase_uid as string | undefined
  if (existingFirebaseUid && existingFirebaseUid !== firebaseUid) {
    return NextResponse.json(
      { error: 'Firebase identity does not match your account.' },
      { status: 403 },
    )
  }

  // Normalize to 10-digit Indian mobile (strip +91)
  const phone = normalizePhone(firebasePhone)
  if (!INDIAN_MOBILE_RE.test(phone)) {
    return NextResponse.json(
      { error: 'Verified number is not a valid Indian mobile number.' },
      { status: 422 },
    )
  }

  // Check no other account has already verified this phone
  const serviceClient = createServiceClient()
  if (serviceClient) {
    const { data: existingUsers } = await serviceClient.auth.admin.listUsers()
    const normalizedPhone = firebasePhone // already E.164 from Firebase
    const conflict = existingUsers?.users?.find(
      (u) =>
        u.id !== user.id &&
        (u.phone === normalizedPhone ||
          u.user_metadata?.phone === normalizedPhone?.replace('+91', '') ||
          (u.user_metadata?.phone_verified === true &&
            u.user_metadata?.phone &&
            normalizedPhone?.endsWith(u.user_metadata.phone))),
    )
    if (conflict) {
      return NextResponse.json(
        { error: 'This phone number is already associated with another account.' },
        { status: 409 },
      )
    }
  }

  // Write phone + phone_verified flag to Supabase user_metadata via service role
  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      phone,
      phone_verified: true,
      firebase_uid: firebaseUid,
    },
  })

  if (updateError) {
    logger.error('[firebase-verify] failed to update user metadata', {
      error: updateError.message,
    })
    return NextResponse.json(
      { error: 'Phone verified but profile update failed. Please contact support.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ message: 'Phone verified successfully.', phone })
}
