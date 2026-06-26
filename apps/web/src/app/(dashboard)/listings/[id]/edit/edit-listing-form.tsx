'use client'

import { useSellFormStore } from '@/stores/sell-form.store'
import type { MockListing } from '@/lib/mock-data'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface EditListingFormProps {
  listing: MockListing
}

export function EditListingForm({ listing }: EditListingFormProps) {
  const hydrateFromListing = useSellFormStore((s) => s.hydrateFromListing)
  const router = useRouter()

  useEffect(() => {
    hydrateFromListing(listing)
    router.replace('/sell')
  }, [hydrateFromListing, listing, router])

  return null
}
