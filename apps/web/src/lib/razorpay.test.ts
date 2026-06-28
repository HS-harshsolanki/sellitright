// @vitest-environment node
import crypto from 'crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getRazorpayInstance,
  isRazorpayConfigured,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from './razorpay'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeHmac(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

// ── Environment cleanup ───────────────────────────────────────────────────────

afterEach(() => {
  vi.unstubAllEnvs()
})

// ── verifyRazorpaySignature ───────────────────────────────────────────────────

describe('verifyRazorpaySignature', () => {
  const SECRET = 'test_razorpay_secret_key'
  const ORDER_ID = 'order_abc123'
  const PAYMENT_ID = 'pay_xyz789'

  beforeEach(() => {
    vi.stubEnv('RAZORPAY_KEY_SECRET', SECRET)
  })

  it('returns true for a valid HMAC signature', () => {
    const sig = makeHmac(SECRET, `${ORDER_ID}|${PAYMENT_ID}`)
    expect(verifyRazorpaySignature(ORDER_ID, PAYMENT_ID, sig)).toBe(true)
  })

  it('returns false when orderId is tampered', () => {
    const sig = makeHmac(SECRET, `${ORDER_ID}|${PAYMENT_ID}`)
    expect(verifyRazorpaySignature('order_tampered', PAYMENT_ID, sig)).toBe(false)
  })

  it('returns false when paymentId is tampered', () => {
    const sig = makeHmac(SECRET, `${ORDER_ID}|${PAYMENT_ID}`)
    expect(verifyRazorpaySignature(ORDER_ID, 'pay_tampered', sig)).toBe(false)
  })

  it('returns false when the wrong secret is used', () => {
    const sig = makeHmac('wrong_secret', `${ORDER_ID}|${PAYMENT_ID}`)
    expect(verifyRazorpaySignature(ORDER_ID, PAYMENT_ID, sig)).toBe(false)
  })

  it('returns false when RAZORPAY_KEY_SECRET is not set', () => {
    vi.unstubAllEnvs()
    const sig = makeHmac(SECRET, `${ORDER_ID}|${PAYMENT_ID}`)
    expect(verifyRazorpaySignature(ORDER_ID, PAYMENT_ID, sig)).toBe(false)
  })

  it('returns false when signature has invalid format', () => {
    expect(verifyRazorpaySignature(ORDER_ID, PAYMENT_ID, 'not-a-hex-sig')).toBe(false)
  })
})

// ── verifyWebhookSignature ────────────────────────────────────────────────────

describe('verifyWebhookSignature', () => {
  const WEBHOOK_SECRET = 'test_webhook_secret'
  const RAW_BODY = '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_abc"}}}}'

  beforeEach(() => {
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', WEBHOOK_SECRET)
  })

  it('returns true for a valid webhook signature', () => {
    const sig = makeHmac(WEBHOOK_SECRET, RAW_BODY)
    expect(verifyWebhookSignature(RAW_BODY, sig)).toBe(true)
  })

  it('returns false when body is tampered', () => {
    const sig = makeHmac(WEBHOOK_SECRET, RAW_BODY)
    expect(verifyWebhookSignature('{"tampered":true}', sig)).toBe(false)
  })

  it('returns false when RAZORPAY_WEBHOOK_SECRET is not set', () => {
    vi.unstubAllEnvs()
    const sig = makeHmac(WEBHOOK_SECRET, RAW_BODY)
    expect(verifyWebhookSignature(RAW_BODY, sig)).toBe(false)
  })

  it('returns false when signature has invalid format', () => {
    expect(verifyWebhookSignature(RAW_BODY, 'invalid-sig')).toBe(false)
  })
})

// ── isRazorpayConfigured ──────────────────────────────────────────────────────

describe('isRazorpayConfigured', () => {
  it('returns true when both env vars are set', () => {
    vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_key')
    vi.stubEnv('RAZORPAY_KEY_SECRET', 'rzp_secret')
    expect(isRazorpayConfigured()).toBe(true)
  })

  it('returns false when RAZORPAY_KEY_ID is missing', () => {
    vi.stubEnv('RAZORPAY_KEY_ID', '')
    vi.stubEnv('RAZORPAY_KEY_SECRET', 'rzp_secret')
    expect(isRazorpayConfigured()).toBe(false)
  })

  it('returns false when RAZORPAY_KEY_SECRET is missing', () => {
    vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_key')
    vi.stubEnv('RAZORPAY_KEY_SECRET', '')
    expect(isRazorpayConfigured()).toBe(false)
  })

  it('returns false when both env vars are missing', () => {
    vi.unstubAllEnvs()
    expect(isRazorpayConfigured()).toBe(false)
  })
})

// ── getRazorpayInstance ───────────────────────────────────────────────────────

describe('getRazorpayInstance', () => {
  it('throws when keys are not configured', () => {
    vi.unstubAllEnvs()
    expect(() => getRazorpayInstance()).toThrow(
      'Razorpay keys not configured — call isRazorpayConfigured() before getRazorpayInstance()',
    )
  })

  it('throws when RAZORPAY_KEY_ID is missing', () => {
    vi.stubEnv('RAZORPAY_KEY_ID', '')
    vi.stubEnv('RAZORPAY_KEY_SECRET', 'rzp_secret')
    expect(() => getRazorpayInstance()).toThrow('Razorpay keys not configured')
  })

  it('throws when RAZORPAY_KEY_SECRET is missing', () => {
    vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_key')
    vi.stubEnv('RAZORPAY_KEY_SECRET', '')
    expect(() => getRazorpayInstance()).toThrow('Razorpay keys not configured')
  })

  it('returns a Razorpay instance when both keys are present', () => {
    vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_abcdef')
    vi.stubEnv('RAZORPAY_KEY_SECRET', 'rzp_secret_xyz')
    const instance = getRazorpayInstance()
    expect(instance).toBeDefined()
  })
})
