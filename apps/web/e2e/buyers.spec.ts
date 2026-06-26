import { test, expect } from '@playwright/test'

/**
 * Seller "Interested Buyers" feature tests.
 *
 * Covers:
 *  - GET /api/dashboard/interests — auth guard, query params, response shape
 *  - PATCH /api/dashboard/interests/:id — auth guard, action validation
 *  - Dashboard UI — "Interested Buyers" tab renders when mocked
 */

// ---------------------------------------------------------------------------
// API layer — GET /api/dashboard/interests
// ---------------------------------------------------------------------------

test.describe('GET /api/dashboard/interests — unauthenticated', () => {
  test('returns 401 when not signed in', async ({ request }) => {
    const response = await request.get('/api/dashboard/interests')
    expect(response.status()).toBe(401)
  })

  test('returns 401 with status filter param', async ({ request }) => {
    const response = await request.get('/api/dashboard/interests?status=PENDING')
    expect(response.status()).toBe(401)
  })

  test('returns 401 with sort param', async ({ request }) => {
    const response = await request.get('/api/dashboard/interests?sort=oldest')
    expect(response.status()).toBe(401)
  })

  test('returns 401 with page param', async ({ request }) => {
    const response = await request.get('/api/dashboard/interests?page=2')
    expect(response.status()).toBe(401)
  })

  test('returns JSON error body', async ({ request }) => {
    const response = await request.get('/api/dashboard/interests')
    const body = (await response.json()) as { error?: string }
    expect(typeof body.error).toBe('string')
    expect(body.error!.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// API layer — PATCH /api/dashboard/interests/:id
// ---------------------------------------------------------------------------

test.describe('PATCH /api/dashboard/interests/:id — unauthenticated', () => {
  test('returns 401 without auth', async ({ request }) => {
    const response = await request.patch('/api/dashboard/interests/fake-id', {
      data: { action: 'ACCEPTED' },
    })
    expect(response.status()).toBe(401)
  })

  test('returns 401 for DECLINED action without auth', async ({ request }) => {
    const response = await request.patch('/api/dashboard/interests/fake-id', {
      data: { action: 'DECLINED' },
    })
    expect(response.status()).toBe(401)
  })

  test('returns 401 (not 400) even with invalid action — auth checked first', async ({
    request,
  }) => {
    const response = await request.patch('/api/dashboard/interests/fake-id', {
      data: { action: 'INVALID_ACTION' },
    })
    expect(response.status()).toBe(401)
  })

  test('returns 401 with empty body', async ({ request }) => {
    const response = await request.patch('/api/dashboard/interests/fake-id', {
      data: {},
    })
    expect(response.status()).toBe(401)
  })

  test('returns JSON error body', async ({ request }) => {
    const response = await request.patch('/api/dashboard/interests/fake-id', {
      data: { action: 'ACCEPTED' },
    })
    const body = (await response.json()) as { error?: string }
    expect(typeof body.error).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// Dashboard UI — Interested Buyers tab (mocked)
// ---------------------------------------------------------------------------

test.describe('Dashboard — Interested Buyers tab (mocked API)', () => {
  const MOCK_INTERESTS = [
    {
      id: 'interest-1',
      listingId: 'listing-1',
      listingTitle: '2 BHK Apartment in Bandra',
      listingCity: 'Mumbai',
      fullName: 'Rahul Sharma',
      purpose: 'SELF',
      timeline: 'WITHIN_30_DAYS',
      funding: 'LOAN_APPROVED',
      message: 'I am very interested in this property.',
      status: 'PENDING',
      createdAt: new Date('2024-01-15').toISOString(),
      updatedAt: new Date('2024-01-15').toISOString(),
    },
    {
      id: 'interest-2',
      listingId: 'listing-1',
      listingTitle: '2 BHK Apartment in Bandra',
      listingCity: 'Mumbai',
      fullName: 'Priya Patel',
      purpose: 'INVESTMENT',
      timeline: 'IMMEDIATELY',
      funding: 'CASH_READY',
      message: null,
      status: 'ACCEPTED',
      createdAt: new Date('2024-01-10').toISOString(),
      updatedAt: new Date('2024-01-11').toISOString(),
    },
  ]

  test.beforeEach(async ({ page }) => {
    // Mock the listings API so the dashboard loads
    await page.route('**/api/dashboard/listings**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ listings: [], total: 0, page: 1, totalPages: 0 }),
      })
    })

    // Mock the interests API with test data
    await page.route('**/api/dashboard/interests**', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            interests: MOCK_INTERESTS,
            total: 2,
            page: 1,
            totalPages: 1,
          }),
        })
      } else {
        route.continue()
      }
    })
  })

  test('"Interested Buyers" tab is visible in the tab bar', async ({ page }) => {
    await page.goto('/dashboard')
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    await expect(page.getByRole('tab', { name: /interested buyers/i })).toBeVisible({
      timeout: 8000,
    })
  })

  test('clicking Interested Buyers tab shows buyer cards', async ({ page }) => {
    await page.goto('/dashboard')
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }

    await page.getByRole('tab', { name: /interested buyers/i }).click()
    // Buyer name should be visible
    await expect(page.getByText('Rahul Sharma')).toBeVisible({ timeout: 8000 })
  })

  test('buyer card shows metadata chips', async ({ page }) => {
    await page.goto('/dashboard')
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }

    await page.getByRole('tab', { name: /interested buyers/i }).click()
    await page.getByText('Rahul Sharma').waitFor({ timeout: 8000 })

    // Purpose chip
    await expect(page.getByText('Own use').first()).toBeVisible()
    // Timeline chip
    await expect(page.getByText('Within 30 days').first()).toBeVisible()
    // Funding chip
    await expect(page.getByText('Loan approved').first()).toBeVisible()
  })

  test('buyer card shows message when present', async ({ page }) => {
    await page.goto('/dashboard')
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }

    await page.getByRole('tab', { name: /interested buyers/i }).click()
    await page.getByText('Rahul Sharma').waitFor({ timeout: 8000 })

    await expect(page.getByText(/I am very interested in this property/)).toBeVisible()
  })

  test('PENDING card shows Accept and Decline buttons', async ({ page }) => {
    await page.goto('/dashboard')
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }

    await page.getByRole('tab', { name: /interested buyers/i }).click()
    await page.getByText('Rahul Sharma').waitFor({ timeout: 8000 })

    await expect(page.getByRole('button', { name: /accept/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /decline/i }).first()).toBeVisible()
  })

  test('PENDING card shows Later button', async ({ page }) => {
    await page.goto('/dashboard')
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }

    await page.getByRole('tab', { name: /interested buyers/i }).click()
    await page.getByText('Rahul Sharma').waitFor({ timeout: 8000 })

    await expect(page.getByRole('button', { name: /later/i }).first()).toBeVisible()
  })

  test('ACCEPTED card does not show action buttons', async ({ page }) => {
    await page.goto('/dashboard')
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }

    await page.getByRole('tab', { name: /interested buyers/i }).click()
    await page.getByText('Priya Patel').waitFor({ timeout: 8000 })

    // The Accepted card should have an Accepted badge but no action buttons near it
    const priyaCard = page.locator('.rounded-xl').filter({ hasText: 'Priya Patel' })
    await expect(priyaCard.getByText('Accepted')).toBeVisible()
    await expect(priyaCard.getByRole('button', { name: /accept/i })).not.toBeVisible()
  })

  test('Decline button triggers two-step confirmation', async ({ page }) => {
    await page.goto('/dashboard')
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }

    await page.getByRole('tab', { name: /interested buyers/i }).click()
    await page.getByText('Rahul Sharma').waitFor({ timeout: 8000 })

    // Click Decline
    await page
      .getByRole('button', { name: /^decline$/i })
      .first()
      .click()

    // Confirm step should appear
    await expect(page.getByRole('button', { name: /yes, decline/i })).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()
  })

  test('Cancel in decline confirmation reverts to normal buttons', async ({ page }) => {
    await page.goto('/dashboard')
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }

    await page.getByRole('tab', { name: /interested buyers/i }).click()
    await page.getByText('Rahul Sharma').waitFor({ timeout: 8000 })

    await page
      .getByRole('button', { name: /^decline$/i })
      .first()
      .click()
    await page.getByRole('button', { name: /cancel/i }).click()

    // Original buttons should be back
    await expect(page.getByRole('button', { name: /^accept$/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^decline$/i }).first()).toBeVisible()
  })

  test('Accept action calls PATCH and updates card status', async ({ page }) => {
    let patchCalled = false
    let patchBody: unknown = null

    await page.route('**/api/dashboard/interests/interest-1', (route) => {
      if (route.request().method() === 'PATCH') {
        patchCalled = true
        patchBody = JSON.parse(route.request().postData() ?? '{}') as unknown
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'interest-1',
            status: 'ACCEPTED',
            updatedAt: new Date().toISOString(),
          }),
        })
      } else {
        route.continue()
      }
    })

    await page.goto('/dashboard')
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }

    await page.getByRole('tab', { name: /interested buyers/i }).click()
    await page.getByText('Rahul Sharma').waitFor({ timeout: 8000 })

    await page
      .getByRole('button', { name: /^accept$/i })
      .first()
      .click()

    // Wait for the PATCH to fire and status to update
    await page.waitForResponse('**/api/dashboard/interests/interest-1')
    expect(patchCalled).toBe(true)
    expect((patchBody as { action?: string })?.action).toBe('ACCEPTED')

    // Card should now show Accepted badge
    const rahulCard = page.locator('.rounded-xl').filter({ hasText: 'Rahul Sharma' })
    await expect(rahulCard.getByText('Accepted')).toBeVisible({ timeout: 3000 })
  })

  test('buyers tab shows filter pills: All, Pending, Accepted, Declined', async ({ page }) => {
    await page.goto('/dashboard')
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }

    await page.getByRole('tab', { name: /interested buyers/i }).click()
    await page.waitForTimeout(500)

    await expect(page.getByRole('button', { name: /^all$/i }).first()).toBeVisible({
      timeout: 5000,
    })
    await expect(page.getByRole('button', { name: /^pending$/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^accepted$/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^declined$/i }).first()).toBeVisible()
  })

  test('buyers tab shows sort dropdown', async ({ page }) => {
    await page.goto('/dashboard')
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }

    await page.getByRole('tab', { name: /interested buyers/i }).click()
    await page.waitForTimeout(500)

    await expect(page.locator('select').filter({ hasText: /newest|oldest/i })).toBeVisible({
      timeout: 5000,
    })
  })
})

// ---------------------------------------------------------------------------
// Dashboard UI — empty state for buyers tab
// ---------------------------------------------------------------------------

test.describe('Dashboard — Interested Buyers empty state', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/dashboard/listings**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ listings: [], total: 0, page: 1, totalPages: 0 }),
      })
    })

    // Return empty interests list
    await page.route('**/api/dashboard/interests**', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ interests: [], total: 0, page: 1, totalPages: 0 }),
        })
      } else {
        route.continue()
      }
    })
  })

  test('shows empty state message when no buyer requests', async ({ page }) => {
    await page.goto('/dashboard')
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }

    await page.getByRole('tab', { name: /interested buyers/i }).click()
    await expect(
      page.getByText(/no buyer requests yet/i).or(page.getByText(/no pending requests/i)),
    ).toBeVisible({ timeout: 8000 })
  })
})

// ---------------------------------------------------------------------------
// Security: no buyer contact info in API response
// ---------------------------------------------------------------------------

test.describe('GET /api/dashboard/interests — no contact info leakage (API layer)', () => {
  test('response body does not leak buyer_id, email or phone when auth fails', async ({
    request,
  }) => {
    const response = await request.get('/api/dashboard/interests')
    // 401 means we can't even get data — that's the correct security posture
    expect(response.status()).toBe(401)
    const body = (await response.json()) as Record<string, unknown>
    expect(body).not.toHaveProperty('buyer_id')
    expect(body).not.toHaveProperty('email')
    expect(body).not.toHaveProperty('phone')
  })
})
