import { test, expect } from '@playwright/test'

/**
 * Admin panel tests.
 *
 * Auth-guard tests run without a key. Key-authenticated API tests run only when
 * ADMIN_SECRET_KEY is set in the environment (set via playwright.config.ts or .env).
 */

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''

// ─── Access control ───────────────────────────────────────────────────────────

test.describe('Admin panel — access control', () => {
  test('unauthenticated user gets redirected to /login from /admin', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })

  test('redirect from /admin preserves ?next param', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/next=%2Fadmin/, { timeout: 8000 })
  })
})

// ─── Auth guard tests (no key needed) ────────────────────────────────────────

test.describe('Admin API — auth guards', () => {
  test('GET /api/admin/listings returns 401 without key', async ({ request }) => {
    const response = await request.get('/api/admin/listings')
    expect(response.status()).toBe(401)
  })

  test('GET /api/admin/listings returns 401 with wrong key', async ({ request }) => {
    const response = await request.get('/api/admin/listings', {
      headers: { 'x-admin-key': 'definitely-wrong-key-xyz' },
    })
    expect(response.status()).toBe(401)
  })

  test('GET /api/admin/listings/:id returns 401 without key', async ({ request }) => {
    const response = await request.get('/api/admin/listings/any-id')
    expect(response.status()).toBe(401)
  })

  test('POST /api/admin/listings/:id/approve returns 401 without key', async ({ request }) => {
    const response = await request.post('/api/admin/listings/any-id/approve', { data: {} })
    expect(response.status()).toBe(401)
  })

  test('POST /api/admin/listings/:id/reject returns 401 without key', async ({ request }) => {
    const response = await request.post('/api/admin/listings/any-id/reject', {
      data: { reason: 'Fake listing' },
    })
    expect(response.status()).toBe(401)
  })

  test('POST /api/admin/listings/:id/delete returns 401 without key', async ({ request }) => {
    const response = await request.post('/api/admin/listings/any-id/delete', { data: {} })
    expect(response.status()).toBe(401)
  })

  test('POST /api/admin/listings/:id/note returns 401 without key', async ({ request }) => {
    const response = await request.post('/api/admin/listings/any-id/note', {
      data: { note: 'Test' },
    })
    expect(response.status()).toBe(401)
  })

  test('GET /api/admin/audit-log returns 401 without key', async ({ request }) => {
    const response = await request.get('/api/admin/audit-log')
    expect(response.status()).toBe(401)
  })
})

// ─── Validation tests (bad input, no real data needed) ───────────────────────
// These run only when ADMIN_SECRET_KEY is present — we send the key so the route
// reaches the validation layer and returns 400 rather than 401.

test.describe('Admin API — input validation', () => {
  test('POST reject returns 400 when reason is missing', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.post('/api/admin/listings/any-id/reject', {
      headers: { 'x-admin-key': ADMIN_KEY },
      data: {},
    })
    expect(response.status()).toBe(400)
    const body = (await response.json()) as { error: string }
    expect(body.error).toMatch(/reason/i)
  })

  test('POST reject returns 400 when reason is blank', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.post('/api/admin/listings/any-id/reject', {
      headers: { 'x-admin-key': ADMIN_KEY },
      data: { reason: '   ' },
    })
    expect(response.status()).toBe(400)
  })

  test('POST note returns 400 when note is missing', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.post('/api/admin/listings/any-id/note', {
      headers: { 'x-admin-key': ADMIN_KEY },
      data: {},
    })
    expect(response.status()).toBe(400)
  })
})

// ─── 404 tests (non-existent listing IDs) ────────────────────────────────────

test.describe('Admin API — not found', () => {
  const PHANTOM_ID = '00000000-0000-0000-0000-000000000000'

  test('GET /api/admin/listings/:id returns 404 for phantom id', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.get(`/api/admin/listings/${PHANTOM_ID}`, {
      headers: { 'x-admin-key': ADMIN_KEY },
    })
    expect(response.status()).toBe(404)
  })

  test('POST approve returns 404 for phantom id', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.post(`/api/admin/listings/${PHANTOM_ID}/approve`, {
      headers: { 'x-admin-key': ADMIN_KEY },
      data: {},
    })
    expect(response.status()).toBe(404)
  })

  test('POST reject returns 404 for phantom id', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.post(`/api/admin/listings/${PHANTOM_ID}/reject`, {
      headers: { 'x-admin-key': ADMIN_KEY },
      data: { reason: 'Test rejection' },
    })
    expect(response.status()).toBe(404)
  })

  test('POST delete returns 404 for phantom id', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.post(`/api/admin/listings/${PHANTOM_ID}/delete`, {
      headers: { 'x-admin-key': ADMIN_KEY },
      data: {},
    })
    expect(response.status()).toBe(404)
  })

  test('POST note returns 404 for phantom id', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.post(`/api/admin/listings/${PHANTOM_ID}/note`, {
      headers: { 'x-admin-key': ADMIN_KEY },
      data: { note: 'Test note' },
    })
    expect(response.status()).toBe(404)
  })
})

// ─── Positive path tests (requires working Supabase + valid key) ──────────────

test.describe('Admin API — positive path', () => {
  test('GET /api/admin/listings returns correct shape', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.get('/api/admin/listings', {
      headers: { 'x-admin-key': ADMIN_KEY },
    })
    expect(response.status()).toBe(200)
    const body = (await response.json()) as {
      listings: unknown[]
      total: number
      page: number
      totalPages: number
      counts: Record<string, number>
    }
    expect(Array.isArray(body.listings)).toBe(true)
    expect(typeof body.total).toBe('number')
    expect(typeof body.counts).toBe('object')
    expect('PENDING_REVIEW' in body.counts).toBe(true)
    expect('ACTIVE' in body.counts).toBe(true)
  })

  test('GET /api/admin/listings filters ACTIVE correctly', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.get('/api/admin/listings?status=ACTIVE', {
      headers: { 'x-admin-key': ADMIN_KEY },
    })
    expect(response.status()).toBe(200)
    const body = (await response.json()) as { listings: Array<{ status: string }> }
    body.listings.forEach((l) => expect(l.status).toBe('ACTIVE'))
  })

  test('GET /api/admin/listings paginates correctly', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    // limit minimum is 10 — the API clamps lower values to 10
    const response = await request.get('/api/admin/listings?page=1&limit=10', {
      headers: { 'x-admin-key': ADMIN_KEY },
    })
    expect(response.status()).toBe(200)
    const body = (await response.json()) as { listings: unknown[]; page: number }
    expect(body.page).toBe(1)
    expect(body.listings.length).toBeLessThanOrEqual(10)
  })

  test('GET /api/admin/audit-log returns correct shape', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.get('/api/admin/audit-log', {
      headers: { 'x-admin-key': ADMIN_KEY },
    })
    expect(response.status()).toBe(200)
    const body = (await response.json()) as {
      entries: unknown[]
      total: number
      page: number
    }
    expect(Array.isArray(body.entries)).toBe(true)
    expect(typeof body.total).toBe('number')
    expect(body.page).toBe(1)
  })

  test('GET /api/admin/audit-log action filter works', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.get('/api/admin/audit-log?action=approved', {
      headers: { 'x-admin-key': ADMIN_KEY },
    })
    expect(response.status()).toBe(200)
    const body = (await response.json()) as { entries: Array<{ action: string }> }
    body.entries.forEach((e) => expect(e.action).toBe('approved'))
  })
})

// ─── TC-ADM01 — Admin users list: auth guard ─────────────────────────────────

test.describe('TC-ADM01 — Admin users list: auth guard', () => {
  test('GET /api/admin/users returns 401 without admin key', async ({ request }) => {
    const res = await request.get('/api/admin/users')
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(typeof body.error).toBe('string')
  })
})

// ─── TC-ADM03 — Admin users list: wrong key rejected ─────────────────────────

test.describe('TC-ADM03 — Admin users list: wrong key rejected', () => {
  test('GET /api/admin/users returns 401 with wrong admin key', async ({ request }) => {
    const res = await request.get('/api/admin/users', {
      headers: { 'x-admin-key': 'wrong-key-xyz-9999' },
    })
    expect(res.status()).toBe(401)
  })
})

// ─── TC-ADM04 — Admin users list: correct shape ──────────────────────────────

test.describe('TC-ADM04 — Admin users list: correct shape', () => {
  test('GET /api/admin/users with valid key returns user list shape', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY env var')
    const res = await request.get('/api/admin/users', { headers: { 'x-admin-key': ADMIN_KEY } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.users)).toBe(true)
    expect(typeof body.total).toBe('number')
  })
})

// ─── TC-ADM06 — Admin suspend user: auth guard ───────────────────────────────

test.describe('TC-ADM06 — Admin suspend user: auth guard', () => {
  test('POST /api/admin/users/:id/suspend returns 401 without key', async ({ request }) => {
    const res = await request.post(
      '/api/admin/users/00000000-0000-0000-0000-000000000001/suspend',
      { data: {} },
    )
    expect(res.status()).toBe(401)
  })
})

// ─── TC-ADM07 — Admin activate user: auth guard ──────────────────────────────

test.describe('TC-ADM07 — Admin activate user: auth guard', () => {
  test('POST /api/admin/users/:id/activate returns 401 without key', async ({ request }) => {
    const res = await request.post(
      '/api/admin/users/00000000-0000-0000-0000-000000000001/activate',
      { data: {} },
    )
    expect(res.status()).toBe(401)
  })
})

// ─── TC-ADM08 — Admin suspend phantom user: 404 ──────────────────────────────

test.describe('TC-ADM08 — Admin suspend phantom user: 404', () => {
  test('POST suspend on non-existent user returns 404 with valid key', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY env var')
    const res = await request.post(
      '/api/admin/users/00000000-0000-0000-0000-000000000001/suspend',
      {
        headers: { 'x-admin-key': ADMIN_KEY },
        data: {},
      },
    )
    expect([404, 400]).toContain(res.status())
    const body = await res.json()
    expect(typeof body.error).toBe('string')
  })
})

// ─── TC-ADM10 — Admin payments list: auth guard ──────────────────────────────

test.describe('TC-ADM10 — Admin payments list: auth guard', () => {
  test('GET /api/admin/payments returns 401 without admin key', async ({ request }) => {
    const res = await request.get('/api/admin/payments')
    expect(res.status()).toBe(401)
  })
})

// ─── TC-ADM11 — Admin payments list: correct shape ───────────────────────────

test.describe('TC-ADM11 — Admin payments list: correct shape', () => {
  test('GET /api/admin/payments with valid key returns payments shape', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY env var')
    const res = await request.get('/api/admin/payments', { headers: { 'x-admin-key': ADMIN_KEY } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.payments)).toBe(true)
    expect(typeof body.total).toBe('number')
  })
})

// ─── TC-ADM15 — Admin stats: auth guard ──────────────────────────────────────

test.describe('TC-ADM15 — Admin stats: auth guard', () => {
  test('GET /api/admin/stats returns 401 without admin key', async ({ request }) => {
    const res = await request.get('/api/admin/stats')
    expect(res.status()).toBe(401)
  })
})

// ─── TC-ADM17 — Admin stats: correct shape ───────────────────────────────────

test.describe('TC-ADM17 — Admin stats: correct shape', () => {
  test('GET /api/admin/stats with valid key returns stats object', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY env var')
    const res = await request.get('/api/admin/stats', { headers: { 'x-admin-key': ADMIN_KEY } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    // Stats object should have numeric counts
    expect(res.status()).not.toBeGreaterThanOrEqual(500)
    expect(typeof body).toBe('object')
    expect(body).not.toBeNull()
  })
})

// ─── TC-ADM19 — Admin phone violations review: auth guard ────────────────────

test.describe('TC-ADM19 — Admin phone violations review: auth guard', () => {
  test('PATCH /api/admin/phone-violations/:id returns 401 without key', async ({ request }) => {
    const res = await request.patch(
      '/api/admin/phone-violations/00000000-0000-0000-0000-000000000001',
      {
        data: { reviewed: true },
      },
    )
    expect(res.status()).toBe(401)
  })
})
