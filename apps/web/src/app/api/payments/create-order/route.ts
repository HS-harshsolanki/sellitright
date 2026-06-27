import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getRazorpayInstance, isRazorpayConfigured } from '@/lib/razorpay'

// POST /api/payments/create-order
// Creates a Razorpay order for the ₹49 contact-unlock fee.
// Body: { interestId: string }
export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to unlock contact.' }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const interestId = (body as { interestId?: unknown })?.interestId
  if (typeof interestId !== 'string' || !interestId) {
    return NextResponse.json({ error: 'interestId is required.' }, { status: 400 })
  }

  // ── Verify this buyer's interest is ACCEPTED ──────────────────────────────
  const { data: interest, error: interestErr } = await supabase
    .from('buyer_interest')
    .select('id, buyer_id, seller_id, listing_id, status')
    .eq('id', interestId)
    .eq('buyer_id', user.id)
    .single()

  if (interestErr || !interest) {
    return NextResponse.json({ error: 'Interest request not found.' }, { status: 404 })
  }

  if (interest.status !== 'ACCEPTED') {
    return NextResponse.json(
      { error: 'Contact can only be unlocked after the seller accepts your request.' },
      { status: 422 },
    )
  }

  // ── Prevent double-charge ─────────────────────────────────────────────────
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, status')
    .eq('interest_id', interestId)
    .eq('status', 'SUCCESS')
    .maybeSingle()

  if (existingPayment) {
    return NextResponse.json(
      { error: 'Contact is already unlocked.', alreadyPaid: true },
      { status: 409 },
    )
  }

  // ── Razorpay: create order ────────────────────────────────────────────────
  if (!isRazorpayConfigured()) {
    // Dev/demo mode — return a mock order so UI can be tested without real keys
    return NextResponse.json({
      orderId: `demo_order_${Date.now()}`,
      amount: 4900,
      currency: 'INR',
      keyId: 'rzp_test_demo',
      demo: true,
    })
  }

  let razorpayOrder: { id: string; amount: number; currency: string }
  try {
    const razorpay = getRazorpayInstance()
    razorpayOrder = (await razorpay.orders.create({
      amount: 4900,
      currency: 'INR',
      receipt: interestId.slice(0, 40),
    })) as { id: string; amount: number; currency: string }
  } catch (err) {
    console.error('[payments/create-order] Razorpay error:', err)
    return NextResponse.json(
      { error: 'Failed to create payment order. Please try again.' },
      { status: 500 },
    )
  }

  // ── Insert PENDING payment row ────────────────────────────────────────────
  const admin = createServiceClient()
  if (admin) {
    const { error: insertError } = await admin.from('payments').insert({
      buyer_id: user.id,
      seller_id: interest.seller_id,
      listing_id: interest.listing_id,
      interest_id: interestId,
      razorpay_order_id: razorpayOrder.id,
      status: 'PENDING',
      amount: 4900,
      currency: 'INR',
    })
    if (insertError) {
      console.error('[create-order] failed to insert payment row:', insertError.message)
      return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
    }
  }

  return NextResponse.json({
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  })
}
