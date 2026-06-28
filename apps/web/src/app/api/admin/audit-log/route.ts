import crypto from 'crypto'

import { NextRequest, NextResponse } from 'next/server'

import { auditLog } from '@/lib/audit-log'
import { createServiceClient } from '@/lib/supabase/server'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_KEY) return false
  const provided = request.headers.get('x-admin-key') ?? ''
  if (provided.length !== ADMIN_KEY.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(ADMIN_KEY))
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') ?? '25', 10)))
  const action = searchParams.get('action') ?? ''
  const listingId = searchParams.get('listing_id') ?? ''

  // ── Supabase path ────────────────────────────────────────────────────────
  const supabase = createServiceClient()
  if (supabase) {
    try {
      let q = supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (action) q = q.eq('action', action)
      if (listingId) q = q.eq('listing_id', listingId)

      q = q.range((page - 1) * limit, page * limit - 1)

      const { data, error, count } = await q

      if (!error && data) {
        const total = count ?? data.length
        const totalPages = Math.max(1, Math.ceil(total / limit))
        return NextResponse.json({ entries: data, total, page, totalPages })
      }

      console.error('[admin/audit-log] Supabase error:', error?.message)
    } catch (err) {
      console.error('[admin/audit-log] unexpected error:', err)
    }
  }

  // ── In-memory fallback ───────────────────────────────────────────────────
  const entries = auditLog.getAll({
    action: action || undefined,
    listingId: listingId || undefined,
  })
  const total = entries.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const items = entries.slice((page - 1) * limit, page * limit)

  return NextResponse.json({ entries: items, total, page, totalPages })
}
