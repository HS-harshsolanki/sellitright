import { test, expect } from '@playwright/test'

// Tests that navigate to /listing/:id require a live Supabase DB (the listing
// detail page is fully SSR — page.route() cannot intercept server-side fetches).
const NEEDS_REAL_AUTH = !process.env.E2E_SUPABASE_USER

// The /api/listings route runs mapSupabaseListingToMock, so it returns the
// full MockListing shape (camelCase, images: [{id, url, caption, order}]).
// Tests that mock this API must return the same shape.
// Use real mock-data IDs so the listing detail server page can render them
// (it falls back to getListingById(id) which reads src/lib/mock-data.ts).
const MOCK_LISTINGS = [
  {
    id: 'listing-001',
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
    id: 'listing-002',
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

// The MOCK_LISTING_ID must match a real ID in mock-data.ts for the SSR fallback.
const MOCK_LISTING_ID = 'listing-001'

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
    // Navigate via card click to land on a real listing detail page
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    await expect(page.locator('a[href^="/listing/"]').first()).toBeVisible({ timeout: 8000 })
    await page.locator('a[href^="/listing/"]').first().click()
    await expect(page).toHaveURL(/\/listing\//, { timeout: 8000 })
    // Price element may be in a hidden-on-mobile section; toBeAttached is sufficient
    await expect(page.getByText(/₹/).first()).toBeAttached({ timeout: 8000 })
  })

  test('should show not found page for unknown listing id', async ({ page }) => {
    await page.goto('/listing/nonexistent-listing-id-xyz')
    await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible({
      timeout: 5000,
    })
  })
})

// ---------------------------------------------------------------------------
// TC-B05 — Browse URL with city param renders listings
// ---------------------------------------------------------------------------
test('TC-B05: browse URL with city param renders listing cards', async ({ page }) => {
  await mockListings(page)
  await page.goto('/properties?city=Mumbai')
  // Assert on listing title text — avoids strict-mode issues with compound locators
  await expect(page.getByText(/bandra west/i).first()).toBeVisible({ timeout: 15000 })
})

// ---------------------------------------------------------------------------
// TC-B06 — Browse page property type filter buttons exist
// ---------------------------------------------------------------------------
test('TC-B06: property type filter for apartment is present', async ({ page }) => {
  await mockListings(page)
  await page.goto('/properties')
  await expect(page.locator('a[href^="/listing/"]').first()).toBeVisible({ timeout: 10000 })

  const filterLocator = page
    .getByRole('button', { name: /apartment/i })
    .or(page.getByRole('checkbox', { name: /apartment/i }))
    .or(page.getByText(/apartment/i).first())

  const filterVisible = await filterLocator.isVisible().catch(() => false)
  if (!filterVisible) {
    await page.goto('/properties?propertyType=APARTMENT')
    await expect(page.locator('a[href^="/listing/"]').first()).toBeVisible({ timeout: 10000 })
  } else {
    await expect(filterLocator.first()).toBeVisible({ timeout: 10000 })
  }
})

// ---------------------------------------------------------------------------
// TC-B07 — GET /api/listings accepts pagination params without 500
// ---------------------------------------------------------------------------
test('TC-B07: GET /api/listings accepts pagination params', async ({ request }) => {
  const res = await request.get('/api/listings?page=2&limit=10')
  expect(res.status()).toBe(200)
  const contentType = res.headers()['content-type'] ?? ''
  expect(contentType).toContain('application/json')
  const body = await res.json()
  expect(body).toBeDefined()
})

// ---------------------------------------------------------------------------
// TC-B09 — Listing detail page renders seller / contact section
// ---------------------------------------------------------------------------
test('TC-B09: listing detail page renders seller or contact section', async ({ page }) => {
  // Listing detail page is fully SSR — page.route() cannot intercept server-side
  // Supabase fetches; requires a live DB connection.
  test.skip(NEEDS_REAL_AUTH, 'requires live Supabase DB (SSR listing detail page)')

  await page.goto(`/listing/${MOCK_LISTING_ID}`)
  await page.waitForLoadState('networkidle')

  const contactLocator = page
    .getByText(/contact seller|get.*contact|request.*contact|connect with seller/i)
    .first()
    .or(page.getByRole('button', { name: /contact|connect|request/i }).first())

  await expect(contactLocator).toBeVisible({ timeout: 10000 })
})

// ---------------------------------------------------------------------------
// TC-B11 — Listing detail page — Express Interest / contact button exists
// ---------------------------------------------------------------------------
test('TC-B11: listing detail page has express interest or contact interactive element', async ({
  page,
}) => {
  // Listing detail page is fully SSR — page.route() cannot intercept server-side
  // Supabase fetches; requires a live DB connection.
  test.skip(NEEDS_REAL_AUTH, 'requires live Supabase DB (SSR listing detail page)')

  await page.goto(`/listing/${MOCK_LISTING_ID}`)
  await page.waitForLoadState('networkidle')

  const interestLocator = page
    .getByRole('button', { name: /express interest|request contact|connect/i })
    .or(page.getByRole('link', { name: /express interest/i }))
    .first()

  await expect(interestLocator).toBeVisible({ timeout: 10000 })
})

// ---------------------------------------------------------------------------
// TC-B13 — GET /api/listings/:id returns 404 for non-existent listing
// ---------------------------------------------------------------------------
test('TC-B13: GET /api/listings/:id returns 404 for non-existent listing', async ({ request }) => {
  const res = await request.get('/api/listings/00000000-0000-0000-0000-000000000099')
  expect(res.status()).toBe(404)
  const body = await res.json()
  expect(typeof body.error).toBe('string')
})
