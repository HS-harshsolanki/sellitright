/**
 * Automation tests for Admin Dashboard API routes
 * Tests: auth, listings (search/filter/paginate), approve, reject, note, audit log
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_KEY = 'test-admin-key-abc123'

function makeReq(
  url: string,
  opts: { method?: string; body?: unknown; key?: string | null } = {},
): NextRequest {
  const { method = 'GET', body, key = VALID_KEY } = opts
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (key !== null) headers['x-admin-key'] = key
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })
}

// ── Mock env ──────────────────────────────────────────────────────────────────

vi.stubEnv('ADMIN_SECRET_KEY', VALID_KEY)

// ── Tests: GET /api/admin/listings ────────────────────────────────────────────

describe('GET /api/admin/listings', () => {
  beforeEach(() => vi.resetModules())

  it('returns 401 when no key provided', async () => {
    const { GET } = await import('../listings/route')
    const res = await GET(makeReq('http://localhost/api/admin/listings', { key: null }))
    expect(res.status).toBe(401)
  })

  it('returns 401 with wrong key', async () => {
    const { GET } = await import('../listings/route')
    const res = await GET(makeReq('http://localhost/api/admin/listings', { key: 'wrong-key' }))
    expect(res.status).toBe(401)
  })

  it('returns listings with counts', async () => {
    const { GET } = await import('../listings/route')
    const res = await GET(makeReq('http://localhost/api/admin/listings'))
    expect(res.status).toBe(200)
    const data = await res.json() as { listings: unknown[]; counts: { PENDING_REVIEW: number; ACTIVE: number; REJECTED: number }; total: number; page: number; totalPages: number }
    expect(data).toHaveProperty('listings')
    expect(data).toHaveProperty('counts')
    expect(data.counts).toHaveProperty('PENDING_REVIEW')
    expect(data.counts).toHaveProperty('ACTIVE')
    expect(data.counts).toHaveProperty('REJECTED')
    expect(typeof data.total).toBe('number')
    expect(typeof data.page).toBe('number')
    expect(typeof data.totalPages).toBe('number')
  })

  it('filters by status', async () => {
    const { GET } = await import('../listings/route')
    const res = await GET(makeReq('http://localhost/api/admin/listings?status=ACTIVE'))
    expect(res.status).toBe(200)
    const data = await res.json() as { listings: Array<{ status: string }> }
    data.listings.forEach((l) => expect(l.status).toBe('ACTIVE'))
  })

  it('searches by title', async () => {
    const { GET } = await import('../listings/route')
    const res = await GET(makeReq('http://localhost/api/admin/listings?q=Koramangala'))
    expect(res.status).toBe(200)
    const data = await res.json() as { listings: Array<{ city: string; locality: string; title: string; seller: { name: string; phone: string } }> }
    // All results should mention Koramangala in title, locality, or city
    data.listings.forEach((l) => {
      const hay = [l.title, l.locality, l.city, l.seller.name, l.seller.phone].join(' ').toLowerCase()
      expect(hay).toContain('koramangala')
    })
  })

  it('paginates results', async () => {
    const { GET } = await import('../listings/route')
    // min limit is 10; request page 2 of a 10-per-page query — mock has 12 total
    const res = await GET(makeReq('http://localhost/api/admin/listings?page=2&limit=10'))
    expect(res.status).toBe(200)
    const data = await res.json() as { listings: unknown[]; page: number; totalPages: number }
    expect(data.page).toBe(2)
    expect(data.listings.length).toBeLessThanOrEqual(10)
  })
})

// ── Tests: POST approve ────────────────────────────────────────────────────────

describe('POST /api/admin/listings/[id]/approve', () => {
  beforeEach(() => vi.resetModules())

  it('returns 401 without key', async () => {
    const { POST } = await import('../listings/[id]/approve/route')
    const res = await POST(
      makeReq('http://localhost/api/admin/listings/listing-010/approve', { method: 'POST', key: null }),
      { params: Promise.resolve({ id: 'listing-010' }) },
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 for unknown listing', async () => {
    const { POST } = await import('../listings/[id]/approve/route')
    const res = await POST(
      makeReq('http://localhost/api/admin/listings/nonexistent/approve', { method: 'POST' }),
      { params: Promise.resolve({ id: 'nonexistent' }) },
    )
    expect(res.status).toBe(404)
  })

  it('approves a pending listing', async () => {
    const { POST } = await import('../listings/[id]/approve/route')
    const res = await POST(
      makeReq('http://localhost/api/admin/listings/listing-010/approve', { method: 'POST', body: {} }),
      { params: Promise.resolve({ id: 'listing-010' }) },
    )
    expect(res.status).toBe(200)
    const data = await res.json() as { status: string }
    expect(data.status).toBe('ACTIVE')
  })
})

// ── Tests: POST reject ─────────────────────────────────────────────────────────

describe('POST /api/admin/listings/[id]/reject', () => {
  beforeEach(() => vi.resetModules())

  it('returns 401 without key', async () => {
    const { POST } = await import('../listings/[id]/reject/route')
    const res = await POST(
      makeReq('http://localhost/api/admin/listings/listing-011/reject', { method: 'POST', key: null }),
      { params: Promise.resolve({ id: 'listing-011' }) },
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when reason is missing', async () => {
    const { POST } = await import('../listings/[id]/reject/route')
    const res = await POST(
      makeReq('http://localhost/api/admin/listings/listing-011/reject', { method: 'POST', body: { reason: '' } }),
      { params: Promise.resolve({ id: 'listing-011' }) },
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when reason is whitespace', async () => {
    const { POST } = await import('../listings/[id]/reject/route')
    const res = await POST(
      makeReq('http://localhost/api/admin/listings/listing-011/reject', { method: 'POST', body: { reason: '   ' } }),
      { params: Promise.resolve({ id: 'listing-011' }) },
    )
    expect(res.status).toBe(400)
  })

  it('rejects a listing with a valid reason', async () => {
    const { POST } = await import('../listings/[id]/reject/route')
    const res = await POST(
      makeReq('http://localhost/api/admin/listings/listing-011/reject', { method: 'POST', body: { reason: 'Fake listing — duplicate' } }),
      { params: Promise.resolve({ id: 'listing-011' }) },
    )
    expect(res.status).toBe(200)
    const data = await res.json() as { status: string; rejectionReason: string }
    expect(data.status).toBe('REJECTED')
    expect(data.rejectionReason).toBe('Fake listing — duplicate')
  })
})

// ── Tests: GET /api/admin/audit-log ───────────────────────────────────────────

describe('GET /api/admin/audit-log', () => {
  beforeEach(() => vi.resetModules())

  it('returns 401 without key', async () => {
    const { GET } = await import('../audit-log/route')
    const res = await GET(makeReq('http://localhost/api/admin/audit-log', { key: null }))
    expect(res.status).toBe(401)
  })

  it('returns audit entries array', async () => {
    const { GET } = await import('../audit-log/route')
    const res = await GET(makeReq('http://localhost/api/admin/audit-log'))
    expect(res.status).toBe(200)
    const data = await res.json() as { entries: unknown[]; total: number; page: number; totalPages: number }
    expect(Array.isArray(data.entries)).toBe(true)
    expect(typeof data.total).toBe('number')
    expect(typeof data.page).toBe('number')
    expect(typeof data.totalPages).toBe('number')
  })

  it('filters audit log by action', async () => {
    const { GET } = await import('../audit-log/route')
    const res = await GET(makeReq('http://localhost/api/admin/audit-log?action=approved'))
    expect(res.status).toBe(200)
    const data = await res.json() as { entries: Array<{ action: string }> }
    data.entries.forEach((e) => expect(e.action).toBe('approved'))
  })
})

// ── Tests: POST /api/admin/listings/[id]/note ─────────────────────────────────

describe('POST /api/admin/listings/[id]/note', () => {
  beforeEach(() => vi.resetModules())

  it('returns 401 without key', async () => {
    const { POST } = await import('../listings/[id]/note/route')
    const res = await POST(
      makeReq('http://localhost/api/admin/listings/listing-001/note', { method: 'POST', key: null }),
      { params: Promise.resolve({ id: 'listing-001' }) },
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when note is empty', async () => {
    const { POST } = await import('../listings/[id]/note/route')
    const res = await POST(
      makeReq('http://localhost/api/admin/listings/listing-001/note', { method: 'POST', body: { note: '' } }),
      { params: Promise.resolve({ id: 'listing-001' }) },
    )
    expect(res.status).toBe(400)
  })

  it('saves a verification note', async () => {
    const { POST } = await import('../listings/[id]/note/route')
    const res = await POST(
      makeReq('http://localhost/api/admin/listings/listing-001/note', { method: 'POST', body: { note: 'Verified via phone callback' } }),
      { params: Promise.resolve({ id: 'listing-001' }) },
    )
    expect(res.status).toBe(200)
    const data = await res.json() as { ok: boolean }
    expect(data.ok).toBe(true)
  })
})
