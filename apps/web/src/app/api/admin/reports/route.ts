import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/server'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_KEY) return false
  const provided = request.headers.get('x-admin-key') ?? ''
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(ADMIN_KEY))
  } catch {
    return false
  }
}

// GET /api/admin/reports
//
// Query params:
//   status:        OPEN | REVIEWED | ACTIONED | DISMISSED  (default: OPEN)
//   reporter_role: buyer | seller                          (default: all)
//   page:          number                                  (default: 1)
//   limit:         number  10-100                          (default: 20)
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? 'OPEN'
  const reporterRole = searchParams.get('reporter_role')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') ?? '20', 10)))
  const offset = (page - 1) * limit

  const validStatuses = ['OPEN', 'REVIEWED', 'ACTIONED', 'DISMISSED', 'ALL']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status filter.' }, { status: 400 })
  }

  let query = admin
    .from('reports')
    .select(
      'id, reporter_id, reporter_role, target_user_id, target_listing_id, reason, details, status, reviewed_by, reviewed_at, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status !== 'ALL') {
    query = query.eq('status', status)
  }

  if (reporterRole === 'buyer' || reporterRole === 'seller') {
    query = query.eq('reporter_role', reporterRole)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[admin/reports] fetch error:', error.message)
    return NextResponse.json({ error: 'Failed to load reports.' }, { status: 500 })
  }

  const total = count ?? 0
  return NextResponse.json({
    reports: data ?? [],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}

// PATCH /api/admin/reports
// Bulk-update report status (reviewed, actioned, dismissed).
// Body: { ids: string[], status: 'REVIEWED' | 'ACTIONED' | 'DISMISSED' }
export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { ids, status } = body as { ids?: unknown; status?: unknown }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array.' }, { status: 400 })
  }

  if (ids.length > 100) {
    return NextResponse.json({ error: 'Maximum 100 report IDs per request.' }, { status: 400 })
  }

  const validStatuses = ['REVIEWED', 'ACTIONED', 'DISMISSED']
  if (!validStatuses.includes(status as string)) {
    return NextResponse.json(
      { error: `status must be one of: ${validStatuses.join(', ')}` },
      { status: 400 },
    )
  }

  const { error, count } = await admin
    .from('reports')
    .update({
      status: status as string,
      reviewed_by: 'api_key',
      reviewed_at: new Date().toISOString(),
    })
    .in('id', ids as string[])

  if (error) {
    console.error('[admin/reports] bulk update error:', error.message)
    return NextResponse.json({ error: 'Failed to update reports.' }, { status: 500 })
  }

  return NextResponse.json({ updated: count ?? ids.length })
}
