import { NextRequest, NextResponse } from 'next/server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

function chatTable(client: ReturnType<typeof createServiceClient>, table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).from(table)
}

export interface ChatThreadItem {
  id: string
  interestId: string
  listingId: string
  listingTitle: string | null
  listingCity: string | null
  otherPartyName: string | null
  otherPartyInitials: string
  lastMessageAt: string | null
  unreadCount: number
  status: 'active' | 'locked' | 'disabled'
  role: 'buyer' | 'seller'
}

export interface ThreadsResponse {
  threads: ChatThreadItem[]
  myOffenseCount: number
  isPhoneBlocked: boolean
}

function deriveInitials(fullName: string | null, email: string | null): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2)
      return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
    if (parts[0] && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase()
  }
  if (email) {
    const local = email.split('@')[0] ?? ''
    const parts = local.split(/[._-]/).filter(Boolean)
    if (parts.length >= 2) return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
    if (local.length >= 2) return local.slice(0, 2).toUpperCase()
    if (local.length === 1) return local.toUpperCase()
  }
  return '?'
}

// GET /api/chat/threads
export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to view messages.' }, { status: 401 })
  }

  const admin = createServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })

  const { data: threads, error } = await chatTable(admin, 'chat_threads')
    .select(
      `id, interest_id, listing_id, buyer_id, seller_id, status,
       buyer_unread, seller_unread, last_message_at`,
    )
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: 'Failed to load conversations.' }, { status: 500 })
  }

  if (!threads || threads.length === 0) {
    const [emptyViolations, emptyBlock] = await Promise.all([
      chatTable(admin, 'chat_violations')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', user.id),
      chatTable(admin, 'phone_block_flags')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),
    ])
    return NextResponse.json({
      threads: [],
      myOffenseCount: emptyViolations.count ?? 0,
      isPhoneBlocked: !!emptyBlock.data,
    })
  }

  const otherPartyIds = (threads as Array<{ buyer_id: string; seller_id: string }>).map((t) =>
    t.buyer_id === user.id ? t.seller_id : t.buyer_id,
  )
  const listingIds = (threads as Array<{ listing_id: string }>).map((t) => t.listing_id)

  const [profilesResult, listingsResult, violationCountResult, phoneBlockResult] =
    await Promise.all([
      admin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', [...new Set(otherPartyIds)]),
      admin
        .from('listings')
        .select('id, title, city')
        .in('id', [...new Set(listingIds)]),
      chatTable(admin, 'chat_violations')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', user.id),
      chatTable(admin, 'phone_block_flags')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),
    ])

  const profileMap = new Map(
    (
      (profilesResult.data ?? []) as Array<{
        id: string
        full_name: string | null
        email: string | null
      }>
    ).map((p) => [p.id, { fullName: p.full_name, email: p.email }]),
  )

  const missingIds = [...new Set(otherPartyIds)].filter((id) => !profileMap.has(id))
  if (missingIds.length > 0) {
    const authFallbacks = await Promise.all(
      missingIds.map((id) => admin.auth.admin.getUserById(id).catch(() => null)),
    )
    for (const result of authFallbacks) {
      const u = result?.data?.user
      if (!u) continue
      profileMap.set(u.id, {
        fullName: (u.user_metadata?.full_name as string | undefined) ?? null,
        email: u.email ?? null,
      })
    }
  }

  const listingMap = new Map(
    (
      (listingsResult.data ?? []) as Array<{
        id: string
        title: string | null
        city: string | null
      }>
    ).map((l) => [l.id, l]),
  )

  const result: ChatThreadItem[] = (
    threads as Array<{
      id: string
      interest_id: string
      listing_id: string
      buyer_id: string
      seller_id: string
      status: 'active' | 'locked' | 'disabled'
      buyer_unread: number
      seller_unread: number
      last_message_at: string | null
    }>
  ).map((t) => {
    const isBuyer = t.buyer_id === user.id
    const otherPartyId = isBuyer ? t.seller_id : t.buyer_id
    const listing = listingMap.get(t.listing_id)
    const profile = profileMap.get(otherPartyId)
    return {
      id: t.id,
      interestId: t.interest_id,
      listingId: t.listing_id,
      listingTitle: listing?.title ?? null,
      listingCity: listing?.city ?? null,
      otherPartyName: profile?.fullName ?? null,
      otherPartyInitials: deriveInitials(profile?.fullName ?? null, profile?.email ?? null),
      lastMessageAt: t.last_message_at,
      unreadCount: isBuyer ? t.buyer_unread : t.seller_unread,
      status: t.status,
      role: isBuyer ? 'buyer' : 'seller',
    }
  })

  const myOffenseCount = violationCountResult.count ?? 0
  const isPhoneBlocked = !!phoneBlockResult.data

  return NextResponse.json({ threads: result, myOffenseCount, isPhoneBlocked })
}
