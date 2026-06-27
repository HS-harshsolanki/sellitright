import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: string
  entityType: string | null
  entityId: string | null
  read: boolean
  createdAt: string
}

// GET /api/notifications
// Returns the authenticated user's notifications.
// Query params:
//   limit:       number   (default 20)
//   page:        number   (default 1)
//   unread_only: boolean  (default false)
export async function GET(request: NextRequest) {
  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    return NextResponse.json({ notifications: [], total: 0, unreadCount: 0 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ notifications: [], total: 0, unreadCount: 0 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const unreadOnly = searchParams.get('unread_only') === 'true'
  const offset = (page - 1) * limit

  let query = supabase
    .from('notifications')
    .select('id, title, message, type, entity_type, entity_id, read, created_at', {
      count: 'exact',
    })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (unreadOnly) {
    query = query.eq('read', false)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('[notifications] fetch error:', error.message)
    return NextResponse.json({ notifications: [], total: 0, unreadCount: 0 })
  }

  // Separate unread count query (always total unread, not filtered by page)
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  const notifications: NotificationItem[] = (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    message: row.message as string,
    type: row.type as string,
    entityType: (row.entity_type as string | null) ?? null,
    entityId: (row.entity_id as string | null) ?? null,
    read: row.read as boolean,
    createdAt: row.created_at as string,
  }))

  return NextResponse.json({
    notifications,
    total: count ?? 0,
    unreadCount: unreadCount ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  })
}
