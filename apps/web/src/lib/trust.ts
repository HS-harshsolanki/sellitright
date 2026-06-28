/**
 * Trust & Safety service layer.
 *
 * All business rules for rate-limiting, spam detection, block checks, and
 * risk scoring live here. API routes stay thin — they call these helpers and
 * return the result.
 *
 * All writes use the service-role client so they bypass RLS.
 * All reads that check on behalf of the requester use the user client.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ── Constants ─────────────────────────────────────────────────────────────────

export const DAILY_REQUEST_LIMIT = 10 // max interest requests per buyer per day
export const PENDING_PER_LISTING_LIMIT = 3 // max simultaneous PENDING interests on one property

// Risk score thresholds
const SCORE_MEDIUM = 40
const SCORE_HIGH = 70

// Spam detection: same message text within sliding window
const DUPLICATE_MSG_WINDOW_HOURS = 24
const DUPLICATE_MSG_COUNT_THRESHOLD = 3

// Rapid submission: more than N requests in M minutes
const RAPID_BURST_WINDOW_MINUTES = 10
const RAPID_BURST_THRESHOLD = 5

// Broker detection: more than this many active listings → signal
export const BROKER_ACTIVE_LISTING_THRESHOLD = 3

// ── Types ─────────────────────────────────────────────────────────────────────

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface RiskSignals {
  report_count: number
  active_listings_count: number
  requests_today: number
  rapid_burst: boolean
  duplicate_messages: boolean
  is_suspended: boolean
}

export interface RiskResult {
  score: number
  level: RiskLevel
  signals: RiskSignals
}

export interface RateLimitResult {
  allowed: boolean
  reason?: string
  requestsToday?: number
  pendingOnListing?: number
}

export interface BlockCheckResult {
  blocked: boolean
  direction?: 'you_blocked_them' | 'they_blocked_you' | 'mutual'
}

// ── Activity logging ──────────────────────────────────────────────────────────

/**
 * Appends one row to activity_logs. Fire-and-forget — never throws.
 * Must be called with the service-role client.
 */
export async function logActivity(
  admin: SupabaseClient,
  params: {
    userId: string
    action: 'interest_request' | 'report' | 'block' | 'unblock' | 'listing_view'
    entityType?: string
    entityId?: string
    ipAddress?: string
    metadata?: Record<string, unknown>
  },
): Promise<void> {
  const { error } = await admin.from('activity_logs').insert({
    user_id: params.userId,
    action: params.action,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
    ip_address: params.ipAddress ?? null,
    metadata: params.metadata ?? {},
  })
  if (error) {
    console.error('[trust/logActivity]', error.message)
  }
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

/**
 * Checks whether a buyer is allowed to submit a new interest request.
 *
 * Rules:
 *   1. Max 10 interest_request actions today (UTC day, rolling via activity_logs)
 *   2. Max 3 PENDING interests on the target listing (across all buyers)
 *
 * Uses the user-scoped client for the daily count (RLS: user sees own logs)
 * and the service-role client for the listing-wide PENDING count.
 */
export async function checkInterestRateLimit(
  userClient: SupabaseClient,
  adminClient: SupabaseClient,
  buyerId: string,
  listingId: string,
): Promise<RateLimitResult> {
  // 1. Daily limit — count from activity_logs for today
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)

  const { count: todayCount, error: countErr } = await adminClient
    .from('activity_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', buyerId)
    .eq('action', 'interest_request')
    .gte('created_at', startOfDay.toISOString())

  if (countErr) {
    console.error('[trust/rateLimit] daily count error:', countErr.message)
    // Fail open — don't block on DB error
    return { allowed: true }
  }

  const requestsToday = todayCount ?? 0

  if (requestsToday >= DAILY_REQUEST_LIMIT) {
    return {
      allowed: false,
      reason: `You have reached the daily limit of ${DAILY_REQUEST_LIMIT} interest requests. Try again tomorrow.`,
      requestsToday,
    }
  }

  // 2. Pending cap per listing
  const { count: pendingCount, error: pendingErr } = await adminClient
    .from('buyer_interest')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', listingId)
    .eq('status', 'PENDING')

  if (pendingErr) {
    console.error('[trust/rateLimit] pending count error:', pendingErr.message)
    return { allowed: true }
  }

  const pendingOnListing = pendingCount ?? 0

  if (pendingOnListing >= PENDING_PER_LISTING_LIMIT) {
    return {
      allowed: false,
      reason: 'This property has reached the maximum number of pending requests.',
      requestsToday,
      pendingOnListing,
    }
  }

  return { allowed: true, requestsToday, pendingOnListing }
}

// ── Spam detection ─────────────────────────────────────────────────────────────

export interface SpamCheckResult {
  isSpam: boolean
  reason?: string
}

/**
 * Checks for known spam patterns on a new interest request:
 *
 *   1. Duplicate message — same non-null message text submitted more than N times
 *      by this user in the last 24 h.
 *   2. Rapid burst — more than RAPID_BURST_THRESHOLD requests in RAPID_BURST_WINDOW_MINUTES.
 *   3. User is currently SUSPENDED (flag from user_flags).
 *
 * Uses the service-role client throughout (reads activity_logs + user_flags).
 */
export async function checkSpam(
  admin: SupabaseClient,
  buyerId: string,
  message: string | null | undefined,
): Promise<SpamCheckResult> {
  // 1. Suspended?
  const { data: flag } = await admin
    .from('latest_user_flag')
    .select('flag')
    .eq('user_id', buyerId)
    .maybeSingle()

  if (flag?.flag === 'SUSPENDED') {
    return { isSpam: true, reason: 'Your account has been suspended.' }
  }

  // 2. Duplicate message
  if (message && message.trim().length > 0) {
    const since = new Date(Date.now() - DUPLICATE_MSG_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
    const { count: dupCount } = await admin
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', buyerId)
      .eq('action', 'interest_request')
      .gte('created_at', since)
      .contains('metadata', { message: message.trim() })

    if ((dupCount ?? 0) >= DUPLICATE_MSG_COUNT_THRESHOLD) {
      return {
        isSpam: true,
        reason: 'Duplicate message detected. Please use a personalised message.',
      }
    }
  }

  // 3. Rapid burst
  const burstSince = new Date(Date.now() - RAPID_BURST_WINDOW_MINUTES * 60 * 1000).toISOString()

  const { count: burstCount } = await admin
    .from('activity_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', buyerId)
    .eq('action', 'interest_request')
    .gte('created_at', burstSince)

  if ((burstCount ?? 0) >= RAPID_BURST_THRESHOLD) {
    return {
      isSpam: true,
      reason: `Too many requests in a short time. Please wait a few minutes before trying again.`,
    }
  }

  return { isSpam: false }
}

// ── Block checks ──────────────────────────────────────────────────────────────

/**
 * Returns whether there is any block relationship between two users in either
 * direction. Uses the service-role client so it can check both sides without
 * leaking who blocked whom to either party.
 */
export async function checkBlock(
  admin: SupabaseClient,
  userA: string,
  userB: string,
): Promise<BlockCheckResult> {
  const { data, error } = await admin
    .from('blocked_users')
    .select('blocker_id, blockee_id')
    .or(
      `and(blocker_id.eq.${userA},blockee_id.eq.${userB}),and(blocker_id.eq.${userB},blockee_id.eq.${userA})`,
    )

  if (error) {
    console.error('[trust/checkBlock]', error.message)
    return { blocked: false }
  }

  if (!data || data.length === 0) return { blocked: false }

  const aBlockedB = data.some((r) => r.blocker_id === userA && r.blockee_id === userB)
  const bBlockedA = data.some((r) => r.blocker_id === userB && r.blockee_id === userA)

  if (aBlockedB && bBlockedA) return { blocked: true, direction: 'mutual' }
  if (aBlockedB) return { blocked: true, direction: 'you_blocked_them' }
  return { blocked: true, direction: 'they_blocked_you' }
}

// ── Risk scoring ──────────────────────────────────────────────────────────────

/**
 * Computes a risk score for a user and upserts it into risk_scores.
 *
 * Signal weights (sum → 0-100 scale):
 *   • is_suspended           → +50 (immediate high risk)
 *   • report_count ≥ 3       → +30
 *   • report_count 1-2       → +15
 *   • active_listings > 3    → +20 (broker signal)
 *   • rapid_burst            → +20
 *   • duplicate_messages     → +15
 *   • requests_today > 8     → +10
 *
 * Must be called with the service-role client.
 */
export async function computeAndStoreRiskScore(
  admin: SupabaseClient,
  userId: string,
): Promise<RiskResult> {
  // Gather all signals in parallel
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)

  const burstSince = new Date(Date.now() - RAPID_BURST_WINDOW_MINUTES * 60 * 1000).toISOString()

  const dupSince = new Date(Date.now() - DUPLICATE_MSG_WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  const [reportRes, activeListingsRes, todayCountRes, burstCountRes, flagRes, dupCountRes] =
    await Promise.all([
      // Report count against this user (excluding dismissed)
      admin
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('target_user_id', userId)
        .neq('status', 'DISMISSED'),

      // Active listing count (broker signal)
      admin
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', userId)
        .eq('status', 'ACTIVE'),

      // Requests sent today
      admin
        .from('activity_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('action', 'interest_request')
        .gte('created_at', startOfDay.toISOString()),

      // Rapid burst count
      admin
        .from('activity_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('action', 'interest_request')
        .gte('created_at', burstSince),

      // Suspended flag
      admin.from('latest_user_flag').select('flag').eq('user_id', userId).maybeSingle(),

      // Duplicate message count (any repeated message)
      admin
        .from('activity_logs')
        .select('metadata')
        .eq('user_id', userId)
        .eq('action', 'interest_request')
        .gte('created_at', dupSince),
    ])

  const reportCount = reportRes.count ?? 0
  const activeListings = activeListingsRes.count ?? 0
  const requestsToday = todayCountRes.count ?? 0
  const burstCount = burstCountRes.count ?? 0
  const isSuspended = flagRes.data?.flag === 'SUSPENDED'

  // Duplicate message detection: find messages that appear more than once
  const messages = (dupCountRes.data ?? [])
    .map((r) => (r.metadata as Record<string, unknown>)?.message as string | undefined)
    .filter((m): m is string => typeof m === 'string' && m.trim().length > 0)

  const msgFreq = messages.reduce<Record<string, number>>((acc, m) => {
    acc[m] = (acc[m] ?? 0) + 1
    return acc
  }, {})
  const hasDuplicateMessages = Object.values(msgFreq).some(
    (c) => c >= DUPLICATE_MSG_COUNT_THRESHOLD,
  )
  const rapidBurst = burstCount >= RAPID_BURST_THRESHOLD

  // Scoring
  let score = 0
  if (isSuspended) score += 50
  if (reportCount >= 3) score += 30
  else if (reportCount >= 1) score += 15
  if (activeListings > BROKER_ACTIVE_LISTING_THRESHOLD) score += 20
  if (rapidBurst) score += 20
  if (hasDuplicateMessages) score += 15
  if (requestsToday > 8) score += 10
  score = Math.min(100, score)

  const level: RiskLevel = score >= SCORE_HIGH ? 'HIGH' : score >= SCORE_MEDIUM ? 'MEDIUM' : 'LOW'

  const signals: RiskSignals = {
    report_count: reportCount,
    active_listings_count: activeListings,
    requests_today: requestsToday,
    rapid_burst: rapidBurst,
    duplicate_messages: hasDuplicateMessages,
    is_suspended: isSuspended,
  }

  // Upsert — on conflict (same user_id PK), update
  await admin.from('risk_scores').upsert(
    {
      user_id: userId,
      score,
      level,
      signals,
      last_computed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  return { score, level, signals }
}

// ── Convenience: full pre-flight check ───────────────────────────────────────

export interface PreflightResult {
  allowed: boolean
  statusCode: 400 | 403 | 422 | 429
  reason: string
}

/**
 * Runs all trust checks before allowing a buyer interest submission:
 *   1. Block check (either direction)
 *   2. Spam detection
 *   3. Rate limits (daily + per-listing pending cap)
 *
 * Returns `{ allowed: true }` when all checks pass.
 * Returns `{ allowed: false, statusCode, reason }` on first failure.
 */
export async function interestPreflight(
  userClient: SupabaseClient,
  admin: SupabaseClient,
  buyerId: string,
  sellerId: string,
  listingId: string,
  message: string | null | undefined,
): Promise<{ allowed: true } | PreflightResult> {
  // 1. Block
  const blockCheck = await checkBlock(admin, buyerId, sellerId)
  if (blockCheck.blocked) {
    return {
      allowed: false,
      statusCode: 403,
      reason: 'You cannot send a request to this seller.',
    }
  }

  // 2. Spam
  const spamCheck = await checkSpam(admin, buyerId, message)
  if (spamCheck.isSpam) {
    return {
      allowed: false,
      statusCode: 422,
      reason: spamCheck.reason ?? 'Request flagged as spam.',
    }
  }

  // 3. Rate limits
  const rateCheck = await checkInterestRateLimit(userClient, admin, buyerId, listingId)
  if (!rateCheck.allowed) {
    return {
      allowed: false,
      statusCode: 429,
      reason: rateCheck.reason ?? 'Rate limit exceeded.',
    }
  }

  return { allowed: true }
}
