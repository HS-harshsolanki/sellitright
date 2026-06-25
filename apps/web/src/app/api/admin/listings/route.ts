import { NextRequest, NextResponse } from 'next/server'
import { getAllListings } from '@/lib/listing-store'

const ADMIN_KEY = 'admin123'

function isAuthorized(request: NextRequest): boolean {
  return request.nextUrl.searchParams.get('key') === ADMIN_KEY
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const listings = getAllListings()
  return NextResponse.json({ listings, total: listings.length })
}
