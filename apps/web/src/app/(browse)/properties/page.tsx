import { Suspense } from 'react'
import type { Metadata } from 'next'

import { mapSupabaseListingToMock } from '@/lib/listing-mapper'
import { type MockListing } from '@/lib/mock-data'
import { createServiceClient } from '@/lib/supabase/server'

import { BrowseClient } from './browse-client'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Properties for Sale | ChapterNew',
  description: 'Browse owner-listed properties across India.',
}

export default async function BrowsePage() {
  let initialListings: MockListing[] = []
  let initialTotal = 0

  try {
    const admin = createServiceClient()
    if (admin) {
      const { data, count } = await admin
        .from('listings')
        .select(
          'id, title, price, property_type, bhk_type, built_up_area, carpet_area, furnishing, city, locality, address, pincode, state, image_urls, status, is_verified, view_count, created_at, seller_id',
          { count: 'exact' },
        )
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .range(0, 11)

      if (data) {
        initialListings = data.map(mapSupabaseListingToMock)
        initialTotal = count ?? 0
      }
    }
  } catch {
    // Supabase not configured or query failed — BrowseClient will fetch via /api/listings
  }

  const initialTotalPages = Math.max(1, Math.ceil(initialTotal / 12))

  return (
    <Suspense fallback={null}>
      <BrowseClient
        initialListings={initialListings}
        initialTotal={initialTotal}
        initialPage={1}
        initialTotalPages={initialTotalPages}
      />
    </Suspense>
  )
}
