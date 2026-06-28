import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

// PATCH /api/notifications/read-all
// Marks all of the authenticated user's unread notifications as read.
export async function PATCH() {
  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    return NextResponse.json({ error: 'Sign in to mark notifications.' }, { status: 401 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to mark notifications.' }, { status: 401 })
  }

  const { error, count } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)

  if (error) {
    console.error('[notifications/read-all] update error:', error.message)
    return NextResponse.json({ error: 'Failed to mark all notifications.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, updated: count ?? 0 })
}
