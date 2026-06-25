'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { MockListing } from '@/lib/mock-data'
import type { ListingCreateInput } from '@/lib/validators'

interface ListingsResponse {
  listings: MockListing[]
  total: number
  page: number
  totalPages: number
}

interface ListingFilters {
  city?: string
  locality?: string
  bhkType?: string
  furnishing?: string
  propertyType?: string
  minPrice?: number
  maxPrice?: number
  page?: number
  limit?: number
  sort?: string
}

async function fetchListings(filters: ListingFilters): Promise<ListingsResponse> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  })
  const res = await fetch(`/api/listings?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch listings')
  return res.json()
}

async function fetchListing(id: string): Promise<MockListing> {
  const res = await fetch(`/api/listings/${id}`)
  if (!res.ok) throw new Error('Listing not found')
  return res.json()
}

export function useListings(filters: ListingFilters = {}) {
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: () => fetchListings(filters),
  })
}

export function useListing(id: string) {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: () => fetchListing(id),
    enabled: !!id,
  })
}

export function useCreateListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ListingCreateInput) => {
      const res = await fetch('/api/listings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create listing')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })
}
