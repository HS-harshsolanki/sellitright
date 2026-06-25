import { NextRequest, NextResponse } from 'next/server'
import { approveListing } from '@/lib/listing-store'

const ADMIN_KEY = 'admin123'

function isAuthorized(request: NextRequest): boolean {
  return request.nextUrl.searchParams.get('key') === ADMIN_KEY
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const updated = approveListing(id)

  if (!updated) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  return NextResponse.json(updated)
}
