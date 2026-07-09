import { NextRequest, NextResponse } from 'next/server'

import { isAuthorized, logAdminAction } from '@/lib/admin-auth'
import { createNotification } from '@/lib/notifications'
import { buildPhonePeChecksum, getPhonePeBaseUrl } from '@/lib/phonepe'
import { getRazorpayInstance, isRazorpayConfigured } from '@/lib/razorpay'
import { createServiceClient } from '@/lib/supabase/server'

// POST /api/admin/payments/[id]/refund
// Initiates a full refund for a SUCCESS payment.
// If razorpay_payment_id is available, calls Razorpay refund API.
// Otherwise marks as REFUNDED manually (admin must issue refund via Razorpay dashboard).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  // Fetch the payment row
  const { data: payment, error: fetchError } = await admin
    .from('payments')
    .select('id, buyer_id, gateway, gateway_payment_id, razorpay_payment_id, amount, status')
    .eq('id', id)
    .single()

  if (fetchError || !payment) {
    return NextResponse.json(
      { error: 'Payment not found or not eligible for refund.' },
      { status: 404 },
    )
  }

  if (payment.status === 'REFUNDED') {
    return NextResponse.json({ error: 'Payment has already been refunded.' }, { status: 409 })
  }

  if (payment.status !== 'SUCCESS') {
    return NextResponse.json(
      { error: 'Payment not found or not eligible for refund.' },
      { status: 404 },
    )
  }

  let refundId = 'manual'
  let manualNote: string | undefined

  const paymentRow = payment as {
    id: string
    buyer_id: string
    gateway: string | null
    gateway_payment_id: string | null
    razorpay_payment_id: string | null
    amount: number
    status: string
  }

  if (paymentRow.gateway === 'phonepe' && paymentRow.gateway_payment_id) {
    const merchantId = process.env.PHONEPE_MERCHANT_ID ?? ''
    const refundTransactionId = id.replace(/-/g, '').slice(0, 38)
    const refundPayload = JSON.stringify({
      merchantId,
      merchantTransactionId: refundTransactionId,
      originalTransactionId: paymentRow.gateway_payment_id,
      amount: paymentRow.amount,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook-phonepe`,
    })
    const base64Payload = Buffer.from(refundPayload).toString('base64')
    const checksum = buildPhonePeChecksum(base64Payload, '/pg/v1/refund')
    try {
      const ppRes = await fetch(`${getPhonePeBaseUrl()}/pg/v1/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
          'X-MERCHANT-ID': merchantId,
        },
        body: JSON.stringify({ request: base64Payload }),
      })
      if (!ppRes.ok) {
        const errText = await ppRes.text()
        console.error('[admin/payments/refund] PhonePe refund error:', errText)
        return NextResponse.json(
          { error: 'Failed to initiate refund via PhonePe. Please refund manually.' },
          { status: 502 },
        )
      }
      const ppRefund = (await ppRes.json()) as { data?: { merchantTransactionId?: string } }
      refundId = ppRefund.data?.merchantTransactionId ?? 'phonepe_manual'
    } catch (err) {
      console.error('[admin/payments/refund] PhonePe refund fetch error:', err)
      return NextResponse.json(
        { error: 'Failed to initiate refund via PhonePe. Please refund manually.' },
        { status: 502 },
      )
    }
  } else if (isRazorpayConfigured() && paymentRow.razorpay_payment_id) {
    try {
      const razorpay = getRazorpayInstance()
      const refund = await razorpay.payments.refund(paymentRow.razorpay_payment_id, {
        amount: paymentRow.amount,
      })
      refundId = (refund as { id?: string }).id ?? 'manual'
    } catch (err) {
      console.error('[admin/payments/refund] Razorpay refund error:', err)
      return NextResponse.json(
        { error: 'Failed to initiate refund via Razorpay. Please try again or refund manually.' },
        { status: 502 },
      )
    }
  } else {
    manualNote = 'Marked as refunded. Issue refund manually via payment dashboard.'
  }

  // Update payment status to REFUNDED
  const { error: updateError } = await admin
    .from('payments')
    .update({ status: 'REFUNDED' })
    .eq('id', id)

  if (updateError) {
    console.error('[admin/payments/refund] DB update error:', updateError.message)
    return NextResponse.json({ error: 'Failed to update payment status.' }, { status: 500 })
  }

  // Notify buyer
  await createNotification({
    admin,
    userId: payment.buyer_id,
    title: 'Payment refunded',
    message:
      'Your ₹49 payment has been refunded. It should appear in your account within 7-10 business days.',
    type: 'System',
    entityType: 'payment',
    entityId: id,
  })

  // Log admin action
  await logAdminAction(admin, {
    action: 'refunded',
    entityType: 'payment',
    entityId: id,
    previousStatus: 'SUCCESS',
    newStatus: 'REFUNDED',
  })

  const response: { success: true; refundId: string; note?: string } = {
    success: true,
    refundId,
  }
  if (manualNote) response.note = manualNote

  return NextResponse.json(response)
}
