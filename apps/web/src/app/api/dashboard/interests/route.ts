import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export interface SellerInterestItem {
  id: string
  listingId: string
  listingTitle: string
  listingCity: string
  listingImageUrl: string | null
  fullName: string
  purpose: 'SELF' | 'INVESTMENT'
  timeline: 'IMMEDIATELY' | 'WITHIN_30_DAYS' | 'ONE_TO_THREE_MONTHS' | 'EXPLORING'
  funding: 'CASH_READY' | 'LOAN_APPROVED' | 'LOAN_IN_PROGRESS'
  message: string | null
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN'
  createdAt: string
  updatedAt: string
  contactUnlocked?: boolean
  buyerPhone?: string | null
  buyerEmail?: string | null
}

// GET /api/dashboard/interests
// Returns buyer interest requests for all listings owned by the authenticated seller.
// Query params:
//   status: ALL | PENDING | ACCEPTED | DECLINED  (default: ALL)
//   sort:   newest | oldest                       (default: newest)
//   page:   number                                (default: 1)
export async function GET(request: NextRequest) {
  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    return NextResponse.json({ error: 'Sign in to view buyer requests.' }, { status: 401 })
  }
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError) console.warn('[dashboard/interests] auth error:', authError.message)

  if (!user) {
    return NextResponse.json({ error: 'Sign in to view buyer requests.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const VALID_STATUSES = ['ALL', 'PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN'] as const
  const rawStatus = searchParams.get('status') ?? 'ALL'
  const statusParam = (VALID_STATUSES as readonly string[]).includes(rawStatus) ? rawStatus : 'ALL'
  const sort = searchParams.get('sort') ?? 'newest'
  const page = Math.min(500, Math.max(1, parseInt(searchParams.get('page') ?? '1', 10)))
  const limit = 20
  const offset = (page - 1) * limit

  let query = supabase
    .from('buyer_interest')
    .select(
      `id, listing_id, full_name, purpose, timeline, funding, message, status, created_at, updated_at,
       contact_unlocked, buyer_phone, buyer_email,
       listings!inner(title, city, image_urls)`,
      { count: 'exact' },
    )
    .eq('seller_id', user.id)

  if (statusParam !== 'ALL') {
    query = query.eq('status', statusParam)
  }

  query = query.order('created_at', { ascending: sort === 'oldest' })
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('[dashboard/interests] fetch error:', error.message)
    return NextResponse.json({ error: 'Failed to load buyer requests.' }, { status: 500 })
  }

  type ListingShape = { title: string; city: string; image_urls?: string[] | null } | null
  const interests: SellerInterestItem[] = (data ?? []).map((row) => {
    const listing = (Array.isArray(row.listings) ? row.listings[0] : row.listings) as ListingShape
    const unlocked = (row as unknown as { contact_unlocked?: boolean }).contact_unlocked === true
    return {
      id: row.id as string,
      listingId: row.listing_id as string,
      listingTitle: listing?.title ?? '',
      listingCity: listing?.city ?? '',
      listingImageUrl:
        listing?.image_urls && listing.image_urls.length > 0
          ? (listing.image_urls[0] ?? null)
          : null,
      fullName: row.full_name as string,
      purpose: row.purpose as SellerInterestItem['purpose'],
      timeline: row.timeline as SellerInterestItem['timeline'],
      funding: row.funding as SellerInterestItem['funding'],
      message: row.message as string | null,
      status: row.status as SellerInterestItem['status'],
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      contactUnlocked: unlocked,
      buyerPhone: unlocked
        ? ((row as unknown as { buyer_phone?: string | null }).buyer_phone ?? null)
        : null,
      buyerEmail: unlocked
        ? ((row as unknown as { buyer_email?: string | null }).buyer_email ?? null)
        : null,
    }
  })

  const total = count ?? 0
  return NextResponse.json(
    { interests, total, page, totalPages: Math.ceil(total / limit) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
