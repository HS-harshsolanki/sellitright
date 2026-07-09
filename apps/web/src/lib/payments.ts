import type { SupabaseClient } from '@supabase/supabase-js'

import { logger } from '@/lib/logger'
import { createNotification } from '@/lib/notifications'

interface ContactDetails {
  sellerPhone: string | null
  sellerEmail: string | null
}

/**
 * Atomically marks a payment SUCCESS and unlocks contact details on buyer_interest.
 * Idempotent — safe to call for an already-SUCCESS payment.
 * Returns contact details on success. Throws on failure.
 */
export async function handlePaymentSuccess(
  admin: SupabaseClient,
  paymentId: string,
  gatewayPaymentId: string,
  interestId: string,
  sellerId: string,
  buyerId: string,
): Promise<ContactDetails> {
  const { error: updateErr, count: updateCount } = await admin
    .from('payments')
    .update(
      {
        status: 'SUCCESS',
        paid_at: new Date().toISOString(),
        gateway_payment_id: gatewayPaymentId,
      },
      { count: 'exact' },
    )
    .eq('id', paymentId)
    .eq('status', 'PENDING')

  if (updateErr) {
    logger.error('[payments/handlePaymentSuccess] update error', { error: updateErr.message })
    throw new Error('Failed to record payment.')
  }

  if (!updateCount || updateCount === 0) {
    const { data: interest } = await admin
      .from('buyer_interest')
      .select('seller_phone, seller_email')
      .eq('id', interestId)
      .single()
    return {
      sellerPhone: interest?.seller_phone ?? null,
      sellerEmail: interest?.seller_email ?? null,
    }
  }

  const [sellerRes, buyerRes] = await Promise.all([
    admin.auth.admin.getUserById(sellerId),
    admin.auth.admin.getUserById(buyerId),
  ])
  const sellerPhone =
    sellerRes.data.user?.phone ?? sellerRes.data.user?.user_metadata?.phone ?? null
  const sellerEmail = sellerRes.data.user?.email ?? null
  const buyerPhone = buyerRes.data.user?.phone ?? buyerRes.data.user?.user_metadata?.phone ?? null
  const buyerEmail = buyerRes.data.user?.email ?? null

  const { error: unlockErr } = await admin
    .from('buyer_interest')
    .update({
      contact_unlocked: true,
      seller_phone: sellerPhone,
      seller_email: sellerEmail,
      buyer_phone: buyerPhone,
      buyer_email: buyerEmail,
    })
    .eq('id', interestId)

  if (unlockErr) {
    logger.error('[payments/handlePaymentSuccess] unlock error', {
      error: unlockErr.message,
      interestId,
      paymentId,
    })
    throw new Error(
      'Payment recorded but contact unlock failed. Please refresh the page to retry, or email support@chapternew.com.',
    )
  }

  for (const userId of [sellerId, buyerId]) {
    const { count: existing } = await admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'ConnectionUnlocked')
      .eq('entity_id', interestId)
    if ((existing ?? 0) === 0) {
      await createNotification({
        admin,
        userId,
        title: 'Contact details unlocked',
        message: 'Your connection is complete. Contact details are now available.',
        type: 'ConnectionUnlocked',
        entityType: 'interest',
        entityId: interestId,
      })
    }
  }

  const { count: existingPR } = await admin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', sellerId)
    .eq('type', 'PaymentReceived')
    .eq('entity_id', paymentId)
  if ((existingPR ?? 0) === 0) {
    await createNotification({
      admin,
      userId: sellerId,
      title: 'Payment received',
      message: 'A buyer paid ₹49 to unlock your contact details.',
      type: 'PaymentReceived',
      entityType: 'payment',
      entityId: paymentId,
    })
  }

  return { sellerPhone, sellerEmail }
}
