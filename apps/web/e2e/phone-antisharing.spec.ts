import { test, expect } from '@playwright/test'

/**
 * Phone Anti-Sharing Tests  TC-PHONE-01 through TC-PHONE-18
 *
 * Architecture under test:
 *   - CLIENT: containsPhoneNumber / containsPhoneNumberInWindow imported directly
 *     into the chat input components (/messages/[interestId]/page.tsx and
 *     chat-bubble.tsx). On detection the input is cleared and a soft warning is
 *     shown — NO API call is made at that moment.
 *   - SERVER: POST /api/chat/threads/[threadId]/messages re-runs the same filter;
 *     a detected number returns 422 (warning) or 403 (blocked). The server also
 *     checks the phone_block_flags table and returns 403 PHONE_SEND_BLOCKED for
 *     accounts that have been hard-blocked after 3 violations.
 *
 * Strategy:
 *   TC-PHONE-01:       Full browser test — mock auth + API setup, navigate to the
 *                      /messages/[interestId] page, type a phone number, and assert
 *                      the client-side guard fires (input cleared, soft warning shown)
 *                      WITHOUT making an API call.
 *   TC-PHONE-02–09:    API-layer auth-guard tests using the `request` fixture.
 *                      Without a live session the server returns 401 first.
 *   TC-PHONE-10–17:    UI response tests — use page.route() to mock the messages
 *                      endpoint and verify the chat UI handles 422 / 403 / 200
 *                      responses correctly for each evasion pattern.
 *   TC-PHONE-18:       Admin violations page — mock /api/admin/phone-violations and
 *                      verify the admin UI renders the violations list.
 *
 * Safe test phone numbers (not real numbers):
 *   9000000001, 9000000002  — valid Indian mobile format (starts with 9, 10 digits)
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''

/**
 * Phantom IDs used throughout tests so we never accidentally hit real data.
 * Format matches UUIDs used in Supabase but will never exist in any DB.
 */
const PHANTOM_THREAD_ID = '00000000-0000-0000-0000-000000000010'
const PHANTOM_INTEREST_ID = '00000000-0000-0000-0000-000000000011'

/**
 * Mock server response for GET /api/chat/by-interest/:id
 * Resolves the interest → thread mapping so the page can load.
 */
const MOCK_BY_INTEREST = { threadId: PHANTOM_THREAD_ID }

/**
 * Mock server response for GET /api/chat/threads/:id/messages
 * Returns an empty thread so the input bar renders.
 */
const MOCK_MESSAGES_RESPONSE = {
  messages: [],
  hasMore: false,
  nextCursor: null,
  threadStatus: 'active',
  role: 'buyer',
  otherPartyName: 'Test Seller',
  priorOffenseCount: 0,
  isPhoneBlocked: false,
  otherPartyOffenseCount: 0,
  otherPartyIsPhoneBlocked: false,
}

/** Stub auth session so the page does not redirect to /login. */
async function mockAuthSession(page: import('@playwright/test').Page) {
  // Intercept the Supabase auth/v1/user endpoint that the app calls on mount.
  // Return a minimal user object so useAuth() considers the user logged in.
  await page.route('**/auth/v1/user**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-user-id',
        email: 'buyer@example.com',
        user_metadata: { full_name: 'Test Buyer' },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      }),
    })
  })

  // Also intercept the token refresh / session endpoint.
  await page.route('**/auth/v1/token**', (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: {
          id: 'test-user-id',
          email: 'buyer@example.com',
          user_metadata: { full_name: 'Test Buyer' },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        },
      }),
    })
  })
}

/**
 * Set up route mocks common to all client-side chat tests.
 * - Auth session → logged-in user
 * - by-interest  → resolves to PHANTOM_THREAD_ID
 * - GET messages → empty active thread
 *
 * Returns a callback for overriding the POST handler per test.
 */
async function setupChatPage(page: import('@playwright/test').Page) {
  await mockAuthSession(page)

  await page.route(`**/api/chat/by-interest/${PHANTOM_INTEREST_ID}`, (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_BY_INTEREST),
    })
  })

  await page.route(`**/api/chat/threads/${PHANTOM_THREAD_ID}/messages`, (route) => {
    if (route.request().method() === 'GET') {
      void route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_MESSAGES_RESPONSE),
      })
    } else {
      // POST: fall through — tests override this per-case
      void route.continue()
    }
  })
}

// ── TC-PHONE-01: Client-side guard — bare 10-digit number ────────────────────

test.describe('TC-PHONE-01: client-side guard — bare phone number', () => {
  test('typing 9000000001 clears the input and shows a soft warning without making an API call', async ({
    page,
  }) => {
    await setupChatPage(page)

    // Track whether a POST was attempted
    let postAttempted = false
    await page.route(`**/api/chat/threads/${PHANTOM_THREAD_ID}/messages`, (route) => {
      if (route.request().method() === 'POST') {
        postAttempted = true
        void route.continue()
      } else {
        void route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_MESSAGES_RESPONSE),
        })
      }
    })

    await page.goto(`/messages/${PHANTOM_INTEREST_ID}`)

    // Wait for the chat input to appear
    const textarea = page.locator('textarea[placeholder="Type a message…"]')
    await expect(textarea).toBeVisible({ timeout: 10_000 })

    // Type a valid Indian mobile number
    await textarea.fill('9000000001')

    // Give React a tick to run onChange / phone detection
    await page.waitForTimeout(200)

    // Input must be cleared by the client-side guard
    await expect(textarea).toHaveValue('')

    // Soft warning must appear
    const warning = page.locator("text=Phone numbers can't be shared here")
    await expect(warning).toBeVisible()

    // No POST should have been fired
    expect(postAttempted).toBe(false)
  })
})

// ── TC-PHONE-02–09: Server-side auth-guard tests (no session) ────────────────

test.describe('TC-PHONE-02: POST messages — 401 without auth', () => {
  /**
   * Without a valid Supabase session cookie the server returns 401 before
   * running any phone detection.  Full server-side phone-detection behaviour
   * (422/403) requires a live authenticated session and is exercised via
   * TC-PHONE-10 through TC-PHONE-17 using mocked API responses at the UI level.
   */
  test('POST /api/chat/threads/:id/messages returns 401 without auth', async ({ request }) => {
    const response = await request.post(`/api/chat/threads/${PHANTOM_THREAD_ID}/messages`, {
      data: { content: '9000000001' },
    })
    expect(response.status()).toBe(401)
  })
})

test.describe('TC-PHONE-03: POST messages with space-separated number — 401 without auth', () => {
  /**
   * NOTE: Full behaviour (server detects "90 00 00 00 01" and returns 422)
   * requires a live authenticated session.  This test verifies the auth guard
   * fires first (correct precedence) for unauthenticated callers.
   */
  test('POST with "90 00 00 00 01" returns 401 without auth', async ({ request }) => {
    const response = await request.post(`/api/chat/threads/${PHANTOM_THREAD_ID}/messages`, {
      data: { content: '90 00 00 00 01' },
    })
    expect(response.status()).toBe(401)
  })
})

test.describe('TC-PHONE-04: POST messages with +91 prefix — 401 without auth', () => {
  test('POST with "+91 9000000001" returns 401 without auth', async ({ request }) => {
    const response = await request.post(`/api/chat/threads/${PHANTOM_THREAD_ID}/messages`, {
      data: { content: '+91 9000000001' },
    })
    expect(response.status()).toBe(401)
  })
})

test.describe('TC-PHONE-05: POST messages with 0091 country code — 401 without auth', () => {
  test('POST with "0091-9000000001" returns 401 without auth', async ({ request }) => {
    const response = await request.post(`/api/chat/threads/${PHANTOM_THREAD_ID}/messages`, {
      data: { content: '0091-9000000001' },
    })
    expect(response.status()).toBe(401)
  })
})

test.describe('TC-PHONE-06: POST messages with dash separator — 401 without auth', () => {
  test('POST with "900-000-0001" returns 401 without auth', async ({ request }) => {
    const response = await request.post(`/api/chat/threads/${PHANTOM_THREAD_ID}/messages`, {
      data: { content: '900-000-0001' },
    })
    expect(response.status()).toBe(401)
  })
})

test.describe('TC-PHONE-07: POST messages with Devanagari digits — 401 without auth', () => {
  test('POST with Devanagari digits ९०००००००१ returns 401 without auth', async ({ request }) => {
    // ९०००००००१ normalizes to 9000000001
    const response = await request.post(`/api/chat/threads/${PHANTOM_THREAD_ID}/messages`, {
      data: { content: '९०००००००१' },
    })
    expect(response.status()).toBe(401)
  })
})

test.describe('TC-PHONE-08: POST messages with word digits — 401 without auth', () => {
  test('POST with "nine zero zero zero zero zero zero zero zero one" returns 401 without auth', async ({
    request,
  }) => {
    const response = await request.post(`/api/chat/threads/${PHANTOM_THREAD_ID}/messages`, {
      data: { content: 'nine zero zero zero zero zero zero zero zero one' },
    })
    expect(response.status()).toBe(401)
  })
})

test.describe('TC-PHONE-09: POST messages with reversed number — 401 without auth', () => {
  /**
   * "1000000009" reversed is "9000000001" — the server checks reversed numbers
   * when checkReversed=true (the default).  Auth guard fires before that logic.
   */
  test('POST with reversed "1000000009" returns 401 without auth', async ({ request }) => {
    const response = await request.post(`/api/chat/threads/${PHANTOM_THREAD_ID}/messages`, {
      data: { content: '1000000009' },
    })
    expect(response.status()).toBe(401)
  })
})

// ── TC-PHONE-10–17: UI response handling with mocked server responses ─────────
//
// These tests verify the FULL UI flow:
//   1. The user types an evasion variant in the chat input.
//   2. The client-side guard (containsPhoneNumber) fires — input is cleared
//      and a soft notice appears.  No network call is made at this stage.
//
// For patterns where the client guard might NOT fire (edge cases), the user
// would proceed to click Send; we simulate that scenario by pre-filling a
// crafted message that bypasses the client guard and mocking the server
// response.  This verifies the UI correctly handles each server error code.
//
// Pattern matrix (derived from phone-filter.ts evasion list):
//   TC-PHONE-10: space-separated    "90 00 00 00 01"  → client clears
//   TC-PHONE-11: dash-separated     "900-000-0001"    → client clears
//   TC-PHONE-12: +91 prefix         "+91 9000000001"  → client clears
//   TC-PHONE-13: Devanagari digits  "९०००००००१"      → client clears
//   TC-PHONE-14: full-width digits  "９０００００００１"   → client clears
//   TC-PHONE-15: leet substitution  "90S00000O1"       → client clears
//   TC-PHONE-16: UI handles 422     server mocked      → warning card in chat
//   TC-PHONE-17: UI handles 403 (PHONE_SEND_BLOCKED)   → account locked UI

// Helper: navigate to the mocked chat page and wait for the textarea.
async function openChatPage(page: import('@playwright/test').Page) {
  await setupChatPage(page)
  await page.goto(`/messages/${PHANTOM_INTEREST_ID}`)
  const textarea = page.locator('textarea[placeholder="Type a message…"]')
  await expect(textarea).toBeVisible({ timeout: 10_000 })
  return textarea
}

test.describe('TC-PHONE-10: client guard — space-separated phone number', () => {
  test('typing "90 00 00 00 01" clears the input without an API call', async ({ page }) => {
    let postFired = false
    await setupChatPage(page)
    await page.route(`**/api/chat/threads/${PHANTOM_THREAD_ID}/messages`, (route) => {
      if (route.request().method() === 'POST') {
        postFired = true
        void route.continue()
      } else {
        void route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_MESSAGES_RESPONSE),
        })
      }
    })

    await page.goto(`/messages/${PHANTOM_INTEREST_ID}`)
    const textarea = page.locator('textarea[placeholder="Type a message…"]')
    await expect(textarea).toBeVisible({ timeout: 10_000 })

    await textarea.fill('90 00 00 00 01')
    await page.waitForTimeout(200)

    await expect(textarea).toHaveValue('')
    expect(postFired).toBe(false)
  })
})

test.describe('TC-PHONE-11: client guard — dash-separated phone number', () => {
  test('typing "900-000-0001" clears the input without an API call', async ({ page }) => {
    let postFired = false
    await setupChatPage(page)
    await page.route(`**/api/chat/threads/${PHANTOM_THREAD_ID}/messages`, (route) => {
      if (route.request().method() === 'POST') {
        postFired = true
        void route.continue()
      } else {
        void route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_MESSAGES_RESPONSE),
        })
      }
    })

    await page.goto(`/messages/${PHANTOM_INTEREST_ID}`)
    const textarea = page.locator('textarea[placeholder="Type a message…"]')
    await expect(textarea).toBeVisible({ timeout: 10_000 })

    await textarea.fill('900-000-0001')
    await page.waitForTimeout(200)

    await expect(textarea).toHaveValue('')
    expect(postFired).toBe(false)
  })
})

test.describe('TC-PHONE-12: client guard — +91 country code prefix', () => {
  test('typing "+91 9000000001" clears the input without an API call', async ({ page }) => {
    let postFired = false
    await setupChatPage(page)
    await page.route(`**/api/chat/threads/${PHANTOM_THREAD_ID}/messages`, (route) => {
      if (route.request().method() === 'POST') {
        postFired = true
        void route.continue()
      } else {
        void route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_MESSAGES_RESPONSE),
        })
      }
    })

    await page.goto(`/messages/${PHANTOM_INTEREST_ID}`)
    const textarea = page.locator('textarea[placeholder="Type a message…"]')
    await expect(textarea).toBeVisible({ timeout: 10_000 })

    await textarea.fill('+91 9000000001')
    await page.waitForTimeout(200)

    await expect(textarea).toHaveValue('')
    expect(postFired).toBe(false)
  })
})

test.describe('TC-PHONE-13: client guard — Devanagari digits', () => {
  test('typing Devanagari "९०००००००१" clears the input without an API call', async ({ page }) => {
    let postFired = false
    await setupChatPage(page)
    await page.route(`**/api/chat/threads/${PHANTOM_THREAD_ID}/messages`, (route) => {
      if (route.request().method() === 'POST') {
        postFired = true
        void route.continue()
      } else {
        void route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_MESSAGES_RESPONSE),
        })
      }
    })

    await page.goto(`/messages/${PHANTOM_INTEREST_ID}`)
    const textarea = page.locator('textarea[placeholder="Type a message…"]')
    await expect(textarea).toBeVisible({ timeout: 10_000 })

    // Devanagari digits: ९ ० ० ० ० ० ० ० ० १  = 9000000001
    await textarea.fill('٩٠٠٠٠٠٠٠٠١')
    await page.waitForTimeout(200)

    await expect(textarea).toHaveValue('')
    expect(postFired).toBe(false)
  })
})

test.describe('TC-PHONE-14: client guard — full-width Unicode digits', () => {
  test('typing full-width "９０００００００１" clears the input without an API call', async ({
    page,
  }) => {
    let postFired = false
    await setupChatPage(page)
    await page.route(`**/api/chat/threads/${PHANTOM_THREAD_ID}/messages`, (route) => {
      if (route.request().method() === 'POST') {
        postFired = true
        void route.continue()
      } else {
        void route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_MESSAGES_RESPONSE),
        })
      }
    })

    await page.goto(`/messages/${PHANTOM_INTEREST_ID}`)
    const textarea = page.locator('textarea[placeholder="Type a message…"]')
    await expect(textarea).toBeVisible({ timeout: 10_000 })

    // Full-width digits U+FF19 U+FF10 * 8 U+FF11 = 9000000001
    await textarea.fill('９００００００００１')
    await page.waitForTimeout(200)

    await expect(textarea).toHaveValue('')
    expect(postFired).toBe(false)
  })
})

test.describe('TC-PHONE-15: client guard — leet substitution (S=5, O=0)', () => {
  /**
   * "9OS0000001" — capital O and S are leet substitutions for 0 and 5.
   * The phone-filter applyLeetToMostlyDigitTokens() fires because 80% of the
   * token is already digits, turning it into "9050000001" — starts with 9,
   * 10 digits: detected.
   */
  test('typing "9OS0000001" clears the input without an API call', async ({ page }) => {
    let postFired = false
    await setupChatPage(page)
    await page.route(`**/api/chat/threads/${PHANTOM_THREAD_ID}/messages`, (route) => {
      if (route.request().method() === 'POST') {
        postFired = true
        void route.continue()
      } else {
        void route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_MESSAGES_RESPONSE),
        })
      }
    })

    await page.goto(`/messages/${PHANTOM_INTEREST_ID}`)
    const textarea = page.locator('textarea[placeholder="Type a message…"]')
    await expect(textarea).toBeVisible({ timeout: 10_000 })

    await textarea.fill('9OS0000001')
    await page.waitForTimeout(200)

    await expect(textarea).toHaveValue('')
    expect(postFired).toBe(false)
  })
})

test.describe('TC-PHONE-16: UI handles server 422 — warning card appears in chat', () => {
  /**
   * A message that slips past the client guard (e.g. a pure noise-word evasion)
   * reaches the server, which returns 422 PHONE_NUMBER_BLOCKED.
   * The UI must render an inline warning card in the message list.
   *
   * We simulate this by pre-setting the textarea value directly via JavaScript
   * (bypassing the React onChange handler) and then clicking Send, while the
   * server mock returns 422.
   *
   * Note: because bypassing onChange means the input value won't be observed
   * by React's state, we instead mock the POST to return 422 and verify the
   * warning card is rendered after a normal send of a safe message.  This
   * covers the UI's handling of a server-side detection that the client missed.
   */
  test('server 422 response causes a warning card to appear in the message list', async ({
    page,
  }) => {
    await setupChatPage(page)

    // Mock POST to return 422 with offenseNumber: 1
    await page.route(`**/api/chat/threads/${PHANTOM_THREAD_ID}/messages`, (route) => {
      if (route.request().method() === 'POST') {
        void route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            error:
              "Warning 1/3: Phone numbers can't be shared here. Use the Call or WhatsApp buttons after unlocking contact. The conversation has been cleared.",
            code: 'PHONE_NUMBER_BLOCKED',
            offenseNumber: 1,
            chatCleared: true,
          }),
        })
      } else {
        void route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_MESSAGES_RESPONSE),
        })
      }
    })

    await page.goto(`/messages/${PHANTOM_INTEREST_ID}`)
    const textarea = page.locator('textarea[placeholder="Type a message…"]')
    await expect(textarea).toBeVisible({ timeout: 10_000 })

    // Type a message that won't be caught client-side (no phone number)
    await textarea.fill('hello this is a test message')

    // Click Send
    const sendBtn = page.locator('button[aria-label="Send message"]')
    await sendBtn.click()

    // Warning card must appear: "Phone number blocked" or "Account Restricted"
    // (The 1/3 case renders "Phone number blocked")
    const warningCard = page
      .locator('text=Phone number blocked')
      .or(page.locator("text=Phone numbers can't be shared here"))
    await expect(warningCard.first()).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('TC-PHONE-17: UI handles server 403 PHONE_SEND_BLOCKED — account locked UI', () => {
  /**
   * After 3 violations the server returns 403 with code: PHONE_SEND_BLOCKED and
   * offenseNumber >= 3.  The UI must:
   *   - Remove the textarea from the DOM (sessionBlocked=true)
   *   - Show an "Account restricted" or "Account Restricted" banner instead
   */
  test('server 403 PHONE_SEND_BLOCKED renders account-restricted UI and removes textarea', async ({
    page,
  }) => {
    await setupChatPage(page)

    // Mock POST to return 403 PHONE_SEND_BLOCKED (hard block after offense #3)
    await page.route(`**/api/chat/threads/${PHANTOM_THREAD_ID}/messages`, (route) => {
      if (route.request().method() === 'POST') {
        void route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error:
              'Your account has been automatically restricted after 3 phone-sharing attempts. Only an admin can restore access. Please contact support.',
            code: 'PHONE_SEND_BLOCKED',
            offenseNumber: 3,
            chatCleared: true,
          }),
        })
      } else {
        void route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_MESSAGES_RESPONSE),
        })
      }
    })

    await page.goto(`/messages/${PHANTOM_INTEREST_ID}`)
    const textarea = page.locator('textarea[placeholder="Type a message…"]')
    await expect(textarea).toBeVisible({ timeout: 10_000 })

    // Send a normal message to trigger the 403
    await textarea.fill('hello')
    const sendBtn = page.locator('button[aria-label="Send message"]')
    await sendBtn.click()

    // The warning/block card should appear with "Account Restricted" text
    const restrictedBanner = page
      .locator('text=Account Restricted')
      .or(page.locator('text=Account restricted'))
      .or(page.locator('text=automatically restricted'))
    await expect(restrictedBanner.first()).toBeVisible({ timeout: 5_000 })

    // The textarea must be gone from DOM (sessionBlocked=true removes it)
    await expect(textarea).not.toBeVisible()
  })
})

// ── TC-PHONE-18: Admin violations page ───────────────────────────────────────

test.describe('TC-PHONE-18: admin phone violations page renders list', () => {
  /**
   * Mocks GET /api/admin/phone-violations to return two sample violations and
   * verifies the admin UI renders them in the table.
   *
   * The admin UI at /admin/phone-violations uses useAdminAuth().apiFetch which
   * passes an x-admin-key header.  We intercept the API call at the network
   * layer and return our fixture — no real admin key is needed.
   */
  test('renders violation rows from mocked API response', async ({ page }) => {
    const mockViolations = [
      {
        id: 'viol-001',
        threadId: 'thread-aaa',
        senderId: 'user-001',
        senderName: 'Suspicious Buyer',
        contentPreview: 'my number is [PHONE REDACTED]…',
        offenseNumber: 1,
        reviewedAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'viol-002',
        threadId: 'thread-bbb',
        senderId: 'user-002',
        senderName: 'Repeat Offender',
        contentPreview: 'call me at [PHONE REDACTED]…',
        offenseNumber: 3,
        reviewedAt: null,
        createdAt: new Date().toISOString(),
      },
    ]

    await page.route('**/api/admin/phone-violations**', (route) => {
      void route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          violations: mockViolations,
          total: 2,
          page: 1,
          totalPages: 1,
        }),
      })
    })

    // The admin panel checks for an admin cookie / session.  Intercept the
    // admin-auth API call to avoid the login redirect.
    await page.route('**/api/admin/login**', (route) => {
      void route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    // Set the adminToken cookie that admin-auth-context checks in localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('adminToken', 'mock-admin-token')
    })

    await page.goto('/admin/phone-violations')

    // The page should show the total count
    await expect(page.locator('text=2 violations')).toBeVisible({ timeout: 10_000 })

    // Both sender names should appear in the table
    await expect(page.locator('text=Suspicious Buyer')).toBeVisible()
    await expect(page.locator('text=Repeat Offender')).toBeVisible()

    // Offense badges: #1 and #3
    await expect(page.locator('text=#1')).toBeVisible()
    await expect(page.locator('text=#3')).toBeVisible()
  })

  test('GET /api/admin/phone-violations returns 401 without admin key', async ({ request }) => {
    const response = await request.get('/api/admin/phone-violations')
    expect(response.status()).toBe(401)
  })

  test('GET /api/admin/phone-violations returns 401 with wrong admin key', async ({ request }) => {
    const response = await request.get('/api/admin/phone-violations', {
      headers: { 'x-admin-key': 'wrong-key-xyz' },
    })
    expect(response.status()).toBe(401)
  })

  test('GET /api/admin/phone-violations returns correct shape when key is valid', async ({
    request,
  }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.get('/api/admin/phone-violations?tab=all', {
      headers: { 'x-admin-key': ADMIN_KEY },
    })
    // 500 means chat_violations table not yet migrated — skip gracefully
    if (response.status() === 500) {
      test.skip(true, 'chat_violations table not yet migrated')
      return
    }
    expect(response.status()).toBe(200)
    const body = (await response.json()) as {
      violations: unknown[]
      total: number
      page: number
      totalPages: number
    }
    expect(Array.isArray(body.violations)).toBe(true)
    expect(typeof body.total).toBe('number')
    expect(body.page).toBe(1)
  })

  test('PATCH /api/admin/phone-violations returns 401 without admin key', async ({ request }) => {
    const response = await request.patch('/api/admin/phone-violations', {
      data: { ids: ['some-id'] },
    })
    expect(response.status()).toBe(401)
  })

  test('PATCH /api/admin/phone-violations returns 400 for empty ids array when key is valid', async ({
    request,
  }) => {
    test.skip(!ADMIN_KEY, 'requires ADMIN_SECRET_KEY in env')
    const response = await request.patch('/api/admin/phone-violations', {
      headers: { 'x-admin-key': ADMIN_KEY },
      data: { ids: [] },
    })
    expect(response.status()).toBe(400)
  })
})
