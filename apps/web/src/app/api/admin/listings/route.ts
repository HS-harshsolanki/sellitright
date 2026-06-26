import { NextRequest, NextResponse } from 'next/server'
import { getAllListings } from '@/lib/listing-store'
import type { MockListing } from '@/lib/mock-data'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_KEY) return false
  return request.headers.get('x-admin-key') === ADMIN_KEY
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') ?? '25', 10)))
  const status = searchParams.get('status') ?? ''
  const query = (searchParams.get('q') ?? '').toLowerCase().trim()
  const city = (searchParams.get('city') ?? '').toLowerCase().trim()
  const propertyType = (searchParams.get('propertyType') ?? '').toLowerCase().trim()
  const sortBy = searchParams.get('sortBy') ?? 'oldest' // oldest | newest

  let results: MockListing[] = getAllListings()

  // Filter by status
  if (status) {
    results = results.filter((l) => l.status === status)
  }

  // Search: title, city, seller name, seller phone
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

  // Filter by city
  if (city) {
    results = results.filter((l) => l.city.toLowerCase() === city)
  }

  // Filter by property type
  if (propertyType) {
    results = results.filter((l) => l.propertyType.toLowerCase() === propertyType)
  }

  // Sort: oldest first (default for pending review queue), newest first for audit
  results = [...results].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    return sortBy === 'newest' ? -diff : diff
  })

  const total = results.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const offset = (page - 1) * limit
  const listings = results.slice(offset, offset + limit)

  // Counts across all (unfiltered except status awareness)
  const allListings = getAllListings()
  const counts = {
    PENDING_REVIEW: allListings.filter((l) => l.status === 'PENDING_REVIEW').length,
    ACTIVE: allListings.filter((l) => l.status === 'ACTIVE').length,
    REJECTED: allListings.filter((l) => l.status === 'REJECTED').length,
  }

  return NextResponse.json({ listings, total, page, totalPages, counts })
}
