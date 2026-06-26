import { test, expect } from '@playwright/test'

// The /api/listings route runs mapSupabaseListingToMock, so it returns the
// full MockListing shape (camelCase, images: [{id, url, caption, order}]).
// Tests that mock this API must return the same shape.
const MOCK_LISTINGS = [
  {
    id: 'test-listing-001',
    title: '2 BHK Apartment in Bandra West',
    description: 'A beautiful apartment',
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
    seller: { id: 'seller-1', name: 'Owner', phone: '', avatarUrl: null, isVerified: false },
    images: [],
    createdAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'test-listing-002',
    title: '3 BHK Villa in Koramangala',
    description: 'Spacious villa',
    price: 25000000,
    propertyType: 'VILLA',
    bhkType: 'THREE_BHK',
    builtUpArea: 1500,
    carpetArea: null,
    floor: null,
    totalFloors: null,
    facing: null,
    furnishing: 'FURNISHED',
    ageOfProperty: null,
    bathrooms: 3,
    balconies: 2,
    parking: null,
    address: 'Koramangala, Bengaluru',
    city: 'Bengaluru',
    locality: 'Koramangala',
    state: 'Karnataka',
    pincode: '560034',
    latitude: null,
    longitude: null,
    amenities: [],
    status: 'ACTIVE',
    isVerified: true,
    viewCount: 110,
    rejectionReason: null,
    seller: { id: 'seller-2', name: 'Owner', phone: '', avatarUrl: null, isVerified: false },
    images: [],
    createdAt: '2024-01-05T00:00:00Z',
  },
]

function mockListings(page: import('@playwright/test').Page, listings = MOCK_LISTINGS) {
  return page.route('**/api/listings**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ listings, total: listings.length, page: 1, totalPages: 1 }),
    })
  })
}

test.describe('Browse page', () => {
  test.beforeEach(async ({ page }) => {
    await mockListings(page)
    await page.goto('/')
  })

  test('should show listing cards on the home page', async ({ page }) => {
    await expect(page.locator('a[href^="/listing/"]').first()).toBeVisible({ timeout: 8000 })
  })

  test('should show property count', async ({ page }) => {
    await expect(page.getByText(/\d+ propert/i)).toBeVisible({ timeout: 8000 })
  })

  test('should filter listings when search query is entered', async ({ page }) => {
    const search = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i))
    await search.fill('Mumbai')
    await page.waitForURL(/\?q=Mumbai/)
    // With a q param, a new fetch fires — mock returns same data so just confirm URL changed
    await expect(page).toHaveURL(/\?q=Mumbai/)
  })

  test('should show No properties found on impossible search', async ({ page }) => {
    // Override to return empty for this test
    await page.route('**/api/listings**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ listings: [], total: 0, page: 1, totalPages: 0 }),
      })
    })
    const search = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i))
    await search.fill('zzzzzzz_impossible_xyz_9999')
    await page.waitForURL(/\?q=/)
    await expect(page.getByText(/no properties found/i)).toBeVisible({ timeout: 5000 })
  })

  test('should show sort dropdown on click', async ({ page }) => {
    await expect(page.locator('a[href^="/listing/"]').first()).toBeVisible({ timeout: 8000 })
    await page.getByRole('button', { name: /newest first/i }).click()
    await expect(page.getByRole('option', { name: /price: low to high/i })).toBeVisible()
  })

  test('should change sort order when selecting Price: Low to High', async ({ page }) => {
    await expect(page.locator('a[href^="/listing/"]').first()).toBeVisible({ timeout: 8000 })
    await page.getByRole('button', { name: /newest first/i }).click()
    await page.getByRole('option', { name: /price: low to high/i }).click()
    await expect(page.getByRole('button', { name: /price: low to high/i })).toBeVisible()
  })
})

test.describe('Listing detail page', () => {
  test.beforeEach(async ({ page }) => {
    await mockListings(page)
  })

  test('should navigate to listing detail on card click', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('a[href^="/listing/"]').first()).toBeVisible({ timeout: 8000 })
    await page.locator('a[href^="/listing/"]').first().click()
    await expect(page).toHaveURL(/\/listing\//, { timeout: 8000 })
  })

  test('should show price on listing detail page', async ({ page }) => {
    await page.goto('/listing/test-listing-001')
    await expect(page.getByText(/₹/).first()).toBeVisible({ timeout: 8000 })
  })

  test('should show not found page for unknown listing id', async ({ page }) => {
    await page.goto('/listing/nonexistent-listing-id-xyz')
    await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible({
      timeout: 5000,
    })
  })
})
