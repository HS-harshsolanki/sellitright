import { NextRequest, NextResponse } from 'next/server'

import type { ChatMessage } from '@/lib/chat-types'
import { logger } from '@/lib/logger'
import {
  containsPhoneNumber,
  containsPhoneNumberInWindow,
  safeContentPreview,
} from '@/lib/phone-filter'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export type { ChatMessage }

const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

interface RateEntry {
  count: number
  windowStart: number
}

const rateLimitMap = new Map<string, RateEntry>()

function checkRateLimit(userId: string, threadId: string): boolean {
  const key = `${userId}:${threadId}`
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now - entry.windowStart >= RATE_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, windowStart: now })
    if (rateLimitMap.size > 10_000) {
      for (const [k, v] of rateLimitMap) {
        if (now - v.windowStart >= RATE_WINDOW_MS) rateLimitMap.delete(k)
      }
    }
    return true
  }

  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

function chatTable(client: ReturnType<typeof createServiceClient>, table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).from(table)
}

// GET /api/chat/threads/[threadId]/messages
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

  const unreadField = isBuyer ? 'buyer_unread' : 'seller_unread'
  await chatTable(admin, 'chat_threads')
    .update({ [unreadField]: 0 })
    .eq('id', threadId)

  const otherPartyId = isBuyer ? thread.seller_id : thread.buyer_id
  const [
    otherPartyProfile,
    violationCountResult,
    phoneBlockResult,
    otherPartyViolationResult,
    otherPartyBlockResult,
  ] = await Promise.all([
    admin.from('profiles').select('full_name').eq('id', otherPartyId).maybeSingle(),
    chatTable(admin, 'chat_violations')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', user.id),
    chatTable(admin, 'phone_block_flags')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
    chatTable(admin, 'chat_violations')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', otherPartyId),
    chatTable(admin, 'phone_block_flags')
      .select('id')
      .eq('user_id', otherPartyId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
  ])

  const otherPartyName =
    (otherPartyProfile.data as { full_name: string | null } | null)?.full_name ?? null
  const priorOffenseCount = violationCountResult.count ?? 0
  const isPhoneBlocked = !!phoneBlockResult.data
  const otherPartyOffenseCount = otherPartyViolationResult.count ?? 0
  const otherPartyIsPhoneBlocked = !!otherPartyBlockResult.data

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
    otherPartyName,
    priorOffenseCount,
    isPhoneBlocked,
    otherPartyOffenseCount,
    otherPartyIsPhoneBlocked,
  })
}

// POST /api/chat/threads/[threadId]/messages
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

  if (!checkRateLimit(user.id, threadId)) {
    return NextResponse.json(
      { error: 'Too many messages. Please wait a moment before sending again.' },
      { status: 429 },
    )
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

  const { data: phoneBlockRow } = await chatTable(admin, 'phone_block_flags')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (phoneBlockRow) {
    const { count: blockOffenseCount } = await chatTable(admin, 'chat_violations')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', user.id)
    return NextResponse.json(
      {
        error:
          'Your account has been restricted from sharing contact information. Please contact support.',
        code: 'PHONE_SEND_BLOCKED',
        offenseNumber: blockOffenseCount ?? 3,
      },
      { status: 403 },
    )
  }

  const { data: recentRaw } = await chatTable(admin, 'chat_messages')
    .select('content')
    .eq('thread_id', threadId)
    .eq('sender_id', user.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(8)

  const recentMessages: string[] = ((recentRaw as Array<{ content: string }> | null) ?? [])
    .map((m) => m.content)
    .reverse()

  const isBlocked =
    containsPhoneNumber(trimmed) || containsPhoneNumberInWindow(recentMessages, trimmed)

  if (isBlocked) {
    const { count: priorCount } = await chatTable(admin, 'chat_violations')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', user.id)

    const offenseNumber = (priorCount ?? 0) + 1
    const contentPreview = safeContentPreview(trimmed)

    await chatTable(admin, 'chat_violations').insert({
      thread_id: threadId,
      sender_id: user.id,
      content_preview: contentPreview,
      offense_number: offenseNumber,
    })

    logger.warn('[chat] phone number blocked', {
      userId: user.id,
      threadId,
      offense: offenseNumber,
    })

    await chatTable(admin, 'chat_messages').update({ is_deleted: true }).eq('thread_id', threadId)

    await chatTable(admin, 'chat_threads')
      .update({ buyer_unread: 0, seller_unread: 0 })
      .eq('id', threadId)

    const offenseLabel =
      offenseNumber >= 3
        ? `This is violation #${offenseNumber}. Your account has been auto-flagged for admin review.`
        : `This is violation #${offenseNumber}/3. A 3rd attempt will flag your account.`

    await admin.from('notifications').insert({
      user_id: user.id,
      title: 'Chat cleared — phone number detected',
      message: `Your message contained a phone number. The entire conversation has been cleared. ${offenseLabel}`,
      type: 'PhoneViolationWarning',
      entity_type: 'chat_thread',
      entity_id: threadId,
    })

    const otherPartyId = isBuyer ? thread.seller_id : thread.buyer_id
    await admin.from('notifications').insert({
      user_id: otherPartyId,
      title: 'Conversation cleared',
      message:
        'A phone number was detected in this conversation. The chat has been cleared to protect platform integrity.',
      type: 'PhoneViolationWarning',
      entity_type: 'chat_thread',
      entity_id: threadId,
    })

    await admin.from('reports').insert({
      reporter_id: otherPartyId,
      reporter_role: isBuyer ? 'seller' : 'buyer',
      target_user_id: user.id,
      reason: 'SHARING_CONTACT',
      details: `[Auto] Offense #${offenseNumber} in thread ${threadId} — attempted message: "${contentPreview}"`,
      status: 'OPEN',
    })

    if (offenseNumber >= 3) {
      const { data: existingBlock } = await chatTable(admin, 'phone_block_flags')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (!existingBlock) {
        await chatTable(admin, 'phone_block_flags').insert({
          user_id: user.id,
          is_active: true,
          reason: `Auto-blocked after ${offenseNumber} phone-sharing attempts`,
          created_by: 'auto',
        })
      }

      return NextResponse.json(
        {
          error:
            'Your account has been automatically restricted after 3 phone-sharing attempts. Only an admin can restore access. Please contact support.',
          code: 'PHONE_SEND_BLOCKED',
          offenseNumber,
          chatCleared: true,
        },
        { status: 403 },
      )
    }

    const warningMsg =
      offenseNumber === 2
        ? `Warning ${offenseNumber}/3: Phone number detected — conversation cleared. One more attempt will automatically restrict your account.`
        : `Warning ${offenseNumber}/3: Phone numbers can't be shared here. Use the Call or WhatsApp buttons after unlocking contact. The conversation has been cleared.`

    return NextResponse.json(
      { error: warningMsg, code: 'PHONE_NUMBER_BLOCKED', offenseNumber, chatCleared: true },
      { status: 422 },
    )
  }

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

  const unreadField = isBuyer ? 'seller_unread' : 'buyer_unread'
  await chatTable(admin, 'chat_threads')
    .update({ last_message_at: msg.created_at })
    .eq('id', threadId)

  const { data: currentThread } = await chatTable(admin, 'chat_threads')
    .select(`${unreadField}`)
    .eq('id', threadId)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUnread = (currentThread as any)?.[unreadField] ?? 0
  await chatTable(admin, 'chat_threads')
    .update({ [unreadField]: currentUnread + 1 })
    .eq('id', threadId)

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
