import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { mapSupabaseListingToMock } from '@/lib/listing-mapper'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { createClient } from '@/lib/supabase/server'
import { listingFilterSchema } from '@/lib/validators'

export async function GET(request: NextRequest) {
  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams.entries())
    const parsed = listingFilterSchema.parse(raw)

    const {
      city,
      locality,
      bhkType,
      furnishing,
      propertyType,
      minPrice,
      maxPrice,
      page,
      limit,
      sort,
    } = parsed

    // ── Supabase path ──────────────────────────────────────────────────────
    if (isSupabaseConfigured()) {
      const supabase = await createClient()
      let query = supabase
        .from('listings')
        .select(
          'id, title, price, property_type, bhk_type, built_up_area, carpet_area, furnishing, city, locality, address, pincode, state, image_urls, status, is_verified, view_count, created_at, seller_id',
          { count: 'exact' },
        )
        .eq('status', 'ACTIVE')

      if (city) {
        // Use full-text search via the search_vector generated column (GIN index).
        // This replaces the ILIKE sequential scan and handles multi-word queries.
        const safeCity = city.replace(/['"\\;]/g, '').trim()
        if (safeCity) query = query.textSearch('search_vector', safeCity, { type: 'plain' })
      }
      if (locality) {
        const safeLocality = locality.replace(/[%_,()\\.]/g, '')
        if (safeLocality) query = query.ilike('locality', `%${safeLocality}%`)
      }
      if (bhkType) query = query.eq('bhk_type', bhkType)
      if (furnishing) query = query.eq('furnishing', furnishing)
      if (propertyType) query = query.eq('property_type', propertyType)
      if (minPrice !== undefined) query = query.gte('price', minPrice)
      if (maxPrice !== undefined) query = query.lte('price', maxPrice)

      // Sorting
      if (sort === 'price_asc') query = query.order('price', { ascending: true })
      else if (sort === 'price_desc') query = query.order('price', { ascending: false })
      else if (sort === 'oldest') query = query.order('created_at', { ascending: true })
      else query = query.order('created_at', { ascending: false }) // newest (default)

      // Pagination
      const from = (page - 1) * limit
      query = query.range(from, from + limit - 1)

      const { data, error, count } = await query

      if (!error && data) {
        const listings = data.map(mapSupabaseListingToMock)
        const total = count ?? listings.length
        const totalPages = Math.max(1, Math.ceil(total / limit))
        return NextResponse.json(
          { listings, total, page, totalPages },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
              Vary: 'Accept-Encoding',
            },
          },
        )
      }

      // Supabase query error — degrade gracefully to empty result set
      console.error('[api/listings] Supabase query error:', error?.message ?? String(error))
      return NextResponse.json({ listings: [], total: 0, page, totalPages: 1 })
    }

    // Supabase not configured
    return NextResponse.json({ listings: [], total: 0, page, totalPages: 1 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', issues: error.errors },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
