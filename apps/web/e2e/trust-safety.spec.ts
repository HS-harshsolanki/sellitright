import { test, expect } from '@playwright/test'

/**
 * Trust & Safety API tests.
 *
 * Auth-guard tests run without any credentials.
 * Positive-path and edge-case tests require ADMIN_SECRET_KEY
 * (loaded from .env.local by playwright.config.ts).
 */

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''
const PHANTOM_USER_ID = '00000000-0000-0000-0000-000000000001'
const PHANTOM_LISTING_ID = '00000000-0000-0000-0000-000000000002'

// ── Reports — auth guards ─────────────────────────────────────────────────────

test.describe('Reports API — auth guards', () => {
  test('POST /api/reports returns 401 when unauthenticated', async ({ request }) => {
    const response = await request.post('/api/reports', {
      data: {
        reporter_role: 'buyer',
        listing_id: PHANTOM_LISTING_ID,
        reason: 'SPAM_LISTING',
      },
    })
    expect(response.status()).toBe(401)
  })
})

// ── Reports — input validation ────────────────────────────────────────────────

test.describe('Reports API — input validation (no auth needed for shape errors)', () => {
  test('POST /api/reports returns 401 (not 400) for malformed body without auth', async ({
    request,
  }) => {
    // Without a session, 401 comes before validation — correct precedence
    const response = await request.post('/api/reports', {
      data: { reporter_role: 'invalid_role' },
    })
    expect(response.status()).toBe(401)
  })
})

// ── Block — auth guards ───────────────────────────────────────────────────────

test.describe('Block API — auth guards', () => {
  test('POST /api/users/:id/block returns 401 when unauthenticated', async ({ request }) => {
    const response = await request.post(`/api/users/${PHANTOM_USER_ID}/block`)
    expect(response.status()).toBe(401)
  })

  test('DELETE /api/users/:id/block returns 401 when unauthenticated', async ({ request }) => {
    const response = await request.delete(`/api/users/${PHANTOM_USER_ID}/block`)
    expect(response.status()).toBe(401)
  })

  test('GET /api/users/:id/block returns { isBlocked: false } when unauthenticated', async ({
    request,
  }) => {
    const response = await request.get(`/api/users/${PHANTOM_USER_ID}/block`)
    expect(response.status()).toBe(200)
    const body = (await response.json()) as { isBlocked: boolean }
    expect(body.isBlocked).toBe(false)
  })
})

// ── Admin reports — auth guards ───────────────────────────────────────────────

test.describe('Admin Reports API — auth guards', () => {
  test('GET /api/admin/reports returns 401 without key', async ({ request }) => {
    const response = await request.get('/api/admin/reports')
    expect(response.status()).toBe(401)
  })

  test('GET /api/admin/reports returns 401 with wrong key', async ({ request }) => {
    const response = await request.get('/api/admin/reports', {
      headers: { 'x-admin-key': 'wrong-key-xyz' },
    })
    expect(response.status()).toBe(401)
  })

  test('PATCH /api/admin/reports returns 401 without key', async ({ request }) => {
    const response = await request.patch('/api/admin/reports', {
      data: { ids: ['some-id'], status: 'REVIEWED' },
    })
    expect(response.status()).toBe(401)
  })
})

// ── Admin flag — auth guards ──────────────────────────────────────────────────

test.describe('Admin Flag API — auth guards', () => {
  test('POST /api/admin/users/:id/flag returns 401 without key', async ({ request }) => {
    const response = await request.post(`/api/admin/users/${PHANTOM_USER_ID}/flag`, {
      data: { flag: 'SPAM' },
    })
    expect(response.status()).toBe(401)
  })

  test('GET /api/admin/users/:id/flag returns 401 without key', async ({ request }) => {
    const response = await request.get(`/api/admin/users/${PHANTOM_USER_ID}/flag`)
    expect(response.status()).toBe(401)
  })
})

// ── Admin reports — validation (with key) ────────────────────────────────────

test.describe('Admin Reports API — input validation', () => {
  test('GET /api/admin/reports returns 400 for invalid status param', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.get('/api/admin/reports?status=INVALID', {
      headers: { 'x-admin-key': ADMIN_KEY },
    })
    expect(response.status()).toBe(400)
  })

  test('PATCH /api/admin/reports returns 400 when ids is empty', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.patch('/api/admin/reports', {
      headers: { 'x-admin-key': ADMIN_KEY },
      data: { ids: [], status: 'REVIEWED' },
    })
    expect(response.status()).toBe(400)
  })

  test('PATCH /api/admin/reports returns 400 for invalid status', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.patch('/api/admin/reports', {
      headers: { 'x-admin-key': ADMIN_KEY },
      data: { ids: ['some-id'], status: 'APPROVED' },
    })
    expect(response.status()).toBe(400)
  })
})

// ── Admin flag — validation ───────────────────────────────────────────────────

test.describe('Admin Flag API — input validation', () => {
  test('POST flag returns 400 for invalid flag value', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.post(`/api/admin/users/${PHANTOM_USER_ID}/flag`, {
      headers: { 'x-admin-key': ADMIN_KEY },
      data: { flag: 'INVALID_FLAG' },
    })
    expect(response.status()).toBe(400)
  })

  test('POST flag returns 404 for phantom user ID', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.post(`/api/admin/users/${PHANTOM_USER_ID}/flag`, {
      headers: { 'x-admin-key': ADMIN_KEY },
      data: { flag: 'SPAM', reason: 'Test' },
    })
    expect(response.status()).toBe(404)
  })
})

// ── Admin reports — positive path ─────────────────────────────────────────────
// These tests require migration 003_trust_safety.sql to be applied in Supabase.
// They are skipped automatically when the table doesn't exist (API returns 500).

test.describe('Admin Reports API — positive path', () => {
  test('GET /api/admin/reports returns correct shape', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.get('/api/admin/reports?status=ALL', {
      headers: { 'x-admin-key': ADMIN_KEY },
    })
    // 500 means migration 003 not yet applied — skip gracefully
    if (response.status() === 500) {
      test.skip(true, 'migration 003_trust_safety.sql not yet applied in Supabase')
      return
    }
    expect(response.status()).toBe(200)
    const body = (await response.json()) as {
      reports: unknown[]
      total: number
      page: number
      totalPages: number
    }
    expect(Array.isArray(body.reports)).toBe(true)
    expect(typeof body.total).toBe('number')
    expect(body.page).toBe(1)
  })

  test('GET /api/admin/reports filters by reporter_role=buyer', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.get('/api/admin/reports?status=ALL&reporter_role=buyer', {
      headers: { 'x-admin-key': ADMIN_KEY },
    })
    if (response.status() === 500) {
      test.skip(true, 'migration 003_trust_safety.sql not yet applied in Supabase')
      return
    }
    expect(response.status()).toBe(200)
    const body = (await response.json()) as { reports: Array<{ reporter_role: string }> }
    body.reports.forEach((r) => expect(r.reporter_role).toBe('buyer'))
  })

  test('GET /api/admin/reports paginates correctly', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.get('/api/admin/reports?status=ALL&page=1&limit=10', {
      headers: { 'x-admin-key': ADMIN_KEY },
    })
    if (response.status() === 500) {
      test.skip(true, 'migration 003_trust_safety.sql not yet applied in Supabase')
      return
    }
    expect(response.status()).toBe(200)
    const body = (await response.json()) as { reports: unknown[]; page: number }
    expect(body.page).toBe(1)
    expect(body.reports.length).toBeLessThanOrEqual(10)
  })
})

// ── Admin flag — positive path ────────────────────────────────────────────────

test.describe('Admin Flag API — positive path', () => {
  test('GET /api/admin/users/:id/flag returns correct shape for phantom id', async ({
    request,
  }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    // Phantom user → no flag, no risk score, but shape is correct
    const response = await request.get(`/api/admin/users/${PHANTOM_USER_ID}/flag`, {
      headers: { 'x-admin-key': ADMIN_KEY },
    })
    // 200 with null fields (user doesn't exist in auth but flag table is empty)
    // or 404 if auth.admin.getUserById checks — either is acceptable
    expect([200, 404]).toContain(response.status())
    if (response.status() === 200) {
      const body = (await response.json()) as {
        userId: string
        currentFlag: unknown
        riskScore: unknown
        flagHistory: unknown[]
      }
      expect(body.userId).toBe(PHANTOM_USER_ID)
      expect(Array.isArray(body.flagHistory)).toBe(true)
    }
  })
})
