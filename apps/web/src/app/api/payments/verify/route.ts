import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { verifyRazorpaySignature, isRazorpayConfigured } from '@/lib/razorpay'
import { createNotification, createNotifications } from '@/lib/notifications'

interface VerifyBody {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
  interestId: string
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

  // ── Verify HMAC signature ─────────────────────────────────────────────────
  const isDemoOrder = razorpayOrderId.startsWith('demo_order_') && !isRazorpayConfigured()
  if (!isDemoOrder) {
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

  if (payment.interest_id !== body.interestId) {
    return NextResponse.json({ error: 'Interest mismatch' }, { status: 403 })
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

  // ── Update payment to SUCCESS ─────────────────────────────────────────────
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

  // ── Fetch buyer_interest to get seller_id ────────────────────────────────
  const { data: interest, error: interestErr } = await admin
    .from('buyer_interest')
    .select('id, buyer_id, seller_id')
    .eq('id', interestId)
    .single()

  if (interestErr || !interest) {
    return NextResponse.json({ error: 'Interest record not found.' }, { status: 404 })
  }

  // ── Resolve real contacts from Supabase Auth ──────────────────────────────
  const [sellerAuthResult, buyerAuthResult] = await Promise.all([
    admin.auth.admin.getUserById(interest.seller_id),
    admin.auth.admin.getUserById(interest.buyer_id),
  ])
  const sellerContact = {
    phone:
      sellerAuthResult.data.user?.phone ?? sellerAuthResult.data.user?.user_metadata?.phone ?? null,
    email: sellerAuthResult.data.user?.email ?? null,
  }
  const buyerContact = {
    phone:
      buyerAuthResult.data.user?.phone ?? buyerAuthResult.data.user?.user_metadata?.phone ?? null,
    email: buyerAuthResult.data.user?.email ?? null,
  }

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

  // Notify both parties — fire-and-forget
  await createNotifications({
    admin,
    userIds: [interest.seller_id, interest.buyer_id],
    title: 'Contact details unlocked',
    message: 'Your connection is complete. Contact details are now available.',
    type: 'ConnectionUnlocked',
    entityType: 'interest',
    entityId: interestId,
  })
  await createNotification({
    admin,
    userId: interest.seller_id,
    title: 'Payment received',
    message: 'A buyer paid ₹49 to unlock your contact details.',
    type: 'PaymentReceived',
    entityType: 'payment',
    entityId: payment.id,
  })

  return NextResponse.json({
    success: true,
    sellerPhone: sellerContact.phone,
    sellerEmail: sellerContact.email,
  })
}
