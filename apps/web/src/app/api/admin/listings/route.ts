import { NextRequest, NextResponse } from 'next/server'

import { isAuthorized } from '@/lib/admin-auth'
import { mapSupabaseListingToMock } from '@/lib/listing-mapper'
import { getAllListings } from '@/lib/listing-store'
import type { MockListing } from '@/lib/mock-data'
import { createServiceClient } from '@/lib/supabase/server'

const PROPERTY_TYPES = ['APARTMENT', 'VILLA', 'PLOT', 'INDEPENDENT_HOUSE', 'PENTHOUSE'] as const
const LISTING_STATUSES = [
  'ACTIVE',
  'DRAFT',
  'PENDING_REVIEW',
  'REJECTED',
  'SOLD',
  'DELETED',
] as const

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') ?? '25', 10)))
  const status = searchParams.get('status') ?? ''
  const query = (searchParams.get('q') ?? '')
    .toLowerCase()
    .trim()
    .replace(/[%_,()\\.]/g, '')
  const city = (searchParams.get('city') ?? '')
    .toLowerCase()
    .trim()
    .replace(/[%_,()\\.]/g, '')
  const propertyType = searchParams.get('propertyType') ?? ''
  const sortBy = searchParams.get('sortBy') ?? 'oldest'

  const safePropertyType = PROPERTY_TYPES.includes(propertyType as (typeof PROPERTY_TYPES)[number])
    ? propertyType
    : undefined
  const safeStatus = LISTING_STATUSES.includes(status as (typeof LISTING_STATUSES)[number])
    ? status
    : undefined

  // ── Supabase path ────────────────────────────────────────────────────────
  const supabase = createServiceClient()
  if (supabase) {
    try {
      // Count query for sidebar badges (all statuses, no search filter)
      const [pendingRes, activeRes, rejectedRes, deletedRes] = await Promise.all([
        supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'PENDING_REVIEW'),
        supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'ACTIVE'),
        supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'REJECTED'),
        supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'DELETED'),
      ])

      const counts = {
        PENDING_REVIEW: pendingRes.count ?? 0,
        ACTIVE: activeRes.count ?? 0,
        REJECTED: rejectedRes.count ?? 0,
        DELETED: deletedRes.count ?? 0,
      }

      // Main listings query
      let q = supabase.from('listings').select('*', { count: 'exact' })

      if (safeStatus) q = q.eq('status', safeStatus)
      if (city) q = q.ilike('city', `%${city}%`)
      if (safePropertyType) q = q.eq('property_type', safePropertyType)

      // Text search across multiple columns — use Supabase .or() with ilike
      if (query) {
        q = q.or(`title.ilike.%${query}%,city.ilike.%${query}%,locality.ilike.%${query}%`)
      }

      // Sorting
      if (sortBy === 'newest') q = q.order('created_at', { ascending: false })
      else q = q.order('created_at', { ascending: true })

      // Pagination
      q = q.range((page - 1) * limit, page * limit - 1)

      const { data, error, count } = await q

      if (!error && data) {
        const listings = data.map(mapSupabaseListingToMock)
        const total = count ?? listings.length
        const totalPages = Math.max(1, Math.ceil(total / limit))
        return NextResponse.json({ listings, total, page, totalPages, counts })
      }

      console.error('[admin/listings] Supabase error:', error?.message)
    } catch (err) {
      console.error('[admin/listings] unexpected error:', err)
    }
  }

  // ── In-memory fallback ───────────────────────────────────────────────────
  // This path means SUPABASE_SERVICE_ROLE_KEY is not set.
  // Real submitted listings are in Supabase and will NOT appear here.
  console.warn(
    '[admin/listings] Running on mock data — add SUPABASE_SERVICE_ROLE_KEY to .env.local to see real listings',
  )
  let results: MockListing[] = getAllListings()

  if (safeStatus) results = results.filter((l) => l.status === safeStatus)
  if (query) {
    results = results.filter(
      (l) =>
        l.title.toLowerCase().includes(query) ||
        l.city.toLowerCase().includes(query) ||
        l.locality.toLowerCase().includes(query) ||
        l.seller.name.toLowerCase().includes(query) ||
        l.seller.phone.includes(query),
    )
  }
  if (city) results = results.filter((l) => l.city.toLowerCase() === city)
  if (safePropertyType)
    results = results.filter((l) => l.propertyType.toLowerCase() === safePropertyType.toLowerCase())

  results = [...results].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    return sortBy === 'newest' ? -diff : diff
  })

  const total = results.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const listings = results.slice((page - 1) * limit, page * limit)

  const allListings = getAllListings()
  const counts = {
    PENDING_REVIEW: allListings.filter((l) => l.status === 'PENDING_REVIEW').length,
    ACTIVE: allListings.filter((l) => l.status === 'ACTIVE').length,
    REJECTED: allListings.filter((l) => l.status === 'REJECTED').length,
    DELETED: allListings.filter((l) => l.status === 'DELETED').length,
  }

  return NextResponse.json({ listings, total, page, totalPages, counts, _mockFallback: true })
}
