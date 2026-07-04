import { NextRequest, NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
import { containsPhoneNumber, safeContentPreview } from '@/lib/phone-filter'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function chatTable(client: ReturnType<typeof createServiceClient>, table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).from(table)
}

export interface ChatMessage {
  id: string
  senderId: string
  content: string
  isDeleted: boolean
  createdAt: string
}

// GET /api/chat/threads/[threadId]/messages
// Returns messages for a thread. Marks unread as read.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to view messages.' }, { status: 401 })
  }

  const admin = createServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })

  // Verify the user is a participant
  const { data: thread, error: threadError } = await chatTable(admin, 'chat_threads')
    .select('id, buyer_id, seller_id, status')
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

  const { data: messages, error } = await chatTable(admin, 'chat_messages')
    .select('id, sender_id, content, is_deleted, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: 'Failed to load messages.' }, { status: 500 })
  }

  // Reset unread count for this user
  const unreadField = isBuyer ? 'buyer_unread' : 'seller_unread'
  await chatTable(admin, 'chat_threads')
    .update({ [unreadField]: 0 })
    .eq('id', threadId)

  const result: ChatMessage[] = (
    messages as Array<{
      id: string
      sender_id: string
      content: string
      is_deleted: boolean
      created_at: string
    }>
  ).map((m) => ({
    id: m.id,
    senderId: m.sender_id,
    content: m.is_deleted ? '[Message deleted]' : m.content,
    isDeleted: m.is_deleted,
    createdAt: m.created_at,
  }))

  return NextResponse.json({
    messages: result,
    threadStatus: thread.status,
    role: isBuyer ? 'buyer' : 'seller',
  })
}

// POST /api/chat/threads/[threadId]/messages
// Send a message. Server-side phone number filter applied before storage.
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
    return NextResponse.json({ error: 'Sign in to send messages.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const content = (body as { content?: unknown })?.content
  if (typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 })
  }

  const trimmed = content.trim()
  if (trimmed.length > 2000) {
    return NextResponse.json({ error: 'Message too long (max 2000 characters).' }, { status: 400 })
  }

  const admin = createServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })

  // Verify participant and thread state
  const { data: thread, error: threadError } = await chatTable(admin, 'chat_threads')
    .select('id, buyer_id, seller_id, status')
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

  if (thread.status === 'disabled') {
    return NextResponse.json({ error: 'This conversation has been disabled.' }, { status: 403 })
  }

  if (thread.status === 'locked') {
    return NextResponse.json({ error: 'This conversation is read-only.' }, { status: 403 })
  }

  // Phone number filter — check current message AND sliding window of last 10
  // messages from this sender concatenated, to catch numbers split across msgs.
  const { data: recentMsgs } = await chatTable(admin, 'chat_messages')
    .select('content')
    .eq('thread_id', threadId)
    .eq('sender_id', user.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(10)

  const recentContents = ((recentMsgs as Array<{ content: string }> | null) ?? [])
    .map((m) => m.content)
    .reverse()
  const windowText = [...recentContents, trimmed].join(' ')

  if (containsPhoneNumber(trimmed) || containsPhoneNumber(windowText)) {
    // Log violation
    const { data: priorViolations } = await chatTable(admin, 'chat_violations')
      .select('id', { count: 'exact', head: true })
      .eq('thread_id', threadId)
      .eq('sender_id', user.id)

    const offenseNumber = ((priorViolations as null | { count: number })?.count ?? 0) + 1

    await chatTable(admin, 'chat_violations').insert({
      thread_id: threadId,
      sender_id: user.id,
      content_preview: safeContentPreview(trimmed),
      offense_number: offenseNumber,
    })

    logger.warn('[chat] phone number blocked', {
      userId: user.id,
      threadId,
      offense: offenseNumber,
    })

    // 3rd offense: auto-report to admin
    if (offenseNumber >= 3) {
      const recipientId = isBuyer ? thread.seller_id : thread.buyer_id
      await admin.from('reports').insert({
        reporter_id: recipientId,
        reporter_role: isBuyer ? 'seller' : 'buyer',
        target_user_id: user.id,
        reason: 'SHARING_CONTACT',
        details: `Auto-reported after ${offenseNumber} phone-sharing attempts in chat thread ${threadId}`,
        status: 'OPEN',
      })
    }

    const warningMsg =
      offenseNumber >= 2
        ? 'Sharing contact details bypasses our platform and violates our Terms. Continued violations may result in account suspension.'
        : "Phone numbers can't be shared here. Use the Call or WhatsApp buttons to connect after unlocking contact."

    return NextResponse.json({ error: warningMsg, code: 'PHONE_NUMBER_BLOCKED' }, { status: 422 })
  }

  // Insert message
  const { data: msgRaw, error: insertError } = await chatTable(admin, 'chat_messages')
    .insert({
      thread_id: threadId,
      sender_id: user.id,
      content: trimmed,
    })
    .select('id, sender_id, content, is_deleted, created_at')
    .single()

  if (insertError || !msgRaw) {
    logger.error('[chat] message insert failed', { error: insertError?.message })
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msg = msgRaw as any

  // Update last_message_at on the thread
  const unreadField = isBuyer ? 'seller_unread' : 'buyer_unread'
  await chatTable(admin, 'chat_threads')
    .update({ last_message_at: msg.created_at })
    .eq('id', threadId)

  // Increment unread count for other party with a second update
  const { data: currentThread } = await chatTable(admin, 'chat_threads')
    .select(`${unreadField}`)
    .eq('id', threadId)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUnread = (currentThread as any)?.[unreadField] ?? 0
  await chatTable(admin, 'chat_threads')
    .update({ [unreadField]: currentUnread + 1 })
    .eq('id', threadId)

  // Notify the other party
  const recipientId = isBuyer ? thread.seller_id : thread.buyer_id
  const senderProfile = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()
  const senderName =
    (senderProfile.data as { full_name: string | null } | null)?.full_name ?? 'Someone'

  await admin.from('notifications').insert({
    user_id: recipientId,
    title: 'New message',
    message: `${senderName}: ${trimmed.slice(0, 60)}${trimmed.length > 60 ? '…' : ''}`,
    type: 'NewChatMessage',
    entity_type: 'chat_thread',
    entity_id: threadId,
  })

  return NextResponse.json({
    message: {
      id: msg.id,
      senderId: msg.sender_id,
      content: msg.content,
      isDeleted: msg.is_deleted,
      createdAt: msg.created_at,
    } as ChatMessage,
  })
}
