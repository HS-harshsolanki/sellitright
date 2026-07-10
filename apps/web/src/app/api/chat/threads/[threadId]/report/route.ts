import { NextRequest, NextResponse } from 'next/server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chatTable(client: ReturnType<typeof createServiceClient>, table: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).from(table)
}

const VALID_REASONS = ['SPAM', 'ABUSIVE', 'SHARING_CONTACT', 'SCAM', 'OTHER'] as const

type ReportReason = (typeof VALID_REASONS)[number]

// POST /api/chat/threads/[threadId]/report
// Either participant can report the other party in the conversation.
// Body: { reason: ReportReason; details?: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to submit a report.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { reason, details } = body as { reason?: unknown; details?: unknown }

  if (!reason || !VALID_REASONS.includes(reason as ReportReason)) {
    return NextResponse.json(
      { error: `reason must be one of: ${VALID_REASONS.join(', ')}` },
      { status: 400 },
    )
  }

  if (details !== undefined && (typeof details !== 'string' || details.length > 500)) {
    return NextResponse.json(
      { error: 'details must be a string under 500 characters.' },
      { status: 400 },
    )
  }

  const admin = createServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })

  const { data: thread, error: threadError } = await chatTable(admin, 'chat_threads')
    .select('id, buyer_id, seller_id')
    .eq('id', threadId)
    .maybeSingle()

  if (threadError || !thread) {
    return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })
  }

  const isBuyer = thread.buyer_id === user.id
  const isSeller = thread.seller_id === user.id
  if (!isBuyer && !isSeller) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  const targetUserId = isBuyer ? thread.seller_id : thread.buyer_id
  const reporterRole = isBuyer ? 'buyer' : 'seller'

  const { error } = await admin.from('reports').insert({
    reporter_id: user.id,
    reporter_role: reporterRole,
    target_user_id: targetUserId,
    reason: reason as ReportReason,
    details: typeof details === 'string' ? details.trim() : null,
    status: 'OPEN',
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to submit report.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
