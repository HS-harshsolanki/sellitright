import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/notifications/:id
// Marks a single notification as read.
export async function PATCH(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params

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

  // RLS ensures only the owner's rows can be updated
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[notifications/[id]] update error:', error.message)
    return NextResponse.json({ error: 'Failed to mark notification.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
