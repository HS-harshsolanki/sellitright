import { NextRequest, NextResponse } from 'next/server'

import { mapSupabaseListingToMock } from '@/lib/listing-mapper'
import { getListingById } from '@/lib/mock-data'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // ── Supabase path ──────────────────────────────────────────────────────────
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()
    if (supabase) {
      const { data, error } = await supabase
        .from('listings')
        .select(
          'id, title, price, property_type, bhk_type, built_up_area, carpet_area, floor, total_floors, facing, furnishing, bathrooms, balconies, parking, age_of_property, amenities, city, locality, address, pincode, state, image_urls, status, is_verified, view_count, created_at, seller_id, description',
        )
        .eq('id', id)
        .eq('status', 'ACTIVE')
        .single()

      if (error) {
        // PGRST116 = no rows — treat as 404
        if (error.code === 'PGRST116') {
          return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
        }
        console.error('[api/listings/[id]] Supabase error:', error.message)
        // Fall through to mock on unexpected errors
      } else if (data) {
        return NextResponse.json(mapSupabaseListingToMock(data), {
          headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
        })
      }
    }
  }

  // ── Mock fallback ────────────────────────────────────────────────────────
  const listing = getListingById(id)
  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }
  return NextResponse.json(listing)
}
