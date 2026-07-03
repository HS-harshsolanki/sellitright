// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { checkBlock, checkInterestRateLimit, checkSpam } from './trust'

// ── Mock Supabase chainable query builder ─────────────────────────────────────

/**
 * Creates a chainable mock that ends with a resolved value.
 * Every chainable method returns `this` so you can do
 * .select().eq().gte()... and the final await resolves to `result`.
 */
function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = [
    'select',
    'eq',
    'neq',
    'gte',
    'lte',
    'or',
    'contains',
    'maybeSingle',
    'single',
    'insert',
    'upsert',
  ]
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  // Make the chain thenable (awaitable)
  ;(chain as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve(result)
  return chain
}

/**
 * Creates a minimal Supabase mock where every `.from()` call returns a fresh
 * chainable query object that resolves to `defaultResult`.
 *
 * For per-table control, pass a `tableResults` map: the key is the table name,
 * and the value is the resolved result for that table.
 */
function makeSupabaseMock(
  tableResults: Record<string, unknown> = {},
  defaultResult: unknown = { data: null, count: null, error: null },
) {
  return {
    from: vi.fn((table: string) => {
      const result = table in tableResults ? tableResults[table] : defaultResult
      return makeChain(result)
    }),
  }
}

// ── checkInterestRateLimit ────────────────────────────────────────────────────

describe('checkInterestRateLimit', () => {
  const buyerId = 'buyer-123'
  const listingId = 'listing-456'

  it('returns allowed:true when requestsToday=9 and pendingOnListing=2', async () => {
    const admin = makeSupabaseMock({
      activity_logs: { count: 9, error: null },
      buyer_interest: { count: 2, error: null },
    })
    const result = await checkInterestRateLimit(admin as never, admin as never, buyerId, listingId)
    expect(result.allowed).toBe(true)
    expect(result.requestsToday).toBe(9)
    expect(result.pendingOnListing).toBe(2)
  })

  it('returns allowed:false when requestsToday=10 (daily limit reached)', async () => {
    const admin = makeSupabaseMock({
      activity_logs: { count: 10, error: null },
      buyer_interest: { count: 0, error: null },
    })
    const result = await checkInterestRateLimit(admin as never, admin as never, buyerId, listingId)
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/daily limit/i)
    expect(result.requestsToday).toBe(10)
  })

  it('returns allowed:false when pendingOnListing=3 (listing cap reached)', async () => {
    const admin = makeSupabaseMock({
      activity_logs: { count: 5, error: null },
      buyer_interest: { count: 3, error: null },
    })
    const result = await checkInterestRateLimit(admin as never, admin as never, buyerId, listingId)
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/maximum number of pending/i)
    expect(result.pendingOnListing).toBe(3)
  })

  it('fails open (allowed:true) on DB error for daily count', async () => {
    // activity_logs returns an error → should fail open
    const admin = makeSupabaseMock({
      activity_logs: { count: null, error: { message: 'DB connection error' } },
      buyer_interest: { count: 0, error: null },
    })
    const result = await checkInterestRateLimit(admin as never, admin as never, buyerId, listingId)
    expect(result.allowed).toBe(true)
  })

  it('fails open (allowed:true) on DB error for pending count', async () => {
    const admin = makeSupabaseMock({
      activity_logs: { count: 5, error: null },
      buyer_interest: { count: null, error: { message: 'DB connection error' } },
    })
    const result = await checkInterestRateLimit(admin as never, admin as never, buyerId, listingId)
    expect(result.allowed).toBe(true)
  })
})

// ── checkSpam ─────────────────────────────────────────────────────────────────

describe('checkSpam', () => {
  const buyerId = 'buyer-123'

  it('returns isSpam:true when flag is SUSPENDED', async () => {
    const admin = makeSupabaseMock({
      latest_user_flag: { data: { flag: 'SUSPENDED' }, error: null },
      activity_logs: { count: 0, error: null },
    })
    const result = await checkSpam(admin as never, buyerId, 'hello')
    expect(result.isSpam).toBe(true)
    expect(result.reason).toMatch(/suspended/i)
  })

  it('returns isSpam:true when duplicate message count >= 3', async () => {
    // Not suspended; duplicate message count is 3
    const admin = makeSupabaseMock({
      latest_user_flag: { data: null, error: null },
      activity_logs: { count: 3, error: null },
    })
    const result = await checkSpam(admin as never, buyerId, 'buy my property')
    expect(result.isSpam).toBe(true)
    expect(result.reason).toMatch(/duplicate/i)
  })

  it('returns isSpam:false when duplicate message count = 2', async () => {
    // Not suspended; duplicate count 2 (below threshold 3); burst count 0
    let callIndex = 0
    const adminFrom = vi.fn(() => {
      // Call order: latest_user_flag, activity_logs (dup), activity_logs (burst)
      const results = [
        { data: null, error: null }, // latest_user_flag
        { count: 2, error: null }, // activity_logs dup count
        { count: 0, error: null }, // activity_logs burst count
      ]
      const result = results[callIndex] ?? { data: null, count: 0, error: null }
      callIndex++
      return makeChain(result)
    })
    const result = await checkSpam({ from: adminFrom } as never, buyerId, 'buy my property')
    expect(result.isSpam).toBe(false)
  })

  it('returns isSpam:true when burst count >= 5', async () => {
    let callIndex = 0
    const adminFrom = vi.fn(() => {
      const results = [
        { data: null, error: null }, // latest_user_flag
        { count: 0, error: null }, // activity_logs dup count
        { count: 5, error: null }, // activity_logs burst count
      ]
      const result = results[callIndex] ?? { data: null, count: 0, error: null }
      callIndex++
      return makeChain(result)
    })
    const result = await checkSpam({ from: adminFrom } as never, buyerId, 'some message')
    expect(result.isSpam).toBe(true)
    expect(result.reason).toMatch(/too many requests/i)
  })

  it('returns isSpam:false when no spam signals present (null message skips dup check)', async () => {
    // null message skips the duplicate message check; burst count is 0
    let callIndex = 0
    const adminFrom = vi.fn(() => {
      const results = [
        { data: null, error: null }, // latest_user_flag
        { count: 0, error: null }, // activity_logs burst count (no dup check for null message)
      ]
      const result = results[callIndex] ?? { data: null, count: 0, error: null }
      callIndex++
      return makeChain(result)
    })
    const result = await checkSpam({ from: adminFrom } as never, buyerId, null)
    expect(result.isSpam).toBe(false)
  })
})

// ── checkBlock ────────────────────────────────────────────────────────────────

describe('checkBlock', () => {
  const userA = 'user-A'
  const userB = 'user-B'

  it('returns blocked:true with direction "they_blocked_you" when B blocked A', async () => {
    const admin = makeSupabaseMock({
      blocked_users: {
        data: [{ blocker_id: userB, blockee_id: userA }],
        error: null,
      },
    })
    const result = await checkBlock(admin as never, userA, userB)
    expect(result.blocked).toBe(true)
    expect(result.direction).toBe('they_blocked_you')
  })

  it('returns blocked:true with direction "you_blocked_them" when A blocked B', async () => {
    const admin = makeSupabaseMock({
      blocked_users: {
        data: [{ blocker_id: userA, blockee_id: userB }],
        error: null,
      },
    })
    const result = await checkBlock(admin as never, userA, userB)
    expect(result.blocked).toBe(true)
    expect(result.direction).toBe('you_blocked_them')
  })

  it('returns blocked:true with direction "mutual" when both blocked each other', async () => {
    const admin = makeSupabaseMock({
      blocked_users: {
        data: [
          { blocker_id: userA, blockee_id: userB },
          { blocker_id: userB, blockee_id: userA },
        ],
        error: null,
      },
    })
    const result = await checkBlock(admin as never, userA, userB)
    expect(result.blocked).toBe(true)
    expect(result.direction).toBe('mutual')
  })

  it('returns blocked:false when no block relationship exists', async () => {
    const admin = makeSupabaseMock({
      blocked_users: { data: [], error: null },
    })
    const result = await checkBlock(admin as never, userA, userB)
    expect(result.blocked).toBe(false)
  })

  it('fails open (blocked:false) on DB error', async () => {
    const admin = makeSupabaseMock({
      blocked_users: { data: null, error: { message: 'DB error' } },
    })
    const result = await checkBlock(admin as never, userA, userB)
    expect(result.blocked).toBe(false)
  })
})
