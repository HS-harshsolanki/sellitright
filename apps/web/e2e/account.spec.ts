import { test, expect } from '@playwright/test'

/**
 * Account data & privacy API tests.
 *
 * Route inventory:
 *   GET    /api/user/export          — download personal data as JSON
 *   DELETE /api/user/delete          — delete account (requires confirm string)
 *   POST   /api/users/:id/block      — block a user (directional)
 *   DELETE /api/users/:id/block      — unblock a user
 *   POST   /api/reports              — file a report against a listing or user
 *
 * Test strategy:
 *   Auth-guard tests run without any credentials — they confirm that every
 *   sensitive write and read is blocked with 401 before any other logic fires.
 *
 *   Authenticated positive-path and edge-case tests (ACC02, parts of ACC04/05,
 *   ACC06, ACC08 self-block check) require a real Supabase session and are
 *   documented with test.skip() so they surface in the CI report without
 *   blocking the pipeline.
 *
 * Notes:
 *   - ACC01 and ACC03 both verify that GET /api/user/export returns 401 without
 *     auth — they are equivalent but are numbered separately per the TC spec to
 *     make the traceability matrix unambiguous.
 *   - ACC04 and ACC05 both start with the same unauthenticated DELETE guard test;
 *     ACC05 documents the full authenticated flow as a live-session requirement.
 */

const PHANTOM_USER_ID = '00000000-0000-0000-0000-000000000001'
const PHANTOM_LISTING_ID = '00000000-0000-0000-0000-000000000002'

// ── TC-ACC01 / TC-ACC03: GET /api/user/export — auth guard ───────────────────

test.describe('TC-ACC01 / TC-ACC03 — GET /api/user/export auth guard', () => {
  test('TC-ACC01: GET /api/user/export returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.get('/api/user/export')
    expect(res.status()).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(typeof body.error).toBe('string')
  })

  test('TC-ACC03: GET /api/user/export returns 401 without session (re-verified)', async ({
    request,
  }) => {
    // Distinct from ACC01 in the traceability matrix; verifies the same guard
    // holds on a fresh request context with no cookies attached.
    const res = await request.get('/api/user/export')
    expect(res.status()).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(typeof body.error).toBe('string')
  })
})

// ── TC-ACC02: Export redaction (requires live session) ───────────────────────

test.describe('TC-ACC02 — GET /api/user/export redacts Razorpay order IDs', () => {
  test('razorpay_order_id is redacted to "[redacted]" in the export payload', async ({
    request,
  }) => {
    // NOTE: This test requires a real authenticated session to reach the data
    // collection logic. Without a valid Supabase JWT the route returns 401
    // before any data is gathered.
    //
    // To run locally:
    //   1. Obtain a valid session JWT (e.g. from a Playwright signed-in context).
    //   2. Pass it as a Cookie header: sb-<project>-auth-token=<base64-session>.
    //   3. The export payload's `payments` array should have every
    //      razorpay_order_id set to "[redacted]".
    test.skip(true, 'requires live Supabase session — covered by manual QA')
  })
})

// ── TC-ACC04: DELETE /api/user/delete — auth guard ───────────────────────────

test.describe('TC-ACC04 — DELETE /api/user/delete auth guard', () => {
  test('DELETE /api/user/delete returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.delete('/api/user/delete')
    expect(res.status()).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(typeof body.error).toBe('string')
  })

  test('auth guard fires before confirm-string validation', async ({ request }) => {
    // The route checks auth first. Without a session, even a well-formed
    // { confirm: "DELETE MY ACCOUNT" } body must still get 401.
    const res = await request.delete('/api/user/delete', {
      data: { confirm: 'DELETE MY ACCOUNT' },
    })
    expect(res.status()).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(typeof body.error).toBe('string')
  })
})

// ── TC-ACC05: DELETE /api/user/delete — confirm-string validation ─────────────

test.describe('TC-ACC05 — DELETE /api/user/delete confirm-string enforcement', () => {
  test('unauthenticated DELETE returns 401 (auth guard precedes confirm check)', async ({
    request,
  }) => {
    // Auth guard fires before the body is parsed. 401 is expected regardless
    // of whether the confirm string is present or absent.
    const res = await request.delete('/api/user/delete', {
      data: {},
    })
    expect(res.status()).toBe(401)
  })

  test('authenticated DELETE with wrong confirm string returns 400', async ({ request }) => {
    // With a live session, sending a body that does NOT contain
    // { confirm: "DELETE MY ACCOUNT" } must return 400 with an error
    // message that tells the caller the required string.
    //
    // The route returns:
    //   { error: 'To confirm deletion, send { "confirm": "DELETE MY ACCOUNT" } ...' }
    test.skip(true, 'requires live Supabase session — covered by manual QA')
  })

  test('authenticated DELETE with correct confirm string deletes the account', async ({
    request,
  }) => {
    // With a live session and body { confirm: "DELETE MY ACCOUNT" }:
    //   1. All personal data rows are deleted/anonymised.
    //   2. auth.admin.deleteUser() is called.
    //   3. Route returns 200 { ok: true, message: "..." }.
    //   4. Subsequent requests with the same JWT return 401.
    test.skip(true, 'requires live Supabase session with a disposable test account')
  })
})

// ── TC-ACC07: POST /api/users/:id/block — auth guard ─────────────────────────

test.describe('TC-ACC07 — POST /api/users/:id/block auth guard', () => {
  test('POST /api/users/:id/block returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.post(`/api/users/${PHANTOM_USER_ID}/block`)
    expect(res.status()).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(typeof body.error).toBe('string')
  })

  test('auth guard fires before body validation', async ({ request }) => {
    // Sending a well-formed body still gets 401 without a session.
    const res = await request.post(`/api/users/${PHANTOM_USER_ID}/block`, {
      data: { reason: 'HARASSMENT' },
    })
    expect(res.status()).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(typeof body.error).toBe('string')
  })
})

// ── TC-ACC08: Self-block guard (auth required) ────────────────────────────────

test.describe('TC-ACC08 — POST /api/users/:id/block self-block guard', () => {
  test('unauthenticated POST with own ID still returns 401 (auth guard fires first)', async ({
    request,
  }) => {
    // The self-block check (user.id === targetId → 422) runs only after auth.
    // Without a session the auth guard fires first → 401.
    const res = await request.post(`/api/users/${PHANTOM_USER_ID}/block`)
    expect(res.status()).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(typeof body.error).toBe('string')
  })

  test('authenticated POST to own user ID returns 422 "You cannot block yourself."', async ({
    request,
  }) => {
    // With a live session whose user.id matches the :id parameter, the route
    // returns 422 { error: "You cannot block yourself." }.
    test.skip(true, 'requires live Supabase session — covered by manual QA')
  })
})

// ── TC-ACC09: DELETE /api/users/:id/block — auth guard ───────────────────────

test.describe('TC-ACC09 — DELETE /api/users/:id/block auth guard', () => {
  test('DELETE /api/users/:id/block returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.delete(`/api/users/${PHANTOM_USER_ID}/block`)
    expect(res.status()).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(typeof body.error).toBe('string')
  })

  test('GET /api/users/:id/block returns { isBlocked: false } when unauthenticated', async ({
    request,
  }) => {
    // The GET variant is intentionally non-gated: an unauthenticated reader
    // simply cannot have blocked anyone → isBlocked is always false.
    const res = await request.get(`/api/users/${PHANTOM_USER_ID}/block`)
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { isBlocked: boolean }
    expect(body.isBlocked).toBe(false)
  })
})

// ── TC-ACC10: POST /api/reports — auth guard ──────────────────────────────────

test.describe('TC-ACC10 — POST /api/reports auth guard', () => {
  test('POST /api/reports returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.post('/api/reports', {
      data: {
        reporter_role: 'buyer',
        listing_id: PHANTOM_LISTING_ID,
        reason: 'SPAM_LISTING',
      },
    })
    expect(res.status()).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(typeof body.error).toBe('string')
  })

  test('auth guard fires before reporter_role validation', async ({ request }) => {
    // A malformed body (invalid reporter_role) still returns 401, not 400,
    // because the auth check runs before the body is parsed.
    const res = await request.post('/api/reports', {
      data: { reporter_role: 'invalid_role' },
    })
    expect(res.status()).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(typeof body.error).toBe('string')
  })

  test('auth guard fires before listing-existence check', async ({ request }) => {
    // A buyer report referencing a non-existent listing still returns 401
    // (not 404) because the auth check is the outermost gate.
    const res = await request.post('/api/reports', {
      data: {
        reporter_role: 'buyer',
        listing_id: PHANTOM_LISTING_ID,
        reason: 'MISLEADING_INFO',
      },
    })
    expect(res.status()).toBe(401)
  })
})

// ── ACC06: Block idempotency — documented contract ────────────────────────────

test.describe('ACC06 — block idempotency documented contract', () => {
  /**
   * Blocking an already-blocked user must return 409 { error: "You have
   * already blocked this user." }.
   *
   * Full authenticated flow:
   *   1. POST /api/users/:id/block with valid session → 201 (first block)
   *   2. POST /api/users/:id/block again (same session, same targetId) → 409
   *
   * The route uses a unique constraint on (blocker_id, blockee_id) and checks
   * insertErr.code === '23505' to return 409.
   *
   * This test is skipped without a live session.
   */
  test('second POST to same :id/block returns 409 (requires live session)', async ({ request }) => {
    test.skip(true, 'requires live Supabase session — idempotency contract covered by manual QA')
    void request // suppress unused-variable lint warning
  })
})

// ── Regression: account routes never 500 ─────────────────────────────────────

test.describe('Regression — account routes do not 500', () => {
  const authGuardedRoutes = [
    { method: 'GET', path: '/api/user/export', body: undefined },
    { method: 'DELETE', path: '/api/user/delete', body: {} },
    { method: 'POST', path: `/api/users/${PHANTOM_USER_ID}/block`, body: {} },
    { method: 'DELETE', path: `/api/users/${PHANTOM_USER_ID}/block`, body: undefined },
    {
      method: 'POST',
      path: '/api/reports',
      body: { reporter_role: 'buyer', listing_id: PHANTOM_LISTING_ID, reason: 'SPAM_LISTING' },
    },
  ] as const

  for (const route of authGuardedRoutes) {
    test(`${route.method} ${route.path} does not 500`, async ({ request }) => {
      let res: Awaited<ReturnType<typeof request.get>>
      if (route.method === 'GET') {
        res = await request.get(route.path)
      } else if (route.method === 'DELETE') {
        res = await request.delete(route.path, route.body ? { data: route.body } : undefined)
      } else {
        res = await request.post(route.path, route.body ? { data: route.body } : undefined)
      }

      // Any auth-gated route hit without credentials must never return 5xx
      expect(res.status()).not.toBeGreaterThanOrEqual(500)
      expect(res.headers()['content-type']).toContain('application/json')
    })
  }
})
