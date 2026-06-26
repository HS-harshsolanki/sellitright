import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { verifyRazorpaySignature } from '@/lib/razorpay'

interface VerifyBody {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
  interestId: string
}

// Placeholder contact until real Supabase auth.users lookup is wired
// (user asked to hardcode for now — swap for admin.auth.admin.getUserById() later)
function getPlaceholderContact(userId: string) {
  return {
    phone: `+91-XXXXXXXXXX (uid: ${userId.slice(0, 8)})`,
    email: null as string | null,
  }
}

// POST /api/payments/verify
// Verifies Razorpay payment signature and unlocks contact details.
export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to verify payment.' }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: VerifyBody
  try {
    body = (await request.json()) as VerifyBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, interestId } = body

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !interestId) {
    return NextResponse.json({ error: 'Missing required payment fields.' }, { status: 400 })
  }

  // ── Demo mode (no real Razorpay keys) ────────────────────────────────────
  const isDemoOrder = razorpayOrderId.startsWith('demo_order_')
  if (!isDemoOrder) {
    // ── Verify HMAC signature ───────────────────────────────────────────────
    const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)
    if (!isValid) {
      return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 })
    }
  }

  // ── Fetch payment row ─────────────────────────────────────────────────────
  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured. Contact support.' }, { status: 503 })
  }

  // In demo mode there's no real order row — skip the DB lookup and go straight to unlock
  if (!isDemoOrder) {
    const { data: payment, error: paymentErr } = await admin
      .from('payments')
      .select('id, status, buyer_id, seller_id, interest_id')
      .eq('razorpay_order_id', razorpayOrderId)
      .maybeSingle()

    if (paymentErr || !payment) {
      return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 })
    }

    if (payment.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Not authorised.' }, { status: 403 })
    }

    // Idempotent — already succeeded
    if (payment.status === 'SUCCESS') {
      const { data: interest } = await admin
        .from('buyer_interest')
        .select('seller_phone, seller_email')
        .eq('id', interestId)
        .single()
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        sellerPhone: interest?.seller_phone ?? null,
        sellerEmail: interest?.seller_email ?? null,
      })
    }

    // ── Update payment to SUCCESS ─────────────────────────────────────────
    const { error: updatePaymentErr } = await admin
      .from('payments')
      .update({
        status: 'SUCCESS',
        razorpay_payment_id: razorpayPaymentId,
        paid_at: new Date().toISOString(),
      })
      .eq('id', payment.id)

    if (updatePaymentErr) {
      console.error('[payments/verify] update payment error:', updatePaymentErr.message)
      return NextResponse.json({ error: 'Failed to record payment.' }, { status: 500 })
    }
  }

  // ── Fetch buyer_interest to get seller_id ────────────────────────────────
  const { data: interest, error: interestErr } = await admin
    .from('buyer_interest')
    .select('id, buyer_id, seller_id')
    .eq('id', interestId)
    .single()

  if (interestErr || !interest) {
    return NextResponse.json({ error: 'Interest record not found.' }, { status: 404 })
  }

  // ── Resolve contacts (placeholder — swap for real auth.users lookup later)
  const sellerContact = getPlaceholderContact(interest.seller_id)
  const buyerContact = getPlaceholderContact(interest.buyer_id)

  // ── Unlock contact on buyer_interest ─────────────────────────────────────
  const { error: unlockErr } = await admin
    .from('buyer_interest')
    .update({
      contact_unlocked: true,
      seller_phone: sellerContact.phone,
      seller_email: sellerContact.email,
      buyer_phone: buyerContact.phone,
      buyer_email: buyerContact.email,
    })
    .eq('id', interestId)

  if (unlockErr) {
    console.error('[payments/verify] unlock error:', unlockErr.message)
    return NextResponse.json(
      { error: 'Payment recorded but contact unlock failed.' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    sellerPhone: sellerContact.phone,
    sellerEmail: sellerContact.email,
  })
}
