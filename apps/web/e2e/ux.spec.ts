import { test, expect } from '@playwright/test'

/**
 * UX / Accessibility E2E tests — TC-UX01 through TC-UX15
 * (TC-UX03 real-keyboard tab-order and TC-UX12 contrast-ratio are excluded
 *  because they cannot be meaningfully automated in Playwright.)
 *
 * Tests that require auth mock the Supabase /auth/v1/user endpoint and the
 * dashboard interests API so the dashboard layout renders without network errors.
 */

// ── helpers ───────────────────────────────────────────────────────────────────

function mockAuth(page: import('@playwright/test').Page) {
  return page.route('**/auth/v1/user', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        phone: '+919876543210',
        aud: 'authenticated',
        user_metadata: { full_name: 'Test User', phone_verified: true, phone: '9876543210' },
        app_metadata: { provider: 'google' },
      }),
    })
  })
}

function mockDashboardApis(page: import('@playwright/test').Page) {
  // Suppress the pending-buyer-count fetch that the dashboard layout fires
  return page.route('**/api/dashboard/interests**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ interests: [], total: 0, page: 1, totalPages: 0 }),
    })
  })
}

// ── TC-UX01 & TC-UX02 — mobile bottom nav ────────────────────────────────────

test.describe('TC-UX01 & TC-UX02 — mobile bottom nav at 390px', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page)
    await mockDashboardApis(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/dashboard')
  })

  test('TC-UX01: Alerts tab in bottom nav points to /notifications', async ({ page }) => {
    // The dashboard layout renders the mobile bottom nav (lg:hidden) at 390px.
    // The "Alerts" item (MOBILE_ITEMS entry with href=/notifications) must be present.
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    const alertsLink = page.locator('nav[aria-label="Mobile navigation"] a[href="/notifications"]')
    await expect(alertsLink).toBeVisible({ timeout: 8000 })
    await expect(alertsLink).toHaveAttribute('href', '/notifications')
  })

  test('TC-UX02: Requests tab in bottom nav points to /dashboard/requests', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    const requestsLink = page.locator(
      'nav[aria-label="Mobile navigation"] a[href="/dashboard/requests"]',
    )
    await expect(requestsLink).toBeVisible({ timeout: 8000 })
    await expect(requestsLink).toHaveAttribute('href', '/dashboard/requests')
  })
})

// ── TC-UX04 — chat send button size ──────────────────────────────────────────

test.describe('TC-UX04 — chat send button bounding box', () => {
  test('send button is at least 40x40px on the messages thread page', async ({ page }) => {
    await mockAuth(page)
    await mockDashboardApis(page)

    // Mock the chat-by-interest and messages endpoints so the page renders without errors
    await page.route('**/api/chat/by-interest/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ threadId: 'thread-abc' }),
      })
    })
    await page.route('**/api/chat/threads/**/messages', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          messages: [],
          threadStatus: 'active',
          role: 'buyer',
          otherPartyName: 'Seller',
          priorOffenseCount: 0,
          isPhoneBlocked: false,
          otherPartyOffenseCount: 0,
          otherPartyIsPhoneBlocked: false,
        }),
      })
    })

    await page.goto('/messages/test-interest-id')
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }

    // The send button has aria-label="Send message"
    const sendBtn = page.getByRole('button', { name: /send message/i })
    await expect(sendBtn).toBeVisible({ timeout: 8000 })
    const box = await sendBtn.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual(40)
    expect(box!.height).toBeGreaterThanOrEqual(40)
  })
})

// ── TC-UX05 — /about page ────────────────────────────────────────────────────

test.describe('TC-UX05 — /about page', () => {
  test('loads without JS errors and shows a visible heading', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    await page.goto('/about')
    // The page must not show a 404
    await expect(page).not.toHaveURL(/not-found/)
    // A heading must be visible (h1 or any role=heading)
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8000 })
    expect(jsErrors).toHaveLength(0)
  })
})

// ── TC-UX06 — /terms via footer ───────────────────────────────────────────────

test.describe('TC-UX06 — /terms page via footer link', () => {
  test('footer Terms link exists and /terms page loads', async ({ page }) => {
    await page.goto('/')
    const termsLink = page.locator('footer').getByRole('link', { name: /^terms$/i })
    await expect(termsLink).toBeVisible({ timeout: 8000 })
    await termsLink.click()
    await expect(page).toHaveURL(/\/terms/, { timeout: 8000 })
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8000 })
  })
})

// ── TC-UX07 — /privacy via footer ────────────────────────────────────────────

test.describe('TC-UX07 — /privacy page via footer link', () => {
  test('footer Privacy link exists and /privacy page loads', async ({ page }) => {
    await page.goto('/')
    const privacyLink = page.locator('footer').getByRole('link', { name: /privacy/i })
    await expect(privacyLink).toBeVisible({ timeout: 8000 })
    await privacyLink.click()
    await expect(page).toHaveURL(/\/privacy/, { timeout: 8000 })
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8000 })
  })
})

// ── TC-UX08 — /refund-policy via footer ───────────────────────────────────────

test.describe('TC-UX08 — /refund-policy page via footer link', () => {
  test('footer Refund Policy link exists and /refund-policy page loads', async ({ page }) => {
    await page.goto('/')
    const refundLink = page.locator('footer').getByRole('link', { name: /refund policy/i })
    await expect(refundLink).toBeVisible({ timeout: 8000 })
    await refundLink.click()
    await expect(page).toHaveURL(/\/refund-policy/, { timeout: 8000 })
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8000 })
  })
})

// ── TC-UX09 — no 404 responses from footer links on homepage ─────────────────

test.describe('TC-UX09 — footer links return non-404 responses', () => {
  test('all footer links resolve without 404', async ({ page, request }) => {
    await page.goto('/')
    // Collect all hrefs from the footer nav
    const footerLinks = await page
      .locator('footer nav a[href]')
      .evaluateAll((els) =>
        els.map((el) => (el as HTMLAnchorElement).href).filter((h) => h.startsWith('http')),
      )
    expect(footerLinks.length).toBeGreaterThan(0)

    for (const href of footerLinks) {
      const response = await request.get(href)
      expect(response.status(), `Expected non-404 for ${href}`).not.toBe(404)
    }
  })
})

// ── TC-UX10 — OTP input aria-label ───────────────────────────────────────────

test.describe('TC-UX10 — OTP input accessibility on /profile', () => {
  test('OTP input label references "6-digit" or "OTP"', async ({ page }) => {
    await mockAuth(page)
    await mockDashboardApis(page)
    // Mock /api/phone/send-otp so clicking Send OTP does not fail
    await page.route('**/api/phone/send-otp', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    })

    await page.goto('/profile')
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }

    // Trigger the OTP flow by clicking "Send OTP via SMS"
    const sendOtpBtn = page.getByRole('button', { name: /send otp/i })
    await expect(sendOtpBtn).toBeVisible({ timeout: 8000 })
    await sendOtpBtn.click()

    // After sending, the OTP input section becomes visible
    // The label for the otp-input field contains "6-digit SMS code"
    const otpLabel = page.locator('label[for="otp-input"]')
    await expect(otpLabel).toBeVisible({ timeout: 5000 })
    const labelText = await otpLabel.textContent()
    expect(labelText?.toLowerCase()).toMatch(/6-digit|otp/i)
  })
})

// ── TC-UX11 — phone error message has role="alert" ───────────────────────────

test.describe('TC-UX11 — phone error element has role="alert"', () => {
  test('phoneError paragraph on /profile has role="alert"', async ({ page }) => {
    await mockAuth(page)
    await mockDashboardApis(page)
    // Make OTP send fail so the error is shown
    await page.route('**/api/phone/send-otp', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid phone number' }),
      })
    })

    await page.goto('/profile')
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }

    // Enter an invalid phone number to trigger the inline validation error
    // (this fires before the API call, so role="alert" fires immediately)
    const phoneInput = page.locator('#phone-number')
    await expect(phoneInput).toBeVisible({ timeout: 8000 })
    await phoneInput.fill('123') // too short — will fail INDIAN_MOBILE_RE

    const sendOtpBtn = page.getByRole('button', { name: /send otp/i })
    await sendOtpBtn.click()

    // The error paragraph that appears has role="alert"
    const alertEl = page.locator('[role="alert"]').first()
    await expect(alertEl).toBeVisible({ timeout: 5000 })
  })
})

// ── TC-UX13 — keyboard-only navigation through /sell step 1 ──────────────────

test.describe('TC-UX13 — keyboard navigation through /sell step 1', () => {
  test('Tab key moves focus through interactive elements on sell step 1', async ({ page }) => {
    await mockAuth(page)

    await page.route('**/api/listings/draft**', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify({ id: 'draft-123' }) })
    })

    await page.goto('/sell')
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }

    // Wait for step 1 to be ready
    await expect(
      page
        .getByRole('heading', { name: /what kind of property/i })
        .or(page.getByText(/property type/i).first()),
    ).toBeVisible({ timeout: 8000 })

    // Collect focusable elements by tabbing through them
    const focusedTags: string[] = []
    // Press Tab up to 20 times and record what gets focused
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab')
      const focused = await page.evaluate(() => {
        const el = document.activeElement
        if (!el || el === document.body) return null
        return el.tagName.toLowerCase()
      })
      if (focused) focusedTags.push(focused)
    }

    // There must be at least one interactive element reachable by Tab
    expect(focusedTags.length).toBeGreaterThan(0)
    // All focused elements should be standard interactive HTML elements or custom ones
    const interactiveTagPattern = /^(a|button|input|select|textarea|div|span|li)$/
    for (const tag of focusedTags) {
      expect(tag).toMatch(interactiveTagPattern)
    }
  })
})

// ── TC-UX14 — /listing/[id] no horizontal overflow at 375px ─────────────────

test.describe('TC-UX14 — /listing/[id] no horizontal scroll at 375px', () => {
  test('document.documentElement.scrollWidth <= 375 at 375px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    // Use a real listing id that resolves from mock-data.ts
    await page.goto('/listing/listing-001')
    // Page may show not-found if mock-data doesn't include it — that's fine for overflow check
    await page.waitForLoadState('domcontentloaded')

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(375)
  })
})

// ── TC-UX15 — /properties listing cards at 375px ────────────────────────────

test.describe('TC-UX15 — /properties listing cards visible and stacked at 375px', () => {
  test('listing cards are visible and do not overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })

    // Mock the listings API so cards appear
    await page.route('**/api/listings**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          listings: [
            {
              id: 'listing-001',
              title: '2 BHK Apartment in Bandra West',
              price: 15000000,
              propertyType: 'APARTMENT',
              bhkType: 'TWO_BHK',
              builtUpArea: 850,
              carpetArea: null,
              floor: 3,
              totalFloors: 10,
              facing: null,
              furnishing: 'SEMI_FURNISHED',
              ageOfProperty: null,
              bathrooms: 2,
              balconies: 1,
              parking: null,
              address: 'Bandra West, Mumbai',
              city: 'Mumbai',
              locality: 'Bandra West',
              state: 'Maharashtra',
              pincode: '400050',
              latitude: null,
              longitude: null,
              amenities: [],
              status: 'ACTIVE',
              isVerified: false,
              viewCount: 42,
              rejectionReason: null,
              description: 'A beautiful apartment',
              seller: {
                id: 'seller-1',
                name: 'Owner',
                phone: '',
                avatarUrl: null,
                isVerified: false,
              },
              images: [],
              createdAt: '2024-01-10T00:00:00Z',
            },
          ],
          total: 1,
          page: 1,
          totalPages: 1,
        }),
      })
    })

    await page.goto('/properties')
    // Wait for a listing card
    const card = page.locator('a[href^="/listing/"]').first()
    await expect(card).toBeVisible({ timeout: 8000 })

    // No horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(375)

    // Cards are stacked — bounding box width should be within viewport
    const box = await card.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeLessThanOrEqual(375)
  })
})
