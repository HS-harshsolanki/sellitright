import { NextResponse } from 'next/server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export interface BuyerRequestItem {
  id: string
  listingId: string
  listingTitle: string
  listingCity: string
  listingLocality: string
  listingPrice: number
  listingImageUrl: string | null
  listingBhkType: string | null
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN'
  contactUnlocked: boolean
  sellerPhone: string | null
  sellerEmail: string | null
  createdAt: string
  updatedAt: string
}

interface SafeRow {
  id: string
  listing_id: string
  status: string
  contact_unlocked: boolean | null
  seller_phone: string | null
  seller_email: string | null
  created_at: string
  updated_at: string
}

interface ListingRow {
  id: string
  title: string
  city: string
  locality: string
  price: number
  image_urls: string[]
  bhk_type: string | null
}

// GET /api/buyer/requests
// Returns all interest requests submitted by the authenticated buyer.
// Queries buyer_interest_safe view for contact data, then fetches listing details
// separately via service client (bypasses RLS so we can show info even for
// non-ACTIVE listings the buyer has a connection to).
export async function GET() {
  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    return NextResponse.json({ error: 'Sign in to view your requests.' }, { status: 401 })
  }

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Sign in to view your requests.' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('buyer_interest_safe')
    .select(
      'id, listing_id, status, contact_unlocked, seller_phone, seller_email, created_at, updated_at',
    )
    .eq('buyer_id', user.id)
    .not('status', 'eq', 'WITHDRAWN')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[buyer/requests] fetch error:', error.message, 'user:', user.id)
    return NextResponse.json({ error: 'Failed to load your requests.' }, { status: 500 })
  }

  const rows = (data as SafeRow[]) ?? []

  // Fetch listing details separately using the service client so we get data
  // even for listings that are DRAFT/INACTIVE/REJECTED (buyer already has a connection).
  const listingIds = [...new Set(rows.map((r) => r.listing_id).filter(Boolean))]
  const listingMap = new Map<string, ListingRow>()

  if (listingIds.length > 0) {
    const admin = createServiceClient()
    const { data: listings } = await admin
      .from('listings')
      .select('id, title, city, locality, price, image_urls, bhk_type')
      .in('id', listingIds)

    for (const l of listings ?? []) {
      listingMap.set(l.id, l as ListingRow)
    }
  }

  const requests: BuyerRequestItem[] = rows.map((row) => {
    const l = listingMap.get(row.listing_id) ?? null
    const unlocked = row.contact_unlocked === true

    return {
      id: row.id,
      listingId: row.listing_id,
      listingTitle: l?.title ?? 'Property',
      listingCity: l?.city ?? '',
      listingLocality: l?.locality ?? '',
      listingPrice: l?.price ?? 0,
      listingImageUrl: l?.image_urls?.[0] ?? null,
      listingBhkType: l?.bhk_type ?? null,
      status: row.status as BuyerRequestItem['status'],
      contactUnlocked: unlocked,
      sellerPhone: unlocked ? (row.seller_phone ?? null) : null,
      sellerEmail: unlocked ? (row.seller_email ?? null) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  })

  return NextResponse.json({ requests }, { headers: { 'Cache-Control': 'no-store' } })
}
