import crypto from 'node:crypto'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''

// ---------------------------------------------------------------------------
// Session cookie verification (inlined to avoid importing from a route file)
// ---------------------------------------------------------------------------
const COOKIE_NAME = 'sir_admin_session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000

function verifySessionToken(token: string): boolean {
  const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_SECRET_KEY ?? ''
  if (!SESSION_SECRET) return false
  const dotIdx = token.indexOf('.')
  if (dotIdx === -1) return false
  const tsStr = token.slice(0, dotIdx)
  const sig = token.slice(dotIdx + 1)
  const ts = parseInt(tsStr, 10)
  if (isNaN(ts) || Date.now() - ts > SESSION_TTL_MS) return false
  const expected = crypto.createHmac('sha256', SESSION_SECRET)
  expected.update(`admin:${ts}`)
  const expectedHex = expected.digest('hex')
  if (expectedHex.length !== sig.length) return false
  return crypto.timingSafeEqual(Buffer.from(expectedHex), Buffer.from(sig))
}

// ---------------------------------------------------------------------------
// In-memory rate limiter — 20 attempts per IP per 60 seconds
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 20
const _rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = _rateLimitStore.get(ip)
  if (!entry || now > entry.resetAt) {
    _rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  entry.count += 1
  if (entry.count > RATE_LIMIT_MAX) return true
  return false
}

export function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_KEY) return false

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  if (isRateLimited(ip)) return false

  // 1. Check httpOnly session cookie (preferred)
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value
  if (sessionCookie && verifySessionToken(sessionCookie)) return true

  // 2. Fallback: x-admin-key header (legacy — kept for in-flight requests during deploy)
  const provided = request.headers.get('x-admin-key') ?? ''
  if (provided.length !== ADMIN_KEY.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(ADMIN_KEY))
  } catch {
    return false
  }
}

export async function logAdminAction(
  admin: SupabaseClient,
  params: {
    action: string
    entityType: 'listing' | 'user' | 'report' | 'payment'
    entityId: string
    listingId?: string
    listingTitle?: string
    previousStatus?: string | null
    newStatus?: string | null
    previousValue?: Record<string, unknown>
    newValue?: Record<string, unknown>
    reason?: string
    note?: string
  },
): Promise<void> {
  try {
    await admin.from('audit_log').insert({
      listing_id: params.listingId ?? params.entityId,
      listing_title: params.listingTitle ?? params.entityId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      previous_status: params.previousStatus ?? null,
      new_status: params.newStatus ?? null,
      previous_value: params.previousValue ?? null,
      new_value: params.newValue ?? null,
      actor_id: 'api_key',
      actor_role: 'reviewer',
      reason: params.reason ?? params.note ?? null,
    })
  } catch (err) {
    console.error('[admin-auth] logAdminAction error:', err)
  }
}
