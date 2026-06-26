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
