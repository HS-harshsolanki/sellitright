import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { MOCK_LISTINGS } from '@/lib/mock-data'
import { listingFilterSchema } from '@/lib/validators'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { createServiceClient } from '@/lib/supabase/server'
import { mapSupabaseListingToMock } from '@/lib/listing-mapper'

export async function GET(request: NextRequest) {
  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams.entries())
    const parsed = listingFilterSchema.parse(raw)

    const {
      city, locality, bhkType, furnishing, propertyType,
      minPrice, maxPrice, page, limit, sort,
    } = parsed

    // ── Supabase path ──────────────────────────────────────────────────────
    if (isSupabaseConfigured()) {
      const supabase = createServiceClient()
      if (supabase) {
        let query = supabase
          .from('listings')
          .select('*', { count: 'exact' })
          .eq('status', 'ACTIVE')

        if (city) query = query.ilike('city', `%${city}%`)
        if (locality) query = query.ilike('locality', `%${locality}%`)
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
          return NextResponse.json({ listings, total, page, totalPages })
        }

        // Log error and fall through to mock fallback
        console.error('[api/listings] Supabase query error:', error?.message)
      }
    }

    // ── Mock fallback ──────────────────────────────────────────────────────
    let filtered = MOCK_LISTINGS.filter((l) => l.status === 'ACTIVE')

    if (city) filtered = filtered.filter((l) => l.city.toLowerCase().includes(city.toLowerCase()))
    if (locality) filtered = filtered.filter((l) => l.locality.toLowerCase().includes(locality.toLowerCase()))
    if (bhkType) filtered = filtered.filter((l) => l.bhkType === bhkType)
    if (furnishing) filtered = filtered.filter((l) => l.furnishing === furnishing)
    if (propertyType) filtered = filtered.filter((l) => l.propertyType === propertyType)
    if (minPrice !== undefined) filtered = filtered.filter((l) => l.price >= minPrice)
    if (maxPrice !== undefined) filtered = filtered.filter((l) => l.price <= maxPrice)

    if (sort === 'price_asc') filtered.sort((a, b) => a.price - b.price)
    else if (sort === 'price_desc') filtered.sort((a, b) => b.price - a.price)
    else if (sort === 'newest') filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    else filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const listings = filtered.slice((page - 1) * limit, page * limit)

    return NextResponse.json({ listings, total, page, totalPages })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', issues: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
