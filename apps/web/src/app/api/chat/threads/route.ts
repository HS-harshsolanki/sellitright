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
  lastMessageAt: string | null
  unreadCount: number
  status: 'active' | 'locked' | 'disabled'
  role: 'buyer' | 'seller'
}

// GET /api/chat/threads
// Returns all chat threads for the authenticated user (as buyer or seller).
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

  // Fetch threads where user is buyer or seller
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
    return NextResponse.json({ threads: [] })
  }

  // Gather other-party IDs and listing IDs for enrichment
  const otherPartyIds = (threads as Array<{ buyer_id: string; seller_id: string }>).map((t) =>
    t.buyer_id === user.id ? t.seller_id : t.buyer_id,
  )
  const listingIds = (threads as Array<{ listing_id: string }>).map((t) => t.listing_id)

  const [profilesResult, listingsResult] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name')
      .in('id', [...new Set(otherPartyIds)]),
    admin
      .from('listings')
      .select('id, title, city')
      .in('id', [...new Set(listingIds)]),
  ])

  const profileMap = new Map(
    ((profilesResult.data ?? []) as Array<{ id: string; full_name: string | null }>).map((p) => [
      p.id,
      p.full_name,
    ]),
  )
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
    return {
      id: t.id,
      interestId: t.interest_id,
      listingId: t.listing_id,
      listingTitle: listing?.title ?? null,
      listingCity: listing?.city ?? null,
      otherPartyName: profileMap.get(otherPartyId) ?? null,
      lastMessageAt: t.last_message_at,
      unreadCount: isBuyer ? t.buyer_unread : t.seller_unread,
      status: t.status,
      role: isBuyer ? 'buyer' : 'seller',
    }
  })

  return NextResponse.json({ threads: result })
}
