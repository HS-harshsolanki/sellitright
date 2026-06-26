import { test, expect } from '@playwright/test'

test.describe('Browse page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should show listing cards on the home page', async ({ page }) => {
    // Cards are rendered as div > a[href^="/listing/"] — look for listing links
    await expect(page.locator('a[href^="/listing/"]').first()).toBeVisible({
      timeout: 8000,
    })
  })

  test('should show property count', async ({ page }) => {
    await expect(page.getByText(/\d+ propert/i)).toBeVisible()
  })

  test('should filter listings when search query is entered', async ({ page }) => {
    const search = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i))
    await search.fill('Mumbai')
    await page.waitForURL(/\?q=Mumbai/)
    await expect(page.getByText(/Mumbai/i).first()).toBeVisible()
  })

  test('should show No properties found on impossible search', async ({ page }) => {
    const search = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i))
    await search.fill('zzzzzzz_impossible_xyz_9999')
    await page.waitForURL(/\?q=/)
    await expect(page.getByText(/no properties found/i)).toBeVisible({ timeout: 5000 })
  })

  test('should show sort dropdown on click', async ({ page }) => {
    await page.getByRole('button', { name: /newest first/i }).click()
    await expect(page.getByRole('option', { name: /price: low to high/i })).toBeVisible()
  })

  test('should change sort order when selecting Price: Low to High', async ({ page }) => {
    await page.getByRole('button', { name: /newest first/i }).click()
    await page.getByRole('option', { name: /price: low to high/i }).click()
    await expect(page.getByRole('button', { name: /price: low to high/i })).toBeVisible()
  })
})

test.describe('Listing detail page', () => {
  test('should navigate to listing detail on card click', async ({ page }) => {
    await page.goto('/')
    await page.locator('a[href^="/listing/"]').first().click()
    await expect(page).toHaveURL(/\/listing\//, { timeout: 5000 })
  })

  test('should show price on listing detail page', async ({ page }) => {
    await page.goto('/')
    await page.locator('a[href^="/listing/"]').first().click()
    await expect(page.getByText(/₹/)).toBeVisible({ timeout: 5000 })
  })

  test('should show not found page for unknown listing id', async ({ page }) => {
    await page.goto('/listing/nonexistent-listing-id-xyz')
    // The not-found page renders h1 "Page not found"
    await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible({
      timeout: 5000,
    })
  })
})
