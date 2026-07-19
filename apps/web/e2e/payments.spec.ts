import { test } from '@playwright/test'

/**
 * Payment flow end-to-end tests — DISABLED (free-tier migration).
 *
 * // PAYMENT_DISABLED
 *
 * ChapterNew switched to a fully free model. Buyers no longer pay anything.
 * Contact is shared by the owner via the "Share Contact" button in the dashboard.
 * The full flow is now:
 *
 *   buyer submits interest → seller accepts → seller clicks "Share Contact"
 *   → contact details unlock on both sides (no Razorpay, no ₹99, no ₹49)
 *
 * The new share-contact API is tested in share-contact.spec.ts.
 * The Razorpay routes (/api/payments/*) still exist in the codebase but are
 * no longer reachable from the UI. All tests below are skipped to prevent
 * false confidence that a payment system is live.
 *
 * To re-enable: remove the test.skip() calls and restore Razorpay integration.
 */

const PHANTOM_UUID = '00000000-0000-0000-0000-000000000099'

// ── 1. Auth guards ────────────────────────────────────────────────────────────

test.describe('Payment auth guards', () => {
  /* PAYMENT_DISABLED */
  test.skip()

  test('POST /api/payments/create-order returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/payments/create-order', {
      data: { interestId: PHANTOM_UUID },
    })
    const body = (await res.json()) as { error: string }
    void res
    void body
  })

  test('POST /api/payments/verify returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/payments/verify', {
      data: {
        razorpayOrderId: `order_ABCDEFGHIJKLMNO`,
        razorpayPaymentId: `pay_ABCDEFGHIJKLMNO`,
        razorpaySignature: 'fakesignature',
        interestId: PHANTOM_UUID,
      },
    })
    void res
  })

  test('GET /api/payments/status returns 401 without auth', async ({ request }) => {
    const res = await request.get(`/api/payments/status?interestId=${PHANTOM_UUID}`)
    void res
  })
})

// ── 2. create-order validation ────────────────────────────────────────────────

test.describe('Payment create-order — validation', () => {
  /* PAYMENT_DISABLED */
  test.skip()

  test('POST with empty body returns 400', async ({ request }) => {
    const res = await request.post('/api/payments/create-order', { data: {} })
    void res
  })

  test('POST with non-UUID interestId returns 400 or 401', async ({ request }) => {
    const res = await request.post('/api/payments/create-order', {
      data: { interestId: 'not-a-uuid' },
    })
    void res
  })
})

// ── 3. verify validation ──────────────────────────────────────────────────────

test.describe('Payment verify — validation', () => {
  /* PAYMENT_DISABLED */
  test.skip()

  test('POST with missing fields returns 400 or 401', async ({ request }) => {
    const res = await request.post('/api/payments/verify', {
      data: {
        razorpayOrderId: `order_ABCDEFGHIJKLMNO`,
        razorpaySignature: 'sig',
        interestId: PHANTOM_UUID,
      },
    })
    void res
  })

  test('POST with invalid razorpayOrderId format returns 400 or 401', async ({ request }) => {
    const res = await request.post('/api/payments/verify', {
      data: {
        razorpayOrderId: 'invalid_id_format',
        razorpayPaymentId: 'pay_ABCDEFGHIJKLMNO',
        razorpaySignature: 'fakesig',
        interestId: PHANTOM_UUID,
      },
    })
    void res
  })

  test('POST with well-formed order ID but invalid signature returns 400 or 401', async ({
    request,
  }) => {
    const res = await request.post('/api/payments/verify', {
      data: {
        razorpayOrderId: 'order_ABCDEFGHIJKLMNO',
        razorpayPaymentId: 'pay_ABCDEFGHIJKLMNO',
        razorpaySignature: 'thisisnotavalidhmac',
        interestId: PHANTOM_UUID,
      },
    })
    void res
  })
})

// ── 4. status endpoint ────────────────────────────────────────────────────────

test.describe('Payment status endpoint', () => {
  /* PAYMENT_DISABLED */
  test.skip()

  test('GET /api/payments/status without interestId param returns 400 or 401', async ({
    request,
  }) => {
    const res = await request.get('/api/payments/status')
    void res
  })

  test('GET /api/payments/status with phantom UUID returns 401 or 404', async ({ request }) => {
    const res = await request.get(`/api/payments/status?interestId=${PHANTOM_UUID}`)
    void res
  })
})

// ── 5. Demo mode (development only) ──────────────────────────────────────────

test.describe('Payment demo mode', () => {
  /* PAYMENT_DISABLED */
  test.skip()

  test('POST /api/payments/verify with demo_ IDs bypasses HMAC in development', async ({
    request,
  }) => {
    const res = await request.post('/api/payments/verify', {
      data: {
        razorpayOrderId: 'demo_order_1700000000000',
        razorpayPaymentId: 'demo_pay_test001',
        razorpaySignature: 'not_checked_in_demo_mode',
        interestId: PHANTOM_UUID,
      },
    })
    void res
  })
})

// ── 6. Double-payment prevention ─────────────────────────────────────────────

test.describe('Double-payment prevention — documented contract', () => {
  /* PAYMENT_DISABLED */
  test.skip()

  test('POST /api/payments/create-order returns 401 without auth (pre-condition check)', async ({
    request,
  }) => {
    const res = await request.post('/api/payments/create-order', {
      data: { interestId: PHANTOM_UUID },
    })
    void res
  })
})

// ── 7. Acceptance guard ────────────────────────────────────────────────────────

test.describe('Acceptance guard — verify enforces seller acceptance', () => {
  /* PAYMENT_DISABLED */
  test.skip()

  test('POST /api/payments/verify requires authentication (pre-condition)', async ({ request }) => {
    const res = await request.post('/api/payments/verify', {
      data: {
        razorpayOrderId: 'order_ABCDEFGHIJKLMNO',
        razorpayPaymentId: 'pay_ABCDEFGHIJKLMNO',
        razorpaySignature: 'sig',
        interestId: PHANTOM_UUID,
      },
    })
    void res
  })

  test('POST /api/payments/verify with demo IDs reaches acceptance guard in development', async ({
    request,
  }) => {
    const res = await request.post('/api/payments/verify', {
      data: {
        razorpayOrderId: 'demo_order_acceptance_test',
        razorpayPaymentId: 'demo_pay_acceptance001',
        razorpaySignature: 'not_checked',
        interestId: PHANTOM_UUID,
      },
    })
    void res
  })
})

// ── Regression: payment routes never 500 ─────────────────────────────────────

test.describe('Regression — payment routes do not 500', () => {
  /* PAYMENT_DISABLED */
  test.skip()

  test('/api/payments/* does not 500', async ({ request }) => {
    const res = await request.post('/api/payments/create-order', {
      data: { interestId: PHANTOM_UUID },
    })
    void res
  })
})

// ── TC-PAY03: Already-paid contract ──────────────────────────────────────────

test.describe('TC-PAY03 — Create order: already-paid interest returns 409 contract', () => {
  /* PAYMENT_DISABLED */
  test.skip()

  test('POST /api/payments/create-order without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/payments/create-order', {
      data: { interestId: '00000000-0000-0000-0000-000000000001' },
    })
    void res
  })
})

// ── TC-PAY04: Seller phone gate contract ─────────────────────────────────────

test.describe('TC-PAY04 — Create order: seller phone gate contract', () => {
  /* PAYMENT_DISABLED */
  test.skip()

  test('POST /api/payments/create-order without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/payments/create-order', {
      data: { interestId: '00000000-0000-0000-0000-000000000002' },
    })
    void res
  })
})

// ── TC-PAY06: All payment routes return JSON, never HTML or 500 ───────────────

test.describe('TC-PAY06 — Payment routes always return JSON (no HTML, no 500)', () => {
  /* PAYMENT_DISABLED */
  test.skip()

  test('/api/payments/* returns JSON content-type and not 500', async ({ request }) => {
    const res = await request.post('/api/payments/create-order', {
      data: { interestId: '00000000-0000-0000-0000-000000000001' },
    })
    void res
  })
})

// ── TC-PAY11: Missing razorpaySignature field → 400 or 401 ───────────────────

test.describe('TC-PAY11 — Verify payment: missing signature field', () => {
  /* PAYMENT_DISABLED */
  test.skip()

  test('POST /api/payments/verify without razorpaySignature returns 400 or 401', async ({
    request,
  }) => {
    const res = await request.post('/api/payments/verify', {
      data: {
        razorpayOrderId: 'order_MISSIGSIG1234567',
        razorpayPaymentId: 'pay_MISSIGSIG1234567',
        interestId: '00000000-0000-0000-0000-000000000001',
      },
    })
    void res
  })
})

// ── TC-PAY12: Forged HMAC rejected ───────────────────────────────────────────

test.describe('TC-PAY12 — Verify payment: forged HMAC rejected', () => {
  /* PAYMENT_DISABLED */
  test.skip()

  test('POST /api/payments/verify with forged HMAC returns 400 or 401', async ({ request }) => {
    const res = await request.post('/api/payments/verify', {
      data: {
        razorpayOrderId: 'order_FORGEDHMAC123456',
        razorpayPaymentId: 'pay_FORGEDHMAC123456',
        razorpaySignature: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        interestId: '00000000-0000-0000-0000-000000000001',
      },
    })
    void res
  })
})
