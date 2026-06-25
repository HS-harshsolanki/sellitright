import { test, expect } from '@playwright/test'

test.describe('Browse page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should show listing cards on the home page', async ({ page }) => {
    await expect(page.locator('article, [data-testid="listing-card"]').first()).toBeVisible({
      timeout: 5000,
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

  test('should show 404 for unknown listing id', async ({ page }) => {
    await page.goto('/listing/nonexistent-listing-id-xyz')
    await expect(page.getByRole('heading', { name: /not found/i }).or(page.getByText(/404/))).toBeVisible({
      timeout: 5000,
    })
  })
})
