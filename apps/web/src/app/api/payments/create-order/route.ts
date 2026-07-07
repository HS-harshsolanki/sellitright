import crypto from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
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

  // ── Reuse or clean up stale PENDING row from a previous dismissed attempt ──
  // A user who opens the Razorpay modal and dismisses it leaves a PENDING row
  // behind. Rather than accumulating orphaned rows, reuse any row created in
  // the last 30 minutes (its Razorpay order is still valid) or delete older ones.
  const adminForPending = createServiceClient()
  if (adminForPending) {
    const { data: pendingRows } = await adminForPending
      .from('payments')
      .select('id, razorpay_order_id, created_at')
      .eq('interest_id', interestId)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })

    if (pendingRows && pendingRows.length > 0) {
      const recent = pendingRows[0] as {
        id: string
        razorpay_order_id: string | null
        created_at: string
      }
      const ageMs = Date.now() - new Date(recent.created_at).getTime()
      if (recent.razorpay_order_id && ageMs < 30 * 60 * 1000) {
        // Fresh enough — return the existing order so the client reopens the modal
        return NextResponse.json({
          orderId: recent.razorpay_order_id,
          amount: 4900,
          currency: 'INR',
          reused: true,
        })
      }
      // Stale rows — delete all so the unique partial index won't block the new insert
      const staleIds = pendingRows.map((r: { id: string }) => r.id)
      await adminForPending.from('payments').delete().in('id', staleIds)
    }
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

  // ── Pre-flight: seller must have a phone number ───────────────────────────
  // Fail before charging so buyer is never left with a paid but unreachable contact.
  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  const sellerAuth = await admin.auth.admin.getUserById(interest.seller_id)
  const sellerPhone =
    sellerAuth.data.user?.user_metadata?.phone ?? sellerAuth.data.user?.phone ?? null
  const sellerPhoneVerified = sellerAuth.data.user?.user_metadata?.phone_verified === true

  if (!sellerPhone || !sellerPhoneVerified) {
    return NextResponse.json(
      {
        error:
          'The seller has not verified their phone number yet. Contact support if this persists.',
      },
      { status: 422 },
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
      demo: true,
    })
  }

  // ── Step 1: Insert PENDING payment row first ──────────────────────────────
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
    if (insertError?.code === '23505') {
      return NextResponse.json(
        { error: 'A payment is already in progress for this interest.', alreadyPending: true },
        { status: 409 },
      )
    }
    logger.error('[create-order] failed to insert payment row', { error: insertError?.message })
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
    logger.error('[payments/create-order] Razorpay error', {
      error: err instanceof Error ? err.message : String(err),
    })
    // Clean up the pending row since there's no order to pay against
    await admin.from('payments').delete().eq('id', pendingPayment.id)
    return NextResponse.json(
      { error: 'Failed to create payment order. Please try again.' },
      { status: 500 },
    )
  }

  // ── Step 3: Update DB row with Razorpay order ID ──────────────────────────
  const { error: orderIdUpdateError } = await admin
    .from('payments')
    .update({ razorpay_order_id: razorpayOrder.id })
    .eq('id', pendingPayment.id)

  if (orderIdUpdateError) {
    logger.error('[create-order] failed to persist razorpay_order_id', {
      error: orderIdUpdateError.message,
    })
    await admin.from('payments').delete().eq('id', pendingPayment.id)
    return NextResponse.json(
      { error: 'Failed to create payment order. Please try again.' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
  })
}
