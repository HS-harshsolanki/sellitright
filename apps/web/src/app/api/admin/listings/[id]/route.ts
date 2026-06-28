import crypto from 'crypto'

import { NextRequest, NextResponse } from 'next/server'

import { mapSupabaseListingToMock } from '@/lib/listing-mapper'
import { getListingByIdFromStore } from '@/lib/listing-store'
import { createServiceClient } from '@/lib/supabase/server'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_KEY) return false
  const provided = request.headers.get('x-admin-key') ?? ''
  if (provided.length !== ADMIN_KEY.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(ADMIN_KEY))
  } catch {
    return false
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Try Supabase first
  const serviceClient = createServiceClient()
  if (serviceClient) {
    const { data, error } = await serviceClient.from('listings').select('*').eq('id', id).single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 })
    }

    if (data) {
      return NextResponse.json(mapSupabaseListingToMock(data))
    }

    // PGRST116 means row not found — fall through to in-memory store
  }

  // Fall back to in-memory mock store
  const listing = getListingByIdFromStore(id)

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  return NextResponse.json(listing)
}
