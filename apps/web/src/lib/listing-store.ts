/**
 * In-memory listing store for V1 (no database).
 * API routes mutate this module-level array; state persists for the
 * lifetime of the Next.js server process (dev hot-reload resets it).
 */

import { MOCK_LISTINGS, type MockListing, type ListingStatus } from '@/lib/mock-data'

// Deep-clone so mutations don't touch the original mock-data exports
const store: MockListing[] = structuredClone(MOCK_LISTINGS)

export function getAllListings(): MockListing[] {
  return store
}

export function getListingByIdFromStore(id: string): MockListing | undefined {
  return store.find((l) => l.id === id)
}

export function approveListing(id: string): MockListing | null {
  const listing = store.find((l) => l.id === id)
  if (!listing) return null
  listing.status = 'ACTIVE' satisfies ListingStatus
  listing.rejectionReason = null
  return listing
}

export function rejectListing(id: string, reason: string): MockListing | null {
  const listing = store.find((l) => l.id === id)
  if (!listing) return null
  listing.status = 'REJECTED' satisfies ListingStatus
  listing.rejectionReason = reason
  return listing
}
