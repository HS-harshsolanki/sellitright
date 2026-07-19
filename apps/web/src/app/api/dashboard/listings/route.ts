import { NextRequest, NextResponse } from 'next/server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    let supabase: Awaited<ReturnType<typeof createClient>>
    try {
      supabase = await createClient()
    } catch {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError) console.warn('[dashboard/listings] auth error:', authError.message)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.min(500, Math.max(1, parseInt(searchParams.get('page') ?? '1', 10)))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))
    const offset = (page - 1) * limit

    const { data, error, count } = await supabase
      .from('listings')
      .select(
        'id, title, price, property_type, bhk_type, built_up_area, furnishing, bathrooms, balconies, city, locality, image_urls, status, is_verified, view_count, rejection_reason, created_at, updated_at',
        { count: 'exact' },
      )
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[dashboard/listings] select error:', error?.message)
      return NextResponse.json({ error: 'Failed to load listings' }, { status: 500 })
    }

    const rows = data ?? []

    // Fetch interested_count per listing (buyers who expressed interest, any status)
    const interestedCounts: Record<string, number> = {}
    if (rows.length > 0) {
      const admin = createServiceClient()
      if (admin) {
        const listingIds = rows.map((r) => r.id)
        const { data: interestData } = await admin
          .from('buyer_interest')
          .select('listing_id')
          .in('listing_id', listingIds)
          .in('status', ['PENDING', 'ACCEPTED'])

        if (interestData) {
          for (const row of interestData) {
            interestedCounts[row.listing_id] = (interestedCounts[row.listing_id] ?? 0) + 1
          }
        }
      }
    }

    const listings = rows.map((r) => ({
      ...r,
      interested_count: interestedCounts[r.id] ?? 0,
    }))

    const total = count ?? 0
    return NextResponse.json(
      { listings, total, page, totalPages: Math.ceil(total / limit) },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
