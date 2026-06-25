import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { MOCK_LISTINGS } from '@/lib/mock-data'
import { listingFilterSchema } from '@/lib/validators'

export async function GET(request: NextRequest) {
  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams.entries())
    const parsed = listingFilterSchema.parse(raw)

    const { city, locality, bhkType, furnishing, propertyType, minPrice, maxPrice, page, limit, sort } = parsed

    let filtered = MOCK_LISTINGS.filter((l) => l.status === 'ACTIVE')

    if (city) filtered = filtered.filter((l) => l.city.toLowerCase().includes(city.toLowerCase()))
    if (locality)
      filtered = filtered.filter((l) => l.locality.toLowerCase().includes(locality.toLowerCase()))
    if (bhkType) filtered = filtered.filter((l) => l.bhkType === bhkType)
    if (furnishing) filtered = filtered.filter((l) => l.furnishing === furnishing)
    if (propertyType) filtered = filtered.filter((l) => l.propertyType === propertyType)
    if (minPrice !== undefined) filtered = filtered.filter((l) => l.price >= minPrice)
    if (maxPrice !== undefined) filtered = filtered.filter((l) => l.price <= maxPrice)

    if (sort === 'price_asc') filtered.sort((a, b) => a.price - b.price)
    else if (sort === 'price_desc') filtered.sort((a, b) => b.price - a.price)
    else if (sort === 'newest')
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    else if (sort === 'oldest')
      filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    const total = filtered.length
    const totalPages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    const listings = filtered.slice(start, start + limit)

    return NextResponse.json({ listings, total, page, totalPages })
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
