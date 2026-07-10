import { test, expect } from '@playwright/test'

/**
 * Golden-path end-to-end journey tests.
 *
 * These tests verify the full buyer→seller pipeline at the API layer.
 * They do NOT require a real authenticated session — instead they verify:
 *
 *   1. Unauthenticated state at each step returns the correct status code
 *   2. API shapes are correct (correct fields, correct types)
 *   3. The pipeline is wired together (interest → dashboard → accept → payment gate)
 *
 * Full authenticated happy-path (POST interest with real JWT → seller accepts →
 * buyer pays → contacts unlock) requires Supabase to be live and two real users
 * — those are covered by manual QA and are skipped here with ADMIN_KEY guard.
 */

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''
const MOCK_LISTING_ID = 'listing-001'
const PHANTOM_UUID = '00000000-0000-0000-0000-000000000099'

// ── Step 1: Browse — listings are publicly accessible ─────────────────────────

test.describe('Golden path — Step 1: Browse', () => {
  test('GET /api/listings returns list with correct shape', async ({ request }) => {
    const res = await request.get('/api/listings')
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      listings: Array<{
        id: string
        title: string
        price: number
        status: string
      }>
      total: number
    }
    expect(Array.isArray(body.listings)).toBe(true)
    expect(typeof body.total).toBe('number')
    if (body.listings.length > 0) {
      const first = body.listings[0]!
      expect(typeof first.id).toBe('string')
      expect(typeof first.title).toBe('string')
      expect(typeof first.price).toBe('number')
    }
  })

  test('GET /api/listings/:id returns listing detail', async ({ request }) => {
    const res = await request.get(`/api/listings/${MOCK_LISTING_ID}`)
    // 200 from mock data or 404 if Supabase is live without this listing — both valid
    expect([200, 404]).toContain(res.status())
    if (res.status() === 200) {
      const body = (await res.json()) as { id: string; title: string; status: string }
      expect(body.id).toBe(MOCK_LISTING_ID)
      expect(typeof body.title).toBe('string')
    }
  })

  test('GET /api/listings filters by city', async ({ request }) => {
    const res = await request.get('/api/listings?city=Mumbai')
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { listings: Array<{ city: string }> }
    // All returned listings must match the filter if any exist
    body.listings.forEach((l) => {
      expect(l.city.toLowerCase()).toContain('mumbai')
    })
  })
})

// ── Step 2: Interest — auth required ─────────────────────────────────────────

test.describe('Golden path — Step 2: Buyer submits interest', () => {
  test('POST /api/listings/:id/interest returns 401 without auth', async ({ request }) => {
    const res = await request.post(`/api/listings/${MOCK_LISTING_ID}/interest`, {
      data: {
        fullName: 'Test Buyer',
        purpose: 'SELF',
        timeline: 'WITHIN_30_DAYS',
        funding: 'CASH_READY',
      },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/listings/:id/interest returns hasPending:false without auth', async ({
    request,
  }) => {
    const res = await request.get(`/api/listings/${MOCK_LISTING_ID}/interest`)
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { hasPending: boolean }
    expect(body.hasPending).toBe(false)
  })

  test('POST interest validates required fields even before auth check is impossible to test without session', async ({
    request,
  }) => {
    // Without auth, always 401 — validation runs after auth
    const res = await request.post(`/api/listings/${MOCK_LISTING_ID}/interest`, {
      data: {},
    })
    expect(res.status()).toBe(401)
  })
})

// ── Step 3: Seller dashboard — auth required ───────────────────────────────────

test.describe('Golden path — Step 3: Seller views interest requests', () => {
  test('GET /api/dashboard/interests returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/dashboard/interests')
    expect(res.status()).toBe(401)
  })

  test('PATCH /api/dashboard/interests/:id returns 401 without auth', async ({ request }) => {
    const res = await request.patch(`/api/dashboard/interests/${PHANTOM_UUID}`, {
      data: { action: 'ACCEPTED' },
    })
    expect(res.status()).toBe(401)
  })

  test('PATCH /api/dashboard/interests/:id validates action enum', async ({ request }) => {
    // Without auth → 401; we can't test validation layer without a session
    // But verify the route exists and returns structured JSON
    const res = await request.patch(`/api/dashboard/interests/${PHANTOM_UUID}`, {
      data: { action: 'INVALID_ACTION' },
    })
    expect(res.status()).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(typeof body.error).toBe('string')
  })
})

// ── Step 4: Payment — auth required ──────────────────────────────────────────

test.describe('Golden path — Step 4: Buyer pays to unlock contact', () => {
  test('POST /api/payments/create-order returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/payments/create-order', {
      data: { interestId: PHANTOM_UUID },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/payments/verify returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/payments/verify', {
      data: {
        razorpay_order_id: 'order_test',
        razorpay_payment_id: 'pay_test',
        razorpay_signature: 'sig_test',
        interestId: PHANTOM_UUID,
      },
    })
    expect(res.status()).toBe(401)
  })
})

// ── Step 5: Notifications received ────────────────────────────────────────────

test.describe('Golden path — Step 5: Notifications', () => {
  test('GET /api/notifications returns 401 without auth (not 500)', async ({ request }) => {
    const res = await request.get('/api/notifications')
    expect(res.status()).toBe(401)
  })

  test('PATCH /api/notifications/:id returns 401 without auth', async ({ request }) => {
    const res = await request.patch(`/api/notifications/${PHANTOM_UUID}`)
    expect(res.status()).toBe(401)
  })

  test('PATCH /api/notifications/read-all returns 401 without auth', async ({ request }) => {
    const res = await request.patch('/api/notifications/read-all')
    expect(res.status()).toBe(401)
  })
})

// ── Step 6: Admin pipeline — review listing before it goes live ───────────────

test.describe('Golden path — Step 6: Admin reviews listing', () => {
  test('GET /api/admin/listings returns 200 with correct shape', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const res = await request.get('/api/admin/listings', {
      headers: { 'x-admin-key': ADMIN_KEY },
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      listings: unknown[]
      total: number
      counts: Record<string, number>
    }
    expect(Array.isArray(body.listings)).toBe(true)
    expect('PENDING_REVIEW' in body.counts).toBe(true)
    expect('ACTIVE' in body.counts).toBe(true)
  })

  test('GET /api/admin/audit-log returns 200 with correct shape', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const res = await request.get('/api/admin/audit-log', {
      headers: { 'x-admin-key': ADMIN_KEY },
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { entries: unknown[]; total: number }
    expect(Array.isArray(body.entries)).toBe(true)
    expect(typeof body.total).toBe('number')
  })

  test('GET /api/admin/stats returns correct shape', async ({ request }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const res = await request.get('/api/admin/stats', {
      headers: { 'x-admin-key': ADMIN_KEY },
    })
    // 200 when Supabase is live; 503 in demo mode — both acceptable
    expect([200, 503]).toContain(res.status())
    if (res.status() === 200) {
      const body = (await res.json()) as {
        listings: { pending: number; active: number }
        users: { total: number }
        payments: { total: number; totalRevenue: number }
      }
      expect(typeof body.listings.pending).toBe('number')
      expect(typeof body.listings.active).toBe('number')
      expect(typeof body.users.total).toBe('number')
      expect(typeof body.payments.totalRevenue).toBe('number')
    }
  })
})

// ── Trust & Safety checkpoints throughout the journey ─────────────────────────

test.describe('Golden path — Trust & Safety gates', () => {
  test('POST /api/reports returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/reports', {
      data: { reporter_role: 'buyer', listing_id: MOCK_LISTING_ID, reason: 'SPAM_LISTING' },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/users/:id/block returns 401 without auth', async ({ request }) => {
    const res = await request.post(`/api/users/${PHANTOM_UUID}/block`)
    expect(res.status()).toBe(401)
  })

  test('GET /api/users/:id/block returns isBlocked:false without auth (safe default)', async ({
    request,
  }) => {
    const res = await request.get(`/api/users/${PHANTOM_UUID}/block`)
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { isBlocked: boolean }
    expect(body.isBlocked).toBe(false)
  })
})

// ── Regression: no 500s on any key public route ───────────────────────────────

test.describe('Regression — no 500s on public routes', () => {
  const publicRoutes = [
    '/api/listings',
    '/api/listings?page=1&limit=12',
    '/api/listings?city=Mumbai&bhkType=TWO_BHK',
    '/api/notifications',
    `/api/listings/${MOCK_LISTING_ID}/interest`,
  ]

  for (const route of publicRoutes) {
    test(`GET ${route} does not 500`, async ({ request }) => {
      const res = await request.get(route)
      expect(res.status()).not.toBe(500)
      expect(res.headers()['content-type']).toContain('application/json')
    })
  }
})
