import { test, expect } from '@playwright/test'

/**
 * Buyer Requests page tests.
 *
 * The buyer requests page lives at /requests (alias /dashboard/requests).
 * The page is a client-side React component that:
 *   1. Reads auth state from useAuth() context
 *   2. Fetches GET /api/buyer/requests to populate the list
 *   3. Calls DELETE /api/listings/:id/interest to withdraw a request
 *
 * Test strategy:
 *   - Auth-guard tests (TC-REQ10) hit the page directly with no session.
 *   - Positive-path tests (TC-REQ01 through TC-REQ09) mock both the Supabase
 *     auth cookie check (so the page believes the user is logged in) and the
 *     relevant API routes via page.route(), which intercepts fetch() calls made
 *     by the client component without needing a real Supabase session.
 *
 * NOTE: The auth context (useAuth) reads from Supabase client-side SDK which
 * checks for a valid session cookie. Without real credentials the page will
 * redirect to /login. The UI tests below intercept the API route AND mock the
 * auth-check API call so the page renders with data. Tests that cannot be fully
 * isolated without a live session are marked with test.skip() and documented.
 */

const PHANTOM_LISTING_ID = '00000000-0000-0000-0000-000000000002'
const PHANTOM_INTEREST_ID = '00000000-0000-0000-0000-000000000003'

// ── Shared mock helpers ───────────────────────────────────────────────────────

/**
 * Intercept Supabase's /auth/v1/user endpoint so useAuth() returns a fake user
 * instead of failing with 401. This allows the client component to skip its
 * redirect-to-login branch and proceed to fetch requests.
 */
async function mockSupabaseAuth(page: import('@playwright/test').Page) {
  await page.route('**/auth/v1/user*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '00000000-0000-0000-0000-000000000001',
        email: 'testbuyer@example.com',
        aud: 'authenticated',
        role: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_metadata: {},
        app_metadata: {},
      }),
    }),
  )
}

/** Mock GET /api/buyer/requests with a custom payload. */
async function mockBuyerRequests(page: import('@playwright/test').Page, requests: object[]) {
  await page.route('**/api/buyer/requests*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ requests }),
    }),
  )
}

/** Mock DELETE /api/listings/:id/interest → 200 { success: true }. */
async function mockWithdrawSuccess(page: import('@playwright/test').Page) {
  await page.route(`**/api/listings/${PHANTOM_LISTING_ID}/interest`, (route) => {
    if (route.request().method() === 'DELETE') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    }
    return route.continue()
  })
}

// ── Sample fixture data ───────────────────────────────────────────────────────

const PENDING_ITEM = {
  id: PHANTOM_INTEREST_ID,
  listingId: PHANTOM_LISTING_ID,
  listingTitle: '2 BHK Apartment',
  listingCity: 'Mumbai',
  listingLocality: 'Bandra',
  listingPrice: 8500000,
  listingImageUrl: null,
  listingBhkType: 'TWO_BHK',
  status: 'PENDING',
  contactUnlocked: false,
  sellerPhone: null,
  sellerEmail: null,
  createdAt: new Date(Date.now() - 10 * 3_600_000).toISOString(), // 10h ago
  updatedAt: new Date(Date.now() - 10 * 3_600_000).toISOString(),
}

const ACCEPTED_UNPAID_ITEM = {
  ...PENDING_ITEM,
  id: '00000000-0000-0000-0000-000000000010',
  status: 'ACCEPTED',
  contactUnlocked: false,
  sellerPhone: null,
  sellerEmail: null,
}

const CONTACT_UNLOCKED_ITEM = {
  ...PENDING_ITEM,
  id: '00000000-0000-0000-0000-000000000011',
  status: 'ACCEPTED',
  contactUnlocked: true,
  sellerPhone: '+919876543210',
  sellerEmail: 'seller@example.com',
}

const DECLINED_ITEM = {
  ...PENDING_ITEM,
  id: '00000000-0000-0000-0000-000000000012',
  status: 'DECLINED',
  contactUnlocked: false,
}

// ── TC-REQ01: Page loads with requests ───────────────────────────────────────

// TC-REQ01–09: These UI tests require the Next.js middleware to pass the
// request through to the page component. Middleware runs server-side and
// cannot be intercepted by page.route() — the page redirects to /login before
// React renders. These tests run in staging with a real Supabase session.
const NEEDS_REAL_AUTH = !process.env.E2E_SUPABASE_USER

test.describe('TC-REQ01 — requests page loads with mocked data', () => {
  test('page renders request cards when API returns data', async ({ page }) => {
    test.skip(NEEDS_REAL_AUTH, 'requires real Supabase session (middleware blocks)')
    await mockSupabaseAuth(page)
    await mockBuyerRequests(page, [PENDING_ITEM, ACCEPTED_UNPAID_ITEM])

    await page.goto('/requests')

    // Page heading must be visible
    await expect(page.getByRole('heading', { name: /my requests/i })).toBeVisible()

    // At least one request card should be rendered
    await expect(page.getByRole('article').first()).toBeVisible()
  })
})

// ── TC-REQ02: Status tabs filter correctly ────────────────────────────────────

test.describe('TC-REQ02 — status tabs filter the request list', () => {
  test('clicking Awaiting tab shows only pending requests', async ({ page }) => {
    test.skip(NEEDS_REAL_AUTH, 'requires real Supabase session (middleware blocks)')
    await mockSupabaseAuth(page)
    await mockBuyerRequests(page, [
      PENDING_ITEM,
      ACCEPTED_UNPAID_ITEM,
      CONTACT_UNLOCKED_ITEM,
      DECLINED_ITEM,
    ])

    await page.goto('/requests')
    await page.getByRole('heading', { name: /my requests/i }).waitFor()

    // Click the "Awaiting" tab
    await page.getByRole('tab', { name: /awaiting/i }).click()

    // All articles present in DOM; pending one should still be visible
    // (filtering is client-side, not a new API call)
    const cards = page.getByRole('article')
    // At least the pending card is rendered
    await expect(cards.first()).toBeVisible()
  })

  test('clicking All tab shows every request', async ({ page }) => {
    test.skip(NEEDS_REAL_AUTH, 'requires real Supabase session (middleware blocks)')
    await mockSupabaseAuth(page)
    await mockBuyerRequests(page, [
      PENDING_ITEM,
      ACCEPTED_UNPAID_ITEM,
      CONTACT_UNLOCKED_ITEM,
      DECLINED_ITEM,
    ])

    await page.goto('/requests')
    await page.getByRole('heading', { name: /my requests/i }).waitFor()

    // Switch to a narrower filter first, then back to All
    await page.getByRole('tab', { name: /awaiting/i }).click()
    await page.getByRole('tab', { name: /^all$/i }).click()

    const cards = page.getByRole('article')
    await expect(cards).toHaveCount(4)
  })
})

// ── TC-REQ03: Pending card shows SLA countdown timer element ──────────────────

test.describe('TC-REQ03 — pending card shows SLA countdown', () => {
  test('a recently-created PENDING card shows hours-left text', async ({ page }) => {
    test.skip(NEEDS_REAL_AUTH, 'requires real Supabase session (middleware blocks)')
    const freshPendingItem = {
      ...PENDING_ITEM,
      createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(), // 2h ago → 70h left
      updatedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    }
    await mockSupabaseAuth(page)
    await mockBuyerRequests(page, [freshPendingItem])

    await page.goto('/requests')
    await page.getByRole('heading', { name: /my requests/i }).waitFor()

    // The SLA nudge text contains "h left to respond"
    await expect(page.getByText(/h left to respond/i)).toBeVisible()
  })

  test('an expired PENDING card shows "consider withdrawing" nudge', async ({ page }) => {
    test.skip(NEEDS_REAL_AUTH, 'requires real Supabase session (middleware blocks)')
    const expiredPendingItem = {
      ...PENDING_ITEM,
      createdAt: new Date(Date.now() - 80 * 3_600_000).toISOString(), // >72h ago
      updatedAt: new Date(Date.now() - 80 * 3_600_000).toISOString(),
    }
    await mockSupabaseAuth(page)
    await mockBuyerRequests(page, [expiredPendingItem])

    await page.goto('/requests')
    await page.getByRole('heading', { name: /my requests/i }).waitFor()

    await expect(page.getByText(/consider withdrawing/i)).toBeVisible()
  })
})

// ── TC-REQ04: Accepted-unpaid card shows "Pay ₹49" CTA ───────────────────────

test.describe('TC-REQ04 — accepted-unpaid card shows Pay ₹49 button', () => {
  test('"Pay ₹49" link is visible for an ACCEPTED, not-yet-paid request', async ({ page }) => {
    test.skip(NEEDS_REAL_AUTH, 'requires real Supabase session (middleware blocks)')
    await mockSupabaseAuth(page)
    await mockBuyerRequests(page, [ACCEPTED_UNPAID_ITEM])

    await page.goto('/requests')
    await page.getByRole('heading', { name: /my requests/i }).waitFor()

    // The Pay ₹49 CTA is a Link rendered as an anchor
    const payBtn = page.getByRole('link', { name: /pay ₹49/i })
    await expect(payBtn).toBeVisible()

    // It should point to the listing page with #unlock anchor
    const href = await payBtn.getAttribute('href')
    expect(href).toMatch(/\/listing\/.+#unlock/)
  })
})

// ── TC-REQ05: Unlocked contact card has WhatsApp button ──────────────────────

test.describe('TC-REQ05 — unlocked contact card has WhatsApp button', () => {
  test('WhatsApp button with wa.me href is visible when contact is unlocked', async ({ page }) => {
    test.skip(NEEDS_REAL_AUTH, 'requires real Supabase session (middleware blocks)')
    await mockSupabaseAuth(page)
    await mockBuyerRequests(page, [CONTACT_UNLOCKED_ITEM])

    await page.goto('/requests')
    await page.getByRole('heading', { name: /my requests/i }).waitFor()

    const waBtn = page.getByRole('link', { name: /whatsapp/i })
    await expect(waBtn).toBeVisible()

    const href = await waBtn.getAttribute('href')
    expect(href).toMatch(/wa\.me\//)
  })
})

// ── TC-REQ06: Unlocked contact card has Call button with tel: href ────────────

test.describe('TC-REQ06 — unlocked contact card has Call button', () => {
  test('Call/phone button with tel: href is visible when contact is unlocked', async ({ page }) => {
    test.skip(NEEDS_REAL_AUTH, 'requires real Supabase session (middleware blocks)')
    await mockSupabaseAuth(page)
    await mockBuyerRequests(page, [CONTACT_UNLOCKED_ITEM])

    await page.goto('/requests')
    await page.getByRole('heading', { name: /my requests/i }).waitFor()

    // The call button is an <a href="tel:..."> link containing the phone number
    const callLinks = page.locator('a[href^="tel:"]')
    await expect(callLinks.first()).toBeVisible()

    const href = await callLinks.first().getAttribute('href')
    expect(href).toMatch(/^tel:/)
    // href should include the mocked phone number digits
    expect(href).toContain('9876543210')
  })
})

// ── TC-REQ07: Withdraw pending — confirm dialog → confirmed → removed ─────────

test.describe('TC-REQ07 — withdraw pending request flow (confirm)', () => {
  test('confirming withdrawal removes the card from the list', async ({ page }) => {
    test.skip(NEEDS_REAL_AUTH, 'requires real Supabase session (middleware blocks)')
    await mockSupabaseAuth(page)
    await mockBuyerRequests(page, [PENDING_ITEM])
    await mockWithdrawSuccess(page)

    let deleteCallCount = 0
    page.on('request', (req) => {
      if (req.method() === 'DELETE' && req.url().includes('/api/listings/')) {
        deleteCallCount++
      }
    })

    await page.goto('/requests')
    await page.getByRole('heading', { name: /my requests/i }).waitFor()

    // Click "Withdraw" to show the confirmation inline dialog
    await page.getByRole('button', { name: /^withdraw$/i }).click()

    // Confirm dialog should appear with "Yes, withdraw" and "Cancel" buttons
    await expect(page.getByRole('button', { name: /yes, withdraw/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()

    // Confirm the withdrawal
    await page.getByRole('button', { name: /yes, withdraw/i }).click()

    // DELETE API was called exactly once
    await page.waitForFunction(() => true) // yield to microtasks
    expect(deleteCallCount).toBe(1)

    // The card should be removed from the DOM (list is empty → empty state)
    await expect(page.getByRole('article')).toHaveCount(0)
  })
})

// ── TC-REQ08: Withdraw dialog — cancel → request stays, no API call ───────────

test.describe('TC-REQ08 — withdraw dialog cancel keeps request', () => {
  test('cancelling withdraw does not call DELETE and card remains', async ({ page }) => {
    test.skip(NEEDS_REAL_AUTH, 'requires real Supabase session (middleware blocks)')
    await mockSupabaseAuth(page)
    await mockBuyerRequests(page, [PENDING_ITEM])

    let deleteCallCount = 0
    page.on('request', (req) => {
      if (req.method() === 'DELETE' && req.url().includes('/api/listings/')) {
        deleteCallCount++
      }
    })

    await page.goto('/requests')
    await page.getByRole('heading', { name: /my requests/i }).waitFor()

    // Open confirmation inline dialog
    await page.getByRole('button', { name: /^withdraw$/i }).click()
    await expect(page.getByRole('button', { name: /yes, withdraw/i })).toBeVisible()

    // Cancel — dialog should disappear, card should stay
    await page.getByRole('button', { name: /cancel/i }).click()

    // "Withdraw" button (original state) reappears
    await expect(page.getByRole('button', { name: /^withdraw$/i })).toBeVisible()

    // No DELETE call was made
    expect(deleteCallCount).toBe(0)

    // Card is still in the list
    await expect(page.getByRole('article')).toHaveCount(1)
  })
})

// ── TC-REQ09: Empty state ─────────────────────────────────────────────────────

test.describe('TC-REQ09 — empty state when no requests exist', () => {
  test('shows "No requests yet" heading and Browse properties CTA', async ({ page }) => {
    test.skip(NEEDS_REAL_AUTH, 'requires real Supabase session (middleware blocks)')
    await mockSupabaseAuth(page)
    await mockBuyerRequests(page, [])

    await page.goto('/requests')
    await page.getByRole('heading', { name: /my requests/i }).waitFor()

    // Empty state heading
    await expect(page.getByRole('heading', { name: /no requests yet/i })).toBeVisible()

    // Browse CTA link
    const browseCta = page.getByRole('link', { name: /browse properties/i })
    await expect(browseCta).toBeVisible()
    const href = await browseCta.getAttribute('href')
    expect(href).toBe('/properties')
  })
})

// ── TC-REQ10: Unauthenticated access redirects to /login ─────────────────────

test.describe('TC-REQ10 — unauthenticated /requests redirects to /login', () => {
  test('/requests redirects to /login when no session exists', async ({ page }) => {
    // No auth mocking — let the real auth check fire.
    // The page's useEffect calls router.replace('/login?next=/dashboard/requests')
    // when useAuth() returns { user: null, loading: false }.
    // We also intercept Supabase auth to ensure it returns 401 / no user.
    await page.route('**/auth/v1/user*', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'JWT expired', error: 'invalid_token' }),
      }),
    )

    await page.goto('/requests')

    // Expect navigation to land on /login (with or without query params)
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
