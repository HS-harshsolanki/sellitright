import { NextRequest, NextResponse } from 'next/server'
import { getListingByIdFromStore } from '@/lib/listing-store'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_KEY) return false
  return request.headers.get('x-admin-key') === ADMIN_KEY
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const listing = getListingByIdFromStore(id)

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  return NextResponse.json(listing)
}
