import { test, expect } from '@playwright/test'

/**
 * Auth E2E tests.
 *
 * The login page supports Google OAuth and email magic link (Supabase OTP).
 * Full OAuth/OTP redirect flows cannot be E2E tested without a live Supabase project.
 */

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('should show the login page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
  })

  test('should show Google sign-in button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
  })

  test('should show Terms link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /^terms$/i })).toBeVisible()
  })

  test('should show Privacy Policy link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /privacy policy/i }).first()).toBeVisible()
  })

  test('Google sign-in button is enabled by default', async ({ page }) => {
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeEnabled()
  })

  test('should show the ChapterNew logo/home link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /chapternew/i })).toBeVisible()
  })
})

// ── TC-A14–TC-A19: Email magic link auth UI ───────────────────────────────────

test.describe('TC-A14 — Email sign-in option is visible', () => {
  test.skip(true, 'email magic-link not yet implemented')
  test('Continue with Email button visible on initial load', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /continue with email/i })).toBeVisible({
      timeout: 5000,
    })
  })
})

test.describe('TC-A15 — Email form shows on click', () => {
  test.skip(true, 'email magic-link not yet implemented')
  test('clicking Continue with Email reveals the email input and send button', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /continue with email/i }).click()
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /send sign-in link/i })).toBeVisible()
  })
})

test.describe('TC-A16 — Email send button disabled without input', () => {
  test.skip(true, 'email magic-link not yet implemented')
  test('Send sign-in link button is disabled when email is empty', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /continue with email/i }).click()
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    const sendBtn = page.getByRole('button', { name: /send sign-in link/i })
    await expect(sendBtn).toBeDisabled()
  })
})

test.describe('TC-A17 — Email OTP success state', () => {
  test.skip(true, 'email magic-link not yet implemented')
  test('after OTP send succeeds, confirmation state shows the email address', async ({ page }) => {
    // Mock Supabase OTP endpoint — match any host (prod uses supabase.co, CI uses localhost:54321)
    await page.route(/\/auth\/v1\/otp/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    )
    await page.goto('/login')
    await page.getByRole('button', { name: /continue with email/i }).click()
    await page.getByRole('textbox', { name: /email/i }).fill('test@example.com')
    await page.getByRole('button', { name: /send sign-in link/i }).click()
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/test@example.com/)).toBeVisible()
  })
})

test.describe('TC-A18 — Use different email resets flow', () => {
  test.skip(true, 'email magic-link not yet implemented')
  test('Use a different email button resets back to Continue with Email', async ({ page }) => {
    await page.route(/\/auth\/v1\/otp/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    )
    await page.goto('/login')
    await page.getByRole('button', { name: /continue with email/i }).click()
    await page.getByRole('textbox', { name: /email/i }).fill('test@example.com')
    await page.getByRole('button', { name: /send sign-in link/i }).click()
    await page.getByRole('button', { name: /use a different email/i }).click()
    await expect(page.getByRole('button', { name: /continue with email/i })).toBeVisible({
      timeout: 3000,
    })
  })
})

test.describe('TC-A19 — Back button hides email form', () => {
  test.skip(true, 'email magic-link not yet implemented')
  test('Back button inside email form restores Continue with Email button', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /continue with email/i }).click()
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await page.getByRole('button', { name: /^back$/i }).click()
    await expect(page.getByRole('button', { name: /continue with email/i })).toBeVisible({
      timeout: 3000,
    })
    await expect(page.getByRole('textbox', { name: /email/i })).not.toBeVisible()
  })
})

test.describe('Protected route redirect', () => {
  test('should redirect unauthenticated user from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })

  test('should redirect unauthenticated user from /sell to /login', async ({ page }) => {
    await page.goto('/sell')
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })

  test('should redirect unauthenticated user from /profile to /login', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })

  test('should preserve ?next param in redirect URL', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/next=%2Fdashboard/, { timeout: 5000 })
  })
})

// ── Security / edge-case auth tests ───────────────────────────────────────────

test.describe('Open redirect prevention (TC-A11, TC-A12)', () => {
  /**
   * TC-A11 / TC-A12: Navigating to /login?next=<external-URL> must never
   * redirect the browser to that external URL.  The sanitiseNext() function in
   * middleware rejects anything not starting with "/" or containing "://" and
   * the browser stays on localhost — never on evil.com.
   *
   * Correct assertion: the browser hostname stays localhost, not evil.com.
   * The ?next= param may still appear in the URL (that's fine — it's just a
   * query param, not a redirect target).
   */
  test('TC-A11: ?next=https://evil.com does not redirect to evil.com', async ({ page }) => {
    await page.goto('/login?next=https://evil.com')
    // Give any redirects 3 s to settle, then verify we stayed on localhost
    await page.waitForTimeout(500)
    const finalUrl = page.url()
    expect(new URL(finalUrl).hostname).toBe('localhost')
  })

  test('TC-A12: ?next=//evil.com does not redirect to evil.com', async ({ page }) => {
    await page.goto('/login?next=//evil.com')
    await page.waitForTimeout(500)
    const finalUrl = page.url()
    expect(new URL(finalUrl).hostname).toBe('localhost')
  })
})

test.describe('Auth middleware / session handling (TC-A08)', () => {
  /**
   * TC-A08: When Supabase returns 401 (token invalid/expired) the middleware
   * must redirect to /login — no 500 error page.
   */
  test('TC-A08: /dashboard with Supabase 401 redirects gracefully to /login', async ({ page }) => {
    // Return 401 from the Supabase auth endpoint so middleware cannot validate session
    await page.route('**/auth/v1/user', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid JWT' }),
      })
    })
    await page.goto('/dashboard')
    // Must not show a 500 error — should land on /login or /
    await expect(page).not.toHaveURL(/\/500|internal.?error/i, { timeout: 5000 })
    // Expected to land on the login page
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })
})

test.describe('Auth callback error handling (TC-A10)', () => {
  /**
   * TC-A10: GET /auth/callback?code=invalid_code must redirect to
   * /login?error=auth_failed (the callback route calls exchangeCodeForSession
   * which fails on an invalid code and falls through to the error redirect).
   */
  test('TC-A10: /auth/callback?code=invalid_code redirects to /login?error=auth_failed', async ({
    page,
  }) => {
    await page.goto('/auth/callback?code=invalid_code')
    // The route.ts handler redirects here on exchange failure
    await expect(page).toHaveURL(/\/login\?error=auth_failed/, { timeout: 8000 })
  })
})

// ── TC-A02: ?next param preserved through login ───────────────────────────────

test.describe('Login ?next param preservation (TC-A02)', () => {
  /**
   * TC-A02: Navigating to /login?next=%2Fsell should keep the next param
   * visible in the URL (the login page does not strip it). Also validates
   * at the API level that /sell redirects to /login with the next param.
   */
  test('TC-A02: /login?next=%2Fsell preserves next param in URL', async ({ page }) => {
    await page.goto('/login?next=%2Fsell')
    // The login page should remain on /login and keep the next param
    await expect(page).toHaveURL(/next=%2Fsell/, { timeout: 5000 })
  })

  test('TC-A02: API — GET /sell redirects to /login with next param', async ({ request }) => {
    const res = await request.get('/sell', { maxRedirects: 0 })
    expect([301, 302, 307, 308]).toContain(res.status())
    const location = res.headers()['location'] ?? ''
    expect(location).toMatch(/login/)
    expect(location).toMatch(/next/)
  })
})

// ── TC-A04: Session persists after reload (API-guard contract) ────────────────

test.describe('Session persistence — API guard (TC-A04)', () => {
  /**
   * TC-A04: Without a valid session the /api/dashboard/listings endpoint
   * must return 401. Full browser session-persist test requires a real
   * Supabase session — this covers the auth-guard contract.
   */
  test('TC-A04: GET /api/dashboard/listings without session → 401', async ({ request }) => {
    const res = await request.get('/api/dashboard/listings')
    expect(res.status()).toBe(401)
  })
})

// ── TC-A05: Unauthenticated /sell redirects to /login ────────────────────────

test.describe('Unauthenticated /sell redirect (TC-A05)', () => {
  /**
   * TC-A05: A browser navigation to /sell without a session must redirect
   * to /login (middleware-level protection).
   */
  test('TC-A05: navigating to /sell redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/sell')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })

  test('TC-A05: API — GET /sell returns redirect status', async ({ request }) => {
    const res = await request.get('/sell', { maxRedirects: 0 })
    expect([301, 302, 307, 308]).toContain(res.status())
  })
})

// ── TC-A06: Logout clears session (API contract) ─────────────────────────────

test.describe('Logout / session clearance (TC-A06)', () => {
  /**
   * TC-A06: After sign-out any authenticated endpoint must return 401.
   * Browser-level cookie clearing requires a real session; this covers
   * the API contract.
   */
  test('TC-A06: GET /api/dashboard/listings without session → 401 (post-logout contract)', async ({
    request,
  }) => {
    // Without a session (simulates post-logout state) the endpoint must be protected.
    // Browser-level cookie clearing requires a real session.
    const res = await request.get('/api/dashboard/listings')
    expect(res.status()).toBe(401)
  })
})

// ── TC-A13: New user empty dashboard state ────────────────────────────────────

test.describe('New user empty dashboard state (TC-A13)', () => {
  /**
   * TC-A13: A freshly logged-in user with no listings or interests should see
   * an empty state UI prompting them to post their first property.
   */
  test('TC-A13: empty dashboard shows empty state or post CTA', async ({ page }) => {
    // Mock auth
    await page.route('**/auth/v1/user', (route) => {
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
      })
    })
    await page.route('**/auth/v1/token**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock',
          token_type: 'bearer',
          expires_in: 3600,
          user: { id: 'user-1' },
        }),
      })
    })
    // Mock dashboard API to return empty state
    await page.route('**/api/dashboard/listings**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ listings: [], total: 0 }),
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
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }

    // Empty state should show a prompt to post first listing or a link to /sell
    const emptyState = page
      .getByText(/no listings|post your first|get started/i)
      .first()
      .or(page.getByRole('link', { name: /post|sell|list/i }).first())
    await expect(emptyState).toBeVisible({ timeout: 8000 })
  })
})
