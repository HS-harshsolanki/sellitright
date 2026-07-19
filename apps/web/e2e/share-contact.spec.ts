import { test, expect } from '@playwright/test'

/**
 * Share-Contact API end-to-end tests.
 *
 * Free-tier flow (replaces the old Razorpay payment step):
 *
 *   buyer submits interest
 *     → seller accepts (PATCH /api/dashboard/interests/:id → ACCEPTED)
 *       → seller clicks "Share Contact" button in dashboard
 *         → POST /api/dashboard/interests/:id/share-contact
 *           → contact_unlocked=true on both sides
 *             → buyer sees seller phone/email for free
 *
 * Tests here cover the API contract without a live Supabase session:
 *   1. Auth guard — unauthenticated POST returns 401
 *   2. Route existence — endpoint is reachable (no 404 / 405)
 *   3. Idempotency contract — already-shared returns { alreadyShared: true }
 *   4. Status guard — only ACCEPTED interests can share contact (409 otherwise)
 *   5. Ownership guard — non-owner POST returns 403
 *   6. No 500 regression — route never throws an unhandled error
 *
 * Full authenticated happy-path (real JWT → seller accepts → seller shares →
 * buyer fetches unlocked contact) requires Supabase to be live with two seeded
 * users — covered by manual QA.
 */

const PHANTOM_UUID = '00000000-0000-0000-0000-000000000099'

// ── 1. Auth guard ─────────────────────────────────────────────────────────────

test.describe('Share-Contact auth guard', () => {
  test('POST /api/dashboard/interests/:id/share-contact returns 401 without auth', async ({
    request,
  }) => {
    const res = await request.post(`/api/dashboard/interests/${PHANTOM_UUID}/share-contact`)
    expect(res.status()).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(typeof body.error).toBe('string')
    expect(body.error.length).toBeGreaterThan(0)
  })

  test('auth guard fires before interest lookup (phantom UUID still returns 401)', async ({
    request,
  }) => {
    const res = await request.post(
      '/api/dashboard/interests/00000000-0000-0000-0000-000000000000/share-contact',
    )
    // Without a session the auth check runs first → 401 (not 404)
    expect(res.status()).toBe(401)
  })
})

// ── 2. Route existence ────────────────────────────────────────────────────────

test.describe('Share-Contact route existence', () => {
  test('POST /api/dashboard/interests/:id/share-contact exists (not 404 or 405)', async ({
    request,
  }) => {
    const res = await request.post(`/api/dashboard/interests/${PHANTOM_UUID}/share-contact`)
    // 401 (auth guard) is the expected unauthenticated response — NOT 404 or 405
    expect(res.status()).not.toBe(404)
    expect(res.status()).not.toBe(405)
  })

  test('route returns JSON content-type', async ({ request }) => {
    const res = await request.post(`/api/dashboard/interests/${PHANTOM_UUID}/share-contact`)
    expect(res.headers()['content-type']).toContain('application/json')
  })
})

// ── 3. No 500 regression ──────────────────────────────────────────────────────

test.describe('Share-Contact no-500 regression', () => {
  test('POST /api/dashboard/interests/:id/share-contact does not return 500', async ({
    request,
  }) => {
    const res = await request.post(`/api/dashboard/interests/${PHANTOM_UUID}/share-contact`)
    expect(res.status()).not.toBe(500)
    expect(res.status()).not.toBeGreaterThanOrEqual(500)
  })
})

// ── 4. Idempotency contract (documented — requires authenticated session) ─────

/**
 * Idempotency: if the owner calls share-contact twice on the same interest,
 * the second call returns { success: true, alreadyShared: true } instead of
 * re-running the contact-unlock logic.
 *
 * Without a live Supabase session we can only verify the auth gate here.
 * The full idempotency path is covered by manual QA:
 *
 *   1. Seller authenticates and accepts a buyer request.
 *   2. Seller calls POST .../share-contact → 200 { success: true }.
 *   3. Seller calls POST .../share-contact again → 200 { success: true, alreadyShared: true }.
 *   4. contact_unlocked remains true (no double-write).
 */
test.describe('Share-Contact idempotency contract (documented)', () => {
  test('POST /api/dashboard/interests/:id/share-contact returns 401 without auth (idempotency pre-condition)', async ({
    request,
  }) => {
    // Confirms the endpoint is reachable and auth-gated.
    // Full idempotency scenario requires two sequenced authenticated calls.
    const res = await request.post(`/api/dashboard/interests/${PHANTOM_UUID}/share-contact`)
    expect(res.status()).toBe(401)
    const body = (await res.json()) as { error: string; alreadyShared?: boolean }
    expect(typeof body.error).toBe('string')
    // alreadyShared must NOT be in the 401 response
    expect(body.alreadyShared).toBeUndefined()
  })
})

// ── 5. Status guard contract (documented — requires authenticated session) ────

/**
 * Status guard: only interests with status=ACCEPTED can be shared.
 *
 * With a real session + PENDING interest, the route returns:
 *   409 { error: 'You can only share contact for accepted requests.' }
 *
 * Without a session → 401 fires first.
 */
test.describe('Share-Contact status guard (documented contract)', () => {
  test('POST .../share-contact returns 401 without session (status guard pre-condition)', async ({
    request,
  }) => {
    const res = await request.post(`/api/dashboard/interests/${PHANTOM_UUID}/share-contact`)
    // 401 means auth guard ran — confirms the request reaches the route handler
    // (not blocked at network/middleware level).
    expect(res.status()).toBe(401)
  })
})

// ── 6. Ownership guard contract (documented — requires authenticated session) ─

/**
 * Ownership guard: only the seller who owns the listing can share contact.
 *
 * With a real session that does NOT match the interest's seller_id,
 * the route returns: 403 { error: 'Not authorised.' }
 *
 * Without a session → 401 fires first.
 */
test.describe('Share-Contact ownership guard (documented contract)', () => {
  test('POST .../share-contact returns 401 without session (ownership guard pre-condition)', async ({
    request,
  }) => {
    const res = await request.post(`/api/dashboard/interests/${PHANTOM_UUID}/share-contact`)
    expect(res.status()).toBe(401)
  })
})

// ── 7. GET share-contact is not a valid method ────────────────────────────────

test.describe('Share-Contact — method not allowed', () => {
  test('GET /api/dashboard/interests/:id/share-contact returns 404 or 405', async ({ request }) => {
    // The route only exports POST. GET should return 404 or 405.
    const res = await request.get(`/api/dashboard/interests/${PHANTOM_UUID}/share-contact`)
    expect([404, 405]).toContain(res.status())
  })
})
