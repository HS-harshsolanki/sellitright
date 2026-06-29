import { NextRequest, NextResponse } from 'next/server'

import { isAuthorized } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase/server'

export interface UserAdminItem {
  id: string
  email: string | null
  phone: string | null
  name: string | null
  createdAt: string
  currentFlag: string | null
  riskScore: number | null
  riskLevel: string | null
  listingCount: number
}

// GET /api/admin/users
// List users with optional search and status filters.
// Params: q, status (active|suspended|high-risk), sort (newest|oldest), page, limit
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  const status = searchParams.get('status') ?? ''
  const sort = searchParams.get('sort') ?? 'newest'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') ?? '25', 10)))

  // Fetch a larger batch for filtering (auth API doesn't support server-side text search)
  const { data: usersData, error: usersErr } = await admin.auth.admin.listUsers({
    perPage: 1000, // get enough to search across
  })

  if (usersErr || !usersData) {
    console.error('[admin/users] list error:', usersErr?.message)
    return NextResponse.json({ error: 'Failed to load users.' }, { status: 500 })
  }

  let authUsers = usersData.users

  // Client-side search filter on email/phone/name
  if (q) {
    const lq = q.toLowerCase()
    authUsers = authUsers.filter(
      (u) =>
        u.email?.toLowerCase().includes(lq) ||
        u.phone?.includes(q) ||
        (u.user_metadata?.full_name as string | undefined)?.toLowerCase().includes(lq),
    )
  }

  if (sort === 'oldest') {
    authUsers = [...authUsers].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
  }

  const userIds = authUsers.map((u) => u.id)

  if (userIds.length === 0) {
    return NextResponse.json({ users: [], total: 0, page, totalPages: 0 })
  }

  // Fetch risk scores + flags + listing counts in parallel
  const [riskRes, flagRes, listingRes] = await Promise.all([
    admin.from('risk_scores').select('user_id, score, level').in('user_id', userIds),
    admin.from('latest_user_flag').select('user_id, flag').in('user_id', userIds),
    admin
      .from('listings')
      .select('seller_id', { count: 'exact' })
      .in('seller_id', userIds)
      .in('status', ['ACTIVE', 'PENDING_REVIEW', 'DRAFT']),
  ])

  const riskMap = new Map(
    (riskRes.data ?? []).map((r) => [r.user_id as string, r as { score: number; level: string }]),
  )
  const flagMap = new Map((flagRes.data ?? []).map((f) => [f.user_id as string, f.flag as string]))

  // Count listings per seller
  const listingCountMap = new Map<string, number>()
  for (const row of listingRes.data ?? []) {
    const sid = (row as { seller_id: string }).seller_id
    listingCountMap.set(sid, (listingCountMap.get(sid) ?? 0) + 1)
  }

  let users: UserAdminItem[] = authUsers.map((u) => {
    const risk = riskMap.get(u.id)
    return {
      id: u.id,
      email: u.email ?? null,
      phone: u.phone ?? (u.user_metadata?.phone as string | undefined) ?? null,
      name: (u.user_metadata?.full_name as string | undefined) ?? null,
      createdAt: u.created_at,
      currentFlag: flagMap.get(u.id) ?? null,
      riskScore: risk?.score ?? null,
      riskLevel: risk?.level ?? null,
      listingCount: listingCountMap.get(u.id) ?? 0,
    }
  })

  // Status filter (applied after enrichment but before pagination)
  if (status === 'suspended') {
    users = users.filter((u) => u.currentFlag === 'SUSPENDED')
  } else if (status === 'high-risk') {
    users = users.filter((u) => u.riskLevel === 'HIGH')
  } else if (status === 'active') {
    users = users.filter((u) => u.currentFlag !== 'SUSPENDED')
  }

  // Manual pagination on filtered results
  const total = users.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const start = (page - 1) * limit
  const paginated = users.slice(start, start + limit)

  return NextResponse.json({ users: paginated, total, page, totalPages })
}
