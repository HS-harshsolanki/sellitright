import { NextRequest, NextResponse } from 'next/server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chatTable(client: ReturnType<typeof createServiceClient>, table: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).from(table)
}

// PATCH /api/chat/threads/[threadId]/status
// Seller-only: set thread status to 'disabled' (block buyer) or 'active' (unblock).
// Body: { status: 'active' | 'disabled' }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to manage conversations.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const newStatus = (body as { status?: unknown })?.status
  if (newStatus !== 'active' && newStatus !== 'disabled') {
    return NextResponse.json({ error: 'status must be "active" or "disabled".' }, { status: 400 })
  }

  const admin = createServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })

  const { data: thread, error: threadError } = await chatTable(admin, 'chat_threads')
    .select('id, seller_id, status')
    .eq('id', threadId)
    .maybeSingle()

  if (threadError || !thread) {
    return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })
  }

  if (thread.seller_id !== user.id) {
    return NextResponse.json(
      { error: 'Only the seller can manage this conversation.' },
      { status: 403 },
    )
  }

  if (thread.status === 'locked') {
    return NextResponse.json({ error: 'Locked conversations cannot be modified.' }, { status: 403 })
  }

  const { error } = await chatTable(admin, 'chat_threads')
    .update({ status: newStatus })
    .eq('id', threadId)

  if (error) {
    return NextResponse.json({ error: 'Failed to update conversation status.' }, { status: 500 })
  }

  return NextResponse.json({ status: newStatus })
}
