import { NextRequest, NextResponse } from 'next/server'
import { getAllListings } from '@/lib/listing-store'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_KEY) return false
  return request.headers.get('x-admin-key') === ADMIN_KEY
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const listings = getAllListings()
  return NextResponse.json({ listings, total: listings.length })
}
