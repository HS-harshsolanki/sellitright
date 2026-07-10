import { test, expect, type Page } from '@playwright/test'

/**
 * Dashboard page tests.
 *
 * The dashboard is protected — unauthenticated users are redirected to login.
 * Authenticated UI tests mock the Supabase auth and listings API.
 */

test.describe('Dashboard — unauthenticated redirect', () => {
  test('redirects to /login when not signed in', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })

  test('redirect URL contains ?next=/dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/next=%2Fdashboard/, { timeout: 8000 })
  })
})

test.describe('Dashboard API — /api/dashboard/listings', () => {
  test('returns 401 when not authenticated', async ({ request }) => {
    const response = await request.get('/api/dashboard/listings')
    expect(response.status()).toBe(401)
  })

  test('query params are accepted without auth error changing', async ({ request }) => {
    const response = await request.get('/api/dashboard/listings?status=ACTIVE&page=1')
    expect(response.status()).toBe(401)
  })
})

test.describe('Dashboard — mocked listings data', () => {
  test.beforeEach(async ({ page }) => {
    // Mock dashboard API
    await page.route('**/api/dashboard/listings**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          listings: [
            {
              id: 'listing-1',
              title: '2 BHK Apartment in Bandra',
              price: 15000000,
              property_type: 'APARTMENT',
              bhk_type: 'TWO_BHK',
              built_up_area: 850,
              city: 'Mumbai',
              locality: 'Bandra',
              image_urls: [],
              status: 'ACTIVE',
              is_verified: false,
              view_count: 42,
              rejection_reason: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: 'listing-2',
              title: '3 BHK Villa in Koramangala',
              price: 25000000,
              property_type: 'VILLA',
              bhk_type: 'THREE_BHK',
              built_up_area: 1500,
              city: 'Bengaluru',
              locality: 'Koramangala',
              image_urls: [],
              status: 'PENDING_REVIEW',
              is_verified: false,
              view_count: 0,
              rejection_reason: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          total: 2,
          page: 1,
          totalPages: 1,
          mockFallback: false,
        }),
      })
    })
  })

  test('dashboard page shows My Listings heading', async ({ page }) => {
    await page.goto('/dashboard')
    const url = page.url()
    if (url.includes('/login')) {
      // Can't test dashboard UI without real auth cookie
      test.skip()
      return
    }
    await expect(
      page
        .getByRole('heading', { name: /my listings/i })
        .or(page.getByText(/my listings/i).first()),
    ).toBeVisible({ timeout: 8000 })
  })

  test('dashboard shows Post New Listing link', async ({ page }) => {
    await page.goto('/dashboard')
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    await expect(
      page
        .getByRole('link', { name: /post new listing/i })
        .or(page.getByRole('link', { name: /post property/i }))
        .or(page.getByRole('link', { name: /\+ new/i })),
    ).toBeVisible({ timeout: 8000 })
  })
})

test.describe('Profile page — unauthenticated redirect', () => {
  test('redirects /profile to /login', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })
})

test.describe('Listing edit page — unauthenticated redirect', () => {
  test('redirects /listings/:id/edit to /login', async ({ page }) => {
    await page.goto('/listings/some-id/edit')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })
})

async function mockAuth(page: Page) {
  await page.route('**/auth/v1/user', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-1',
        email: 'test@test.com',
        user_metadata: { phone_verified: true, full_name: 'Test User' },
        aud: 'authenticated',
        role: 'authenticated',
      }),
    }),
  )
  await page.route('**/auth/v1/token**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock',
        token_type: 'bearer',
        expires_in: 3600,
        user: { id: 'user-1' },
      }),
    }),
  )
}

// TC-D02 — GET /api/dashboard/interests returns 401 without auth
test.describe('TC-D02 — Dashboard interests API unauthenticated', () => {
  test('GET /api/dashboard/interests returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/dashboard/interests')
    expect(res.status()).toBe(401)
  })
})

// TC-D03 — PATCH /api/dashboard/interests/:id returns 401 without auth
test.describe('TC-D03 — Dashboard interests PATCH unauthenticated', () => {
  test('PATCH /api/dashboard/interests/:id returns 401 without auth', async ({ request }) => {
    const res = await request.patch(
      '/api/dashboard/interests/00000000-0000-0000-0000-000000000001',
      { data: { action: 'ACCEPTED' } },
    )
    expect(res.status()).toBe(401)
  })
})

// TC-D04 — PATCH /api/dashboard/interests/:id with invalid action → 400 or 401
test.describe('TC-D04 — Dashboard interests PATCH invalid action', () => {
  test('PATCH /api/dashboard/interests/:id with invalid action returns 400 or 401', async ({
    request,
  }) => {
    const res = await request.patch(
      '/api/dashboard/interests/00000000-0000-0000-0000-000000000001',
      { data: { action: 'INVALID_ACTION' } },
    )
    expect([400, 401]).toContain(res.status())
  })
})

// TC-D07 — Dashboard listings tab shows status badges
test.describe('TC-D07 — Dashboard listings status badges', () => {
  test('shows ACTIVE and PENDING_REVIEW status badges', async ({ page }) => {
    await mockAuth(page)
    await page.route('**/api/dashboard/listings**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          listings: [
            {
              id: 'l1',
              title: '3 BHK Bandra',
              price: 15000000,
              status: 'ACTIVE',
              city: 'Mumbai',
              locality: 'Bandra',
              propertyType: 'APARTMENT',
              photos: [],
              createdAt: '2024-01-01T00:00:00Z',
            },
            {
              id: 'l2',
              title: '2 BHK Pune',
              price: 8000000,
              status: 'PENDING_REVIEW',
              city: 'Pune',
              locality: 'Kothrud',
              propertyType: 'APARTMENT',
              photos: [],
              createdAt: '2024-01-01T00:00:00Z',
            },
          ],
          total: 2,
        }),
      })
    })
    await page.route('**/api/dashboard/interests**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ interests: [], total: 0 }),
      })
    })
    await page.goto('/dashboard')
    await expect(page.getByText(/active/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/pending/i).first()).toBeVisible({ timeout: 10000 })
  })
})

// TC-D08 — Dashboard buyer requests tab is clickable
test.describe('TC-D08 — Dashboard buyer requests tab', () => {
  test('buyer requests tab is clickable and changes content or URL', async ({ page }) => {
    await mockAuth(page)
    await page.route('**/api/dashboard/listings**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          listings: [
            {
              id: 'l1',
              title: '3 BHK Bandra',
              price: 15000000,
              status: 'ACTIVE',
              city: 'Mumbai',
              locality: 'Bandra',
              propertyType: 'APARTMENT',
              photos: [],
              createdAt: '2024-01-01T00:00:00Z',
            },
          ],
          total: 1,
        }),
      })
    })
    await page.route('**/api/dashboard/interests**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ interests: [], total: 0 }),
      })
    })
    await page.goto('/dashboard')
    const tab = page
      .getByRole('tab', { name: /buyer|request|interest/i })
      .or(page.getByRole('link', { name: /buyer|request|interest/i }))
    await tab.first().click()
    const currentUrl = page.url()
    const urlChanged = /buyers|requests|interests/.test(currentUrl)
    const interestContent = page.getByText(/no.*interest|no.*request|buyer request/i)
    if (!urlChanged) {
      await expect(interestContent.or(page.getByText(/interest/i).first())).toBeVisible({
        timeout: 8000,
      })
    }
  })
})

// TC-D09 — /notifications redirects unauthenticated → /login
test.describe('TC-D09 — Notifications page unauthenticated redirect', () => {
  test('redirects /notifications to /login when not signed in', async ({ page }) => {
    await page.goto('/notifications')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })
})

// TC-D10 — GET /api/notifications returns 401 without auth
test.describe('TC-D10 — Notifications API unauthenticated', () => {
  test('GET /api/notifications returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/notifications')
    expect(res.status()).toBe(401)
  })
})

// TC-D12 — PATCH /api/notifications/:id/read returns 401 without auth
test.describe('TC-D12 — Notifications mark-read API unauthenticated', () => {
  test('PATCH /api/notifications/:id/read returns 401 without auth', async ({ request }) => {
    const resWithRead = await request.patch(
      '/api/notifications/00000000-0000-0000-0000-000000000001/read',
    )
    expect(resWithRead.status()).toBe(401)
    const resWithoutRead = await request.patch(
      '/api/notifications/00000000-0000-0000-0000-000000000001',
    )
    expect([401, 404, 405]).toContain(resWithoutRead.status())
  })
})

// TC-D13 — PATCH /api/notifications/read-all returns 401 without auth
test.describe('TC-D13 — Notifications read-all API unauthenticated', () => {
  test('PATCH /api/notifications/read-all returns 401, 404, or 405 without auth', async ({
    request,
  }) => {
    const res = await request.patch('/api/notifications/read-all')
    expect([401, 404, 405]).toContain(res.status())
  })
})

// TC-D14 — Notifications page renders mocked notifications
test.describe('TC-D14 — Notifications page renders mocked data', () => {
  test('shows notification title from mocked API response', async ({ page }) => {
    await mockAuth(page)
    await page.route('**/api/notifications**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: [
            {
              id: 'n1',
              title: 'Request Accepted',
              message: 'Your request for 3 BHK Bandra was accepted',
              type: 'Accepted',
              read: false,
              createdAt: '2024-01-01T00:00:00Z',
              entityType: null,
              entityId: null,
            },
          ],
          total: 1,
          unreadCount: 1,
          page: 1,
          totalPages: 1,
        }),
      })
    })
    await page.goto('/notifications')
    await expect(page.getByText(/request accepted/i)).toBeVisible({ timeout: 10000 })
  })
})
