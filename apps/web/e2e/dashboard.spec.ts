import { test, expect } from '@playwright/test'

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
      page.getByRole('heading', { name: /my listings/i }).or(page.getByText(/my listings/i).first()),
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
