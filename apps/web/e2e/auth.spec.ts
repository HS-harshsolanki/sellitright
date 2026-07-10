import { test, expect } from '@playwright/test'

/**
 * Auth E2E tests.
 *
 * The login page uses Google OAuth only.
 * Full OAuth redirect cannot be E2E tested without a live Supabase project.
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
    await expect(page.getByRole('link', { name: /privacy policy/i })).toBeVisible()
  })

  test('Google sign-in button is enabled by default', async ({ page }) => {
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeEnabled()
  })

  test('should show the SellItRight logo/home link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /sellitright home/i })).toBeVisible()
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
   * redirect the browser to that external URL.  The middleware validates the
   * `next` param and falls back to "/" or "/dashboard" for anything that is
   * not a safe internal path.
   *
   * We test at the middleware level: after any redirect settles the final URL
   * must not contain the evil domain.
   */
  test('TC-A11: ?next=https://evil.com does not redirect to evil.com', async ({ page }) => {
    await page.goto('/login?next=https://evil.com')
    // Allow up to 5 s for redirects to settle
    await page
      .waitForURL((url) => !url.toString().includes('/login?next=https'), { timeout: 5000 })
      .catch(() => {
        /* still on login — that's fine */
      })
    const finalUrl = page.url()
    expect(finalUrl).not.toContain('evil.com')
  })

  test('TC-A12: ?next=//evil.com does not redirect to evil.com', async ({ page }) => {
    await page.goto('/login?next=//evil.com')
    await page
      .waitForURL((url) => !url.toString().includes('/login?next=%2F%2F'), { timeout: 5000 })
      .catch(() => {
        /* still on login — fine */
      })
    const finalUrl = page.url()
    expect(finalUrl).not.toContain('evil.com')
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
