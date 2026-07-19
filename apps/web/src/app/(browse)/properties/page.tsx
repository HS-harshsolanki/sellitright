import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { Suspense } from 'react'

import { mapSupabaseListingToMock } from '@/lib/listing-mapper'
import { type MockListing } from '@/lib/mock-data'
import { createServiceClient } from '@/lib/supabase/server'

import { BrowseClient } from './browse-client'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Properties for Sale | ChapterNew',
  description: 'Browse owner-listed properties across India.',
}

// Cache the initial page-1 listings for 60s so concurrent SSR requests
// deduplicate against a single DB query instead of hammering Supabase.
const getInitialListings = unstable_cache(
  async (): Promise<{ listings: MockListing[]; total: number }> => {
    try {
      const admin = createServiceClient()
      if (!admin) return { listings: [], total: 0 }
      const { data, count } = await admin
        .from('listings')
        .select(
          'id, title, price, property_type, bhk_type, built_up_area, carpet_area, furnishing, city, locality, address, pincode, state, image_urls, status, is_verified, view_count, created_at, seller_id',
          { count: 'exact' },
        )
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .range(0, 11)
      if (data) return { listings: data.map(mapSupabaseListingToMock), total: count ?? 0 }
    } catch {
      // fall through
    }
    return { listings: [], total: 0 }
  },
  ['browse-initial-listings'],
  { revalidate: 60, tags: ['listings'] },
)

export default async function BrowsePage() {
  const { listings: initialListings, total: initialTotal } = await getInitialListings()
  const initialTotalPages = Math.max(1, Math.ceil(initialTotal / 12))

  return (
    <Suspense>
      <BrowseClient
        initialListings={initialListings}
        initialTotal={initialTotal}
        initialPage={1}
        initialTotalPages={initialTotalPages}
      />
    </Suspense>
  )
}
