import crypto from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { getRazorpayInstance, isRazorpayConfigured } from '@/lib/razorpay'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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

  // ── Rate limit: max 5 PENDING orders per user per 60 s ───────────────────
  const { count: recentCount } = await supabase
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('buyer_id', user.id)
    .eq('status', 'PENDING')
    .gte('created_at', new Date(Date.now() - 60_000).toISOString())

  if ((recentCount ?? 0) >= 5) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment before trying again.' },
      { status: 429 },
    )
  }

  // ── Razorpay: demo-mode guard ─────────────────────────────────────────────
  if (!isRazorpayConfigured()) {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Payment service is not configured. Contact support.' },
        { status: 503 },
      )
    }
    // Dev/demo mode — return a mock order so UI can be tested without real keys
    return NextResponse.json({
      orderId: `demo_order_${Date.now()}`,
      amount: 4900,
      currency: 'INR',
      keyId: 'rzp_test_demo',
      demo: true,
    })
  }

  // ── Step 1: Insert PENDING payment row first ──────────────────────────────
  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  const localReceiptId = crypto.randomUUID()

  const { data: pendingPayment, error: insertError } = await admin
    .from('payments')
    .insert({
      buyer_id: user.id,
      seller_id: interest.seller_id,
      listing_id: interest.listing_id,
      interest_id: interestId,
      razorpay_order_id: null,
      status: 'PENDING',
      amount: 4900,
      currency: 'INR',
    })
    .select('id')
    .single()

  if (insertError || !pendingPayment) {
    console.error('[create-order] failed to insert payment row:', insertError?.message)
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }

  // ── Step 2: Create Razorpay order ─────────────────────────────────────────
  let razorpayOrder: { id: string; amount: number; currency: string }
  try {
    const razorpay = getRazorpayInstance()
    razorpayOrder = (await razorpay.orders.create({
      amount: 4900,
      currency: 'INR',
      receipt: localReceiptId.slice(0, 40),
    })) as { id: string; amount: number; currency: string }
  } catch (err) {
    console.error('[payments/create-order] Razorpay error:', err)
    // Clean up the pending row since there's no order to pay against
    await admin.from('payments').delete().eq('id', pendingPayment.id)
    return NextResponse.json(
      { error: 'Failed to create payment order. Please try again.' },
      { status: 500 },
    )
  }

  // ── Step 3: Update DB row with Razorpay order ID ──────────────────────────
  await admin
    .from('payments')
    .update({ razorpay_order_id: razorpayOrder.id })
    .eq('id', pendingPayment.id)
  // Non-fatal if this update fails — the order exists, webhook will reconcile

  return NextResponse.json({
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  })
}
