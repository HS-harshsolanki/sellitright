import { NextRequest, NextResponse } from 'next/server'

import { isAuthorized } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function svc(client: ReturnType<typeof createServiceClient>, table: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).from(table)
}

// GET /api/admin/phone-violations
// Returns chat_violations rows enriched with sender display name and thread info.
// Query params:
//   tab:   unreviewed (default) | all
//   page:  number (default 1)
//   limit: number 10-100 (default 25)
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })

  const { searchParams } = new URL(request.url)
  const tab = searchParams.get('tab') ?? 'unreviewed'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') ?? '25', 10)))
  const offset = (page - 1) * limit

  let query = svc(admin, 'chat_violations').select(
    'id, thread_id, sender_id, content_preview, offense_number, reviewed_at, created_at',
    { count: 'exact' },
  )

  if (tab === 'unreviewed') {
    query = query.is('reviewed_at', null)
  }

  const {
    data: rows,
    count,
    error,
  } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: 'Failed to load violations.' }, { status: 500 })
  }

  type ViolationRow = {
    id: string
    thread_id: string
    sender_id: string
    content_preview: string
    offense_number: number
    reviewed_at: string | null
    created_at: string
  }

  const typedRows = (rows ?? []) as ViolationRow[]

  if (typedRows.length === 0) {
    return NextResponse.json({ violations: [], total: count ?? 0, page, totalPages: 0 })
  }

  // Resolve sender names via auth.admin and thread listing info in parallel
  const senderIds = [...new Set(typedRows.map((r) => r.sender_id))]
  const threadIds = [...new Set(typedRows.map((r) => r.thread_id))]

  const [threadRows, ...authResults] = await Promise.all([
    svc(admin, 'chat_threads').select('id, buyer_id, seller_id').in('id', threadIds),
    ...senderIds.map((id) => admin.auth.admin.getUserById(id)),
  ])

  const threadMap = new Map<string, { buyer_id: string; seller_id: string }>()
  for (const t of (threadRows.data ?? []) as Array<{
    id: string
    buyer_id: string
    seller_id: string
  }>) {
    threadMap.set(t.id, t)
  }

  const nameMap = new Map<string, string>()
  for (let i = 0; i < senderIds.length; i++) {
    const id = senderIds[i]!
    const result = authResults[i] as {
      data: { user: { email?: string; user_metadata?: { full_name?: string } } | null } | null
    }
    const u = result?.data?.user
    nameMap.set(id, u?.user_metadata?.full_name ?? u?.email ?? 'Unknown')
  }

  const violations = typedRows.map((r) => ({
    id: r.id,
    threadId: r.thread_id,
    senderId: r.sender_id,
    senderName: nameMap.get(r.sender_id) ?? 'Unknown',
    contentPreview: r.content_preview,
    offenseNumber: r.offense_number,
    reviewedAt: r.reviewed_at,
    createdAt: r.created_at,
  }))

  return NextResponse.json({
    violations,
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  })
}

// PATCH /api/admin/phone-violations
// Mark one or more violations as reviewed.
// Body: { ids: string[] }
export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const ids = (body as { ids?: unknown })?.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array.' }, { status: 400 })
  }

  const { error } = await svc(admin, 'chat_violations')
    .update({ reviewed_at: new Date().toISOString() })
    .in('id', ids)
    .is('reviewed_at', null)

  if (error) {
    return NextResponse.json({ error: 'Failed to mark as reviewed.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
