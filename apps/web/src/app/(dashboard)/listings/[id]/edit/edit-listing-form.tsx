'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import type { MockListing } from '@/lib/mock-data'
import { useSellFormStore } from '@/stores/sell-form.store'

interface EditListingFormProps {
  listing: MockListing
}

export function EditListingForm({ listing }: EditListingFormProps) {
  const hydrateFromListing = useSellFormStore((s) => s.hydrateFromListing)
  const router = useRouter()

  useEffect(() => {
    hydrateFromListing(listing)
    router.replace(`/sell?draftId=${listing.id}`)
  }, [hydrateFromListing, listing, router])

  return null
}
