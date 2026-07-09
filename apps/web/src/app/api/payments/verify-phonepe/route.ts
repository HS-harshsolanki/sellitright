import crypto from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
import { handlePaymentSuccess } from '@/lib/payments'
import { getPhonePeBaseUrl } from '@/lib/phonepe'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface VerifyPhonePeBody {
  merchantTransactionId: string
  interestId: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to verify payment.' }, { status: 401 })

  let body: VerifyPhonePeBody
  try {
    body = (await request.json()) as VerifyPhonePeBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { merchantTransactionId, interestId } = body
  if (!merchantTransactionId || !interestId) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const admin = createServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })

  const merchantId = process.env.PHONEPE_MERCHANT_ID ?? ''
  const saltKey = process.env.PHONEPE_SALT_KEY ?? ''
  const saltIndex = process.env.PHONEPE_SALT_INDEX ?? '1'

  let ppPaymentId: string
  try {
    const statusPath = `/pg/v1/status/${encodeURIComponent(merchantId)}/${encodeURIComponent(merchantTransactionId)}`
    const statusHash = crypto
      .createHash('sha256')
      .update(statusPath + saltKey)
      .digest('hex')
    const statusChecksum = `${statusHash}###${saltIndex}`

    const ppRes = await fetch(`${getPhonePeBaseUrl()}${statusPath}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': statusChecksum,
        'X-MERCHANT-ID': merchantId,
      },
    })
    if (!ppRes.ok) {
      const errText = await ppRes.text()
      logger.error('[verify-phonepe] status check failed', { status: ppRes.status, body: errText })
      return NextResponse.json(
        { error: 'Could not verify payment status. Please try again.' },
        { status: 502 },
      )
    }
    const ppStatus = (await ppRes.json()) as {
      success: boolean
      code: string
      data?: { transactionId?: string; state?: string }
    }
    if (ppStatus.code !== 'PAYMENT_SUCCESS') {
      return NextResponse.json(
        {
          error: `Payment not confirmed (status: ${ppStatus.code}). Please wait a moment and try again.`,
          code: ppStatus.code,
        },
        { status: 402 },
      )
    }
    ppPaymentId = ppStatus.data?.transactionId ?? merchantTransactionId
  } catch (err) {
    logger.error('[verify-phonepe] fetch error', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: 'Could not verify payment. Please try again.' },
      { status: 502 },
    )
  }

  const { data: payment } = await admin
    .from('payments')
    .select('id, status, buyer_id, seller_id, interest_id')
    .eq('gateway_order_id', merchantTransactionId)
    .maybeSingle()

  if (!payment) return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 })
  if (payment.buyer_id !== user.id)
    return NextResponse.json({ error: 'Not authorised.' }, { status: 403 })
  if (payment.interest_id !== interestId)
    return NextResponse.json({ error: 'Interest mismatch.' }, { status: 403 })

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

  const { data: interestCheck } = await admin
    .from('buyer_interest')
    .select('id, status')
    .eq('id', interestId)
    .single()
  if (interestCheck?.status !== 'ACCEPTED') {
    return NextResponse.json(
      { error: 'Seller has not accepted this request yet.' },
      { status: 403 },
    )
  }

  try {
    const contacts = await handlePaymentSuccess(
      admin,
      payment.id,
      ppPaymentId,
      interestId,
      payment.seller_id,
      payment.buyer_id,
    )
    return NextResponse.json({
      success: true,
      sellerPhone: contacts.sellerPhone,
      sellerEmail: contacts.sellerEmail,
    })
  } catch (err) {
    logger.error('[verify-phonepe] handlePaymentSuccess error', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Verification failed.' },
      { status: 500 },
    )
  }
}
