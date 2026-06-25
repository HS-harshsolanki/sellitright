import { test, expect } from '@playwright/test'

/**
 * Auth E2E tests.
 *
 * Phone OTP tests are skipped — they require a live Supabase project
 * with Twilio SMS enabled. Run manually with SUPABASE_TEST_PHONE set.
 *
 * Google OAuth is tested for UI presence only — the full OAuth redirect
 * can only be tested in a Supabase-connected environment.
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

  test('should show phone number input', async ({ page }) => {
    await expect(page.getByLabel(/mobile number/i)).toBeVisible()
  })

  test('should disable Send OTP button when phone is fewer than 10 digits', async ({ page }) => {
    await page.getByLabel(/mobile number/i).fill('98765')
    await expect(page.getByRole('button', { name: /send otp/i })).toBeDisabled()
  })

  test('should enable Send OTP button when 10 digits entered', async ({ page }) => {
    await page.getByLabel(/mobile number/i).fill('9876543210')
    await expect(page.getByRole('button', { name: /send otp/i })).toBeEnabled()
  })

  test('should show OTP input after requesting OTP (mocked)', async ({ page }) => {
    // Mock the Supabase signInWithOtp call to succeed without SMS
    await page.route('**/auth/v1/otp', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify({}) })
    })

    await page.getByLabel(/mobile number/i).fill('9876543210')
    await page.getByRole('button', { name: /send otp/i }).click()

    await expect(page.getByLabel(/enter 6-digit otp/i)).toBeVisible({ timeout: 5000 })
  })

  test('should show change number link after requesting OTP (mocked)', async ({ page }) => {
    await page.route('**/auth/v1/otp', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify({}) })
    })

    await page.getByLabel(/mobile number/i).fill('9876543210')
    await page.getByRole('button', { name: /send otp/i }).click()

    await expect(page.getByRole('button', { name: /change number/i })).toBeVisible({ timeout: 5000 })
  })

  test('should navigate back to phone step when Change number is clicked', async ({ page }) => {
    await page.route('**/auth/v1/otp', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify({}) })
    })

    await page.getByLabel(/mobile number/i).fill('9876543210')
    await page.getByRole('button', { name: /send otp/i }).click()
    await page.getByRole('button', { name: /change number/i }).click({ timeout: 5000 })

    await expect(page.getByLabel(/mobile number/i)).toBeVisible()
  })

  test('should show error when Supabase OTP call fails', async ({ page }) => {
    await page.route('**/auth/v1/otp', (route) => {
      route.fulfill({
        status: 429,
        body: JSON.stringify({ error: 'rate_limit', message: 'Too many requests' }),
      })
    })

    await page.getByLabel(/mobile number/i).fill('9876543210')
    await page.getByRole('button', { name: /send otp/i }).click()

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
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
