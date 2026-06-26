import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from '@/lib/razorpay'

// Razorpay sends the raw body — Next.js App Router exposes it via request.text()
// No bodyParser config needed (App Router doesn't use Pages-style config).

interface RazorpayPaymentEntity {
  id: string
  order_id: string
  status: string
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

  const admin = createServiceClient()
  if (!admin) {
    // Can't process without service role — log and return 200 so Razorpay doesn't retry
    console.error('[webhook] createServiceClient returned null — SUPABASE_SERVICE_ROLE_KEY missing')
    return NextResponse.json({ received: true })
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

  // ── Update payment to SUCCESS ─────────────────────────────────────────────
  await admin
    .from('payments')
    .update({
      status: 'SUCCESS',
      razorpay_payment_id: paymentEntity.id,
      paid_at: new Date().toISOString(),
    })
    .eq('id', payment.id)

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

  return NextResponse.json({ received: true })
}
