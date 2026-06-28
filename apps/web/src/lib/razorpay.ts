import crypto from 'crypto'

import Razorpay from 'razorpay'

export function getRazorpayInstance(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID ?? ''
  const key_secret = process.env.RAZORPAY_KEY_SECRET ?? ''
  if (!key_id || !key_secret) {
    throw new Error(
      'Razorpay keys not configured — call isRazorpayConfigured() before getRazorpayInstance()',
    )
  }
  return new Razorpay({ key_id, key_secret })
}

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
}

/**
 * Verifies the Razorpay payment signature returned to the frontend handler.
 * Must be called server-side only — uses RAZORPAY_KEY_SECRET.
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) return false // reject all verifications when secret not configured
  if (!/^[0-9a-f]{64}$/.test(signature)) {
    console.warn('[razorpay] invalid signature format — expected 64-char hex')
    return false
  }
  const body = `${orderId}|${paymentId}`
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}

/**
 * Verifies the Razorpay webhook signature.
 * rawBody must be the original request body as a string (not parsed JSON).
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) return false // reject all webhooks when secret not configured
  if (!/^[0-9a-f]{64}$/.test(signature)) {
    console.warn('[razorpay] invalid webhook signature format — expected 64-char hex')
    return false
  }
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}
