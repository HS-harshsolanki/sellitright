import { unstable_cache } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

export const maxDuration = 10

import { mapSupabaseListingToMock } from '@/lib/listing-mapper'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { createServiceClient } from '@/lib/supabase/server'
import { listingFilterSchema, type ListingFilterInput } from '@/lib/validators'

interface ListingsResult {
  listings: ReturnType<typeof mapSupabaseListingToMock>[]
  total: number
  page: number
  totalPages: number
}

// Cacheable query using service client (public data, no user auth needed).
// unstable_cache deduplicates concurrent requests with identical params — at 500
// concurrent users hitting the same URL, this becomes a single DB round-trip.
async function queryListings(params: ListingFilterInput): Promise<ListingsResult> {
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
  } = params

  const admin = createServiceClient()
  if (!admin) return { listings: [], total: 0, page, totalPages: 1 }

  let query = admin
    .from('listings')
    .select(
      'id, title, description, price, property_type, bhk_type, built_up_area, carpet_area, floor, total_floors, facing, furnishing, bathrooms, balconies, parking, age_of_property, amenities, city, locality, address, pincode, state, image_urls, status, is_verified, view_count, quality_score, quality_breakdown, created_at, seller_id, negotiable',
      { count: 'exact' },
    )
    .eq('status', 'ACTIVE')

  if (city) {
    const safeCity = city.replace(/['"\\;]/g, '').trim()
    if (safeCity) query = query.ilike('city', `%${safeCity}%`)
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

  const isDefaultSort = !sort || sort === 'newest'

  if (sort === 'price_asc') query = query.order('price', { ascending: true })
  else if (sort === 'price_desc') query = query.order('price', { ascending: false })
  else if (sort === 'oldest') query = query.order('created_at', { ascending: true })
  else if (sort === 'quality')
    query = query
      .order('quality_score', { ascending: false })
      .order('created_at', { ascending: false })
  else query = query.order('created_at', { ascending: false })

  const from = (page - 1) * limit
  query = query.range(from, from + limit - 1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error, count } = await (query as any)

  if (error || !data) {
    console.error('[api/listings] Supabase query error:', error?.message ?? String(error))
    return { listings: [], total: 0, page, totalPages: 1 }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listings = (data as any[]).map(mapSupabaseListingToMock)
  const total = count ?? listings.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return { listings, total, page, totalPages }
}

// Cache key is derived from filter params by unstable_cache (serializes the args array).
// 60s TTL — same as the Cache-Control header so CDN and server stay in sync.
// Hoisted to module scope so Next.js creates one wrapper instance, not one per request.
const getCachedListings = unstable_cache(queryListings, ['api-listings-query'], {
  revalidate: 60,
  tags: ['listings'],
})

export async function GET(request: NextRequest) {
  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams.entries())
    const parsed = listingFilterSchema.parse(raw)

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ listings: [], total: 0, page: parsed.page, totalPages: 1 })
    }

    const result = await getCachedListings(parsed)

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        Vary: 'Accept-Encoding',
      },
    })
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
