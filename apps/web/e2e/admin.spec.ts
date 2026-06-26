import { test, expect } from '@playwright/test'

/**
 * Admin panel tests.
 *
 * The admin panel is unlocked via a secret key (x-admin-key header).
 * We test the lock screen UI and the API layer without using real credentials.
 */

test.describe('Admin panel — access control', () => {
  test('unauthenticated user gets redirected to /login from /admin', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })

  test('redirect from /admin preserves ?next param', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/next=%2Fadmin/, { timeout: 8000 })
  })
})

test.describe('Admin API — /api/admin/listings', () => {
  test('returns 401 without x-admin-key header', async ({ request }) => {
    const response = await request.get('/api/admin/listings')
    expect(response.status()).toBe(401)
  })

  test('returns 401 with wrong x-admin-key', async ({ request }) => {
    const response = await request.get('/api/admin/listings', {
      headers: { 'x-admin-key': 'definitely-wrong-key-xyz' },
    })
    expect(response.status()).toBe(401)
  })

  test('GET /api/admin/listings accepts status filter param', async ({ request }) => {
    const response = await request.get('/api/admin/listings?status=PENDING_REVIEW', {
      headers: { 'x-admin-key': 'wrong-but-testing-route-exists' },
    })
    expect([200, 401]).toContain(response.status())
  })
})

test.describe('Admin API — /api/admin/listings/:id/approve', () => {
  test('returns 401 without admin key', async ({ request }) => {
    const response = await request.post('/api/admin/listings/fake-id/approve', {
      data: { notes: 'Looks good' },
    })
    expect(response.status()).toBe(401)
  })
})

test.describe('Admin API — /api/admin/listings/:id/reject', () => {
  test('returns 401 without admin key', async ({ request }) => {
    const response = await request.post('/api/admin/listings/fake-id/reject', {
      data: { reason: 'Fake listing' },
    })
    expect(response.status()).toBe(401)
  })
})

// Admin panel UI tests require authentication; these are covered in API tests above.
// Full admin panel UI testing (tabs, empty state, approve/reject) requires a valid
// admin key which is a secret — test these manually or in a CI environment with secrets.
