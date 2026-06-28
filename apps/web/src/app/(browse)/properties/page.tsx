'use client'

import { ChevronDown, Plus } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ListingCard } from '@/components/listing/listing-card'
import { FilterBar, type ActiveFilters } from '@/components/search/filter-bar'
import { MOCK_LISTINGS, type MockListing } from '@/lib/mock-data'
import { isSupabaseConfigured } from '@/lib/supabase/client'

// ─── Constants ────────────────────────────────────────────────────────────────

const BHK_MAP: Record<string, string> = {
  '1 BHK': 'ONE_BHK',
  '2 BHK': 'TWO_BHK',
  '3 BHK': 'THREE_BHK',
  '4 BHK': 'FOUR_BHK',
  '5+ BHK': 'FIVE_PLUS_BHK',
}

const FURNISHING_MAP: Record<string, string> = {
  Furnished: 'FURNISHED',
  'Semi Furnished': 'SEMI_FURNISHED',
  Unfurnished: 'UNFURNISHED',
}

const PROPERTY_TYPE_MAP: Record<string, string> = {
  Apartment: 'APARTMENT',
  Villa: 'VILLA',
  // Penthouse is a valid PropertyType in mock-data and is now surfaced in the filter
  Penthouse: 'PENTHOUSE',
  Plot: 'PLOT',
  'Independent House': 'INDEPENDENT_HOUSE',
}

type SortOption = 'newest' | 'price_asc' | 'price_desc'

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest first',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
}

// ─── Inner page — reads search params ─────────────────────────────────────────

function BrowsePageInner() {
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('q') ?? ''

  const [filters, setFilters] = useState<ActiveFilters>({})
  // filterKey increments when the empty-state "Clear all filters" button is pressed,
  // forcing FilterBar to remount and reset its internal visual state (pills, open popover).
  const [filterKey, setFilterKey] = useState(0)
  const [sort, setSort] = useState<SortOption>('newest')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  // ─── API fetch state ──────────────────────────────────────────────────────
  const [apiListings, setApiListings] = useState<MockListing[] | null>(null)
  const [apiTotal, setApiTotal] = useState<number>(0)
  const [apiTotalPages, setApiTotalPages] = useState<number>(1)
  const [apiPage, setApiPage] = useState<number>(1)
  // Start in loading state only when Supabase is configured (we'll fetch from the API).
  // When not configured we skip straight to the mock useMemo path with no flash.
  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured())
  // When Supabase is not configured the API falls back to mock data and sets
  // _mockFallback. We track this so we can switch back to the local useMemo path.
  const [useMockFallback, setUseMockFallback] = useState<boolean>(!isSupabaseConfigured())

  // Close sort dropdown on outside click or Escape — mirrors FilterBar's pattern.
  // Avoids the onBlur + setTimeout approach which fires too eagerly on keyboard nav.
  useEffect(() => {
    if (!sortOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSortOpen(false)
    }
    function handlePointerDown(e: PointerEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [sortOpen])

  // ─── Fetch from /api/listings whenever filters, sort, page, or query change ─
  // When filters/sort/query change we always reset to page 1 inside this same
  // effect to avoid a second render cycle that would fire a redundant request.
  const prevFilterKey = useRef({ searchQuery, filters, sort })

  useEffect(() => {
    let cancelled = false

    const filterChanged =
      prevFilterKey.current.searchQuery !== searchQuery ||
      prevFilterKey.current.filters !== filters ||
      prevFilterKey.current.sort !== sort

    // If filters changed, reset page to 1 synchronously before fetching.
    // We update the ref so the next render doesn't see a stale comparison.
    const pageToFetch = filterChanged ? 1 : apiPage
    if (filterChanged) {
      prevFilterKey.current = { searchQuery, filters, sort }
      setApiPage(1)
    }

    async function fetchListings() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('sort', sort)
        params.set('page', String(pageToFetch))

        if (searchQuery.trim()) params.set('city', searchQuery.trim())

        if (filters.bhkType) {
          const mapped = BHK_MAP[filters.bhkType]
          if (mapped) params.set('bhkType', mapped)
        }
        if (filters.furnishing) {
          const mapped = FURNISHING_MAP[filters.furnishing]
          if (mapped) params.set('furnishing', mapped)
        }
        if (filters.propertyType) {
          const mapped = PROPERTY_TYPE_MAP[filters.propertyType]
          if (mapped) params.set('propertyType', mapped)
        }
        if (filters.budget) {
          const { min, max } = filters.budget
          if (min !== null && min !== undefined) params.set('minPrice', String(min))
          if (max !== null && max !== undefined) params.set('maxPrice', String(max))
        }

        const res = await fetch(`/api/listings?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to fetch listings')
        const json = (await res.json()) as {
          listings: MockListing[]
          total: number
          page: number
          totalPages: number
          _mockFallback?: boolean
        }

        if (cancelled) return

        if (json._mockFallback) {
          setUseMockFallback(true)
        } else {
          setUseMockFallback(false)
          setApiListings(json.listings)
          setApiTotal(json.total)
          setApiTotalPages(json.totalPages)
        }
      } catch {
        if (!cancelled) setUseMockFallback(true)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void fetchListings()
    return () => {
      cancelled = true
    }
  }, [searchQuery, filters, sort, apiPage])

  // ─── Mock fallback — client-side filter + sort (original logic) ───────────
  const mockListings = useMemo(() => {
    if (!useMockFallback) return []

    let result = MOCK_LISTINGS.filter((l) => l.status === 'ACTIVE')

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (l) =>
          l.city.toLowerCase().includes(q) ||
          l.locality.toLowerCase().includes(q) ||
          l.title.toLowerCase().includes(q),
      )
    }

    if (filters.bhkType) {
      const mapped = BHK_MAP[filters.bhkType]
      if (mapped) result = result.filter((l) => l.bhkType === mapped)
    }

    if (filters.furnishing) {
      const mapped = FURNISHING_MAP[filters.furnishing]
      if (mapped) result = result.filter((l) => l.furnishing === mapped)
    }

    if (filters.propertyType) {
      const mapped = PROPERTY_TYPE_MAP[filters.propertyType]
      if (mapped) result = result.filter((l) => l.propertyType === mapped)
    }

    if (filters.budget) {
      const { min, max } = filters.budget
      if (min !== null && min !== undefined) result = result.filter((l) => l.price >= min)
      if (max !== null && max !== undefined) result = result.filter((l) => l.price <= max)
    }

    const sorted = [...result]
    if (sort === 'newest') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (sort === 'price_asc') {
      sorted.sort((a, b) => a.price - b.price)
    } else {
      sorted.sort((a, b) => b.price - a.price)
    }

    return sorted
  }, [useMockFallback, searchQuery, filters, sort])

  // ─── Active listings — API or mock ───────────────────────────────────────
  const listings: MockListing[] = useMockFallback ? mockListings : (apiListings ?? [])
  const totalPages = useMockFallback ? 1 : apiTotalPages
  const totalCount = useMockFallback ? mockListings.length : apiTotal

  const resetFilters = useCallback(() => {
    setFilters({})
    // Increment key to remount FilterBar, clearing its internal pill/popover state.
    setFilterKey((k) => k + 1)
  }, [])

  return (
    <div>
      {/* ── Sticky filter strip ─────────────────────────────────────────────── */}
      {/*
        top-14 matches the header h-14 on mobile (sm:top-16 matches h-16 on sm+).
        Search has moved to the header — this strip is filters-only.
      */}
      <div className="sticky top-14 z-40 border-b border-[var(--color-border)] bg-white sm:top-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="py-2.5">
            <FilterBar key={filterKey} onFilterChange={setFilters} />
          </div>
        </div>
      </div>

      {/* ── Listings section ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        {/* Count + sort row */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-800">
              {isLoading ? '…' : `${totalCount} ${totalCount === 1 ? 'property' : 'properties'}`}
            </span>
            {searchQuery && <span> for &ldquo;{searchQuery}&rdquo;</span>}
          </p>

          {/* Sort dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setSortOpen((o) => !o)}
              className="flex items-center gap-1 rounded text-sm font-medium text-gray-700 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
            >
              {SORT_LABELS[sort]}
              <ChevronDown
                className={`h-3.5 w-3.5 text-gray-400 transition-transform ${sortOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {sortOpen && (
              <ul
                role="listbox"
                aria-label="Sort options"
                className="absolute right-0 z-10 mt-2 min-w-[200px] rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-lg"
              >
                {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                  <li key={key} role="option" aria-selected={sort === key}>
                    <button
                      type="button"
                      onClick={() => {
                        setSort(key)
                        setSortOpen(false)
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 ${
                        sort === key ? 'font-semibold text-gray-900' : 'text-gray-600'
                      }`}
                    >
                      {SORT_LABELS[key]}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="mt-16 flex justify-center">
            <svg
              className="h-8 w-8 animate-spin text-[var(--color-primary)]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-label="Loading listings"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        ) : listings.length === 0 ? (
          /* Empty state */
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-base font-semibold text-gray-900">No properties found</h2>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              Try adjusting your search or filters to find what you&apos;re looking for.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 rounded text-sm font-medium text-[var(--color-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                id={listing.id}
                title={listing.title}
                price={listing.price}
                images={listing.images}
                locality={listing.locality}
                city={listing.city}
                bhkType={listing.bhkType}
                builtUpArea={listing.builtUpArea}
                furnishing={listing.furnishing}
                floor={listing.floor}
                totalFloors={listing.totalFloors}
                isVerified={listing.isVerified}
                createdAt={listing.createdAt}
                viewCount={listing.viewCount}
                ageOfProperty={listing.ageOfProperty}
              />
            ))}
          </div>
        )}

        {/* Pagination — only shown when using real API data and there are multiple pages */}
        {!useMockFallback && !isLoading && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setApiPage((p) => Math.max(1, p - 1))}
              disabled={apiPage <= 1}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {apiPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setApiPage((p) => Math.min(totalPages, p + 1))}
              disabled={apiPage >= totalPages}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </section>

      {/*
        Floating "Post Property" FAB — mobile only (md:hidden).
        Positioned above the mobile bottom nav (bottom-24 = h-16 nav + 8px gap).
        Pill-shaped, not circular — carries both icon and short label.
      */}
      <div className="animate-in fade-in zoom-in-95 fill-mode-both pointer-events-none fixed bottom-24 right-4 z-30 duration-200 [animation-delay:150ms] md:hidden">
        <Link
          href="/sell"
          className="pointer-events-auto flex h-12 items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 active:scale-95"
          aria-label="Post your property for sale"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Post
        </Link>
      </div>
    </div>
  )
}

// ─── Page export — Suspense boundary required for useSearchParams ──────────────

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowsePageInner />
    </Suspense>
  )
}
