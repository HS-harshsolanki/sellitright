import { NextRequest, NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
import { handlePaymentSuccess } from '@/lib/payments'
import { verifyPhonePeChecksum } from '@/lib/phonepe'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  let body: { response?: string }
  try {
    body = JSON.parse(rawBody) as { response?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const base64Response = body.response ?? ''
  const checksum = request.headers.get('X-VERIFY') ?? ''

  if (!verifyPhonePeChecksum(base64Response, checksum)) {
    logger.warn('[webhook-phonepe] invalid checksum')
    return NextResponse.json({ error: 'Invalid checksum.' }, { status: 400 })
  }

  let payload: {
    code?: string
    data?: {
      merchantTransactionId?: string
      transactionId?: string
      amount?: number
    }
  }
  try {
    const decoded = Buffer.from(base64Response, 'base64').toString('utf-8')
    payload = JSON.parse(decoded) as typeof payload
  } catch {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  if (payload.code !== 'PAYMENT_SUCCESS') {
    return NextResponse.json({ received: true })
  }

  const merchantTransactionId = payload.data?.merchantTransactionId
  const ppPaymentId = payload.data?.transactionId ?? merchantTransactionId
  const amount = payload.data?.amount

  if (!merchantTransactionId || !ppPaymentId) return NextResponse.json({ received: true })

  if (typeof amount === 'number' && amount !== 4900) {
    logger.warn('[webhook-phonepe] unexpected amount', { amount })
    return NextResponse.json({ received: true, warning: 'Unexpected payment amount.' })
  }

  const admin = createServiceClient()
  if (!admin) {
    logger.error('[webhook-phonepe] createServiceClient null')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 })
  }

  const { data: payment } = await admin
    .from('payments')
    .select('id, status, interest_id, seller_id, buyer_id')
    .eq('gateway_order_id', merchantTransactionId)
    .maybeSingle()

  if (!payment) return NextResponse.json({ received: true })
  if (payment.status === 'SUCCESS') return NextResponse.json({ received: true })

  const { data: interest } = await admin
    .from('buyer_interest')
    .select('id, status')
    .eq('id', payment.interest_id)
    .maybeSingle()

  if (interest?.status !== 'ACCEPTED') {
    logger.warn('[webhook-phonepe] interest not ACCEPTED', { interestId: interest?.id })
    await admin
      .from('payments')
      .update({ status: 'FAILED' })
      .eq('id', payment.id)
      .eq('status', 'PENDING')
    return NextResponse.json({ received: true, skipped: true })
  }

  try {
    await handlePaymentSuccess(
      admin,
      payment.id,
      String(ppPaymentId),
      payment.interest_id,
      payment.seller_id,
      payment.buyer_id,
    )
  } catch (err) {
    logger.error('[webhook-phonepe] handlePaymentSuccess error', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Contact unlock failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
