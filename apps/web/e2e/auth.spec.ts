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
