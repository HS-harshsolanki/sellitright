import { NextRequest, NextResponse } from 'next/server'

import { createNotification, createNotifications } from '@/lib/notifications'
import { verifyWebhookSignature } from '@/lib/razorpay'
import { createServiceClient } from '@/lib/supabase/server'

// Razorpay sends the raw body — Next.js App Router exposes it via request.text()
// No bodyParser config needed (App Router doesn't use Pages-style config).

interface RazorpayPaymentEntity {
  id: string
  order_id: string
  status: string
  amount: number
}

interface RazorpayWebhookPayload {
  event: string
  payload?: {
    payment?: {
      entity?: RazorpayPaymentEntity
    }
  }
}

// POST /api/payments/webhook
// Razorpay webhook receiver — reliability backstop for the verify route.
// Handles payment.captured and order.paid events.
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature') ?? ''

  // ── Verify webhook signature ──────────────────────────────────────────────
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  let event: RazorpayWebhookPayload
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  // Only act on payment.captured (also covers order.paid for most flows)
  if (event.event !== 'payment.captured' && event.event !== 'order.paid') {
    return NextResponse.json({ received: true })
  }

  const paymentEntity = event.payload?.payment?.entity
  if (!paymentEntity?.order_id || !paymentEntity?.id) {
    return NextResponse.json({ received: true })
  }

  // Validate amount matches expected contact-unlock fee
  const paymentAmount = (event.payload?.payment?.entity as { amount?: number } | undefined)?.amount
  if (typeof paymentAmount === 'number' && paymentAmount !== 4900) {
    console.warn('[webhook] unexpected payment amount:', paymentAmount)
    return NextResponse.json({ error: 'Unexpected payment amount.' }, { status: 400 })
  }

  const admin = createServiceClient()
  if (!admin) {
    console.error('[webhook] createServiceClient returned null — SUPABASE_SERVICE_ROLE_KEY missing')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 })
  }

  // ── Find the payment row ──────────────────────────────────────────────────
  const { data: payment } = await admin
    .from('payments')
    .select('id, status, interest_id, seller_id, buyer_id')
    .eq('razorpay_order_id', paymentEntity.order_id)
    .maybeSingle()

  if (!payment) {
    // Unknown order — not ours or race condition; return 200 to stop retries
    return NextResponse.json({ received: true })
  }

  // Idempotent — already processed
  if (payment.status === 'SUCCESS') {
    return NextResponse.json({ received: true })
  }

  // ── Fetch buyer_interest to verify status before unlocking ───────────────
  const { data: interest } = await admin
    .from('buyer_interest')
    .select('id, status')
    .eq('id', payment.interest_id)
    .maybeSingle()

  if (interest?.status !== 'ACCEPTED') {
    console.warn('[webhook] Interest not ACCEPTED, skipping contact unlock', interest?.id)
    return NextResponse.json({ received: true, skipped: true })
  }

  // ── Update payment to SUCCESS (atomic — only if still PENDING) ───────────
  const { error: updateError, count: updateCount } = await admin
    .from('payments')
    .update(
      {
        status: 'SUCCESS',
        razorpay_payment_id: paymentEntity.id,
        paid_at: new Date().toISOString(),
      },
      { count: 'exact' },
    )
    .eq('id', payment.id)
    .eq('status', 'PENDING')

  if (updateError) {
    console.error('[webhook] failed to update payment:', updateError.message)
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
  }

  if (!updateCount || updateCount === 0) {
    // Already processed by a concurrent verify or webhook call — idempotent success
    return NextResponse.json({ received: true })
  }

  // ── Unlock contact ────────────────────────────────────────────────────────
  const [sellerAuthResult, buyerAuthResult] = await Promise.all([
    admin.auth.admin.getUserById(payment.seller_id),
    admin.auth.admin.getUserById(payment.buyer_id),
  ])
  const sellerPhone =
    sellerAuthResult.data.user?.phone ?? sellerAuthResult.data.user?.user_metadata?.phone ?? null
  const sellerEmail = sellerAuthResult.data.user?.email ?? null
  const buyerPhone =
    buyerAuthResult.data.user?.phone ?? buyerAuthResult.data.user?.user_metadata?.phone ?? null
  const buyerEmail = buyerAuthResult.data.user?.email ?? null

  await admin
    .from('buyer_interest')
    .update({
      contact_unlocked: true,
      seller_phone: sellerPhone,
      seller_email: sellerEmail,
      buyer_phone: buyerPhone,
      buyer_email: buyerEmail,
    })
    .eq('id', payment.interest_id)

  // Notify both parties — fire-and-forget
  await createNotifications({
    admin,
    userIds: [payment.seller_id, payment.buyer_id],
    title: 'Contact details unlocked',
    message: 'Your connection is complete. Contact details are now available.',
    type: 'ConnectionUnlocked',
    entityType: 'interest',
    entityId: payment.interest_id,
  })
  await createNotification({
    admin,
    userId: payment.seller_id,
    title: 'Payment received',
    message: 'A buyer paid ₹49 to unlock your contact details.',
    type: 'PaymentReceived',
    entityType: 'payment',
    entityId: payment.id,
  })

  return NextResponse.json({ received: true })
}
