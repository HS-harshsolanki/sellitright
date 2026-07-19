'use client'

import { ChevronDown, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { ListingCard } from '@/components/listing/listing-card'
import { FilterBar, type ActiveFilters } from '@/components/search/filter-bar'
import type { MockListing } from '@/lib/mock-data'
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
  Penthouse: 'PENTHOUSE',
}

type SortOption = 'newest' | 'price_asc' | 'price_desc'

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest first',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BrowseClientProps {
  initialListings: MockListing[]
  initialTotal: number
  initialPage: number
  initialTotalPages: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BrowseClient({
  initialListings,
  initialTotal,
  initialPage,
  initialTotalPages,
}: BrowseClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  // Read both `q` (canonical) and `city` (legacy — from CITIES_GRID links and old hero form)
  const searchQuery = searchParams.get('q') ?? searchParams.get('city') ?? ''

  const [filters, setFilters] = useState<ActiveFilters>({})
  // filterKey increments when the empty-state "Clear all filters" button is pressed,
  // forcing FilterBar to remount and reset its internal visual state (pills, open popover).
  const [filterKey, setFilterKey] = useState(0)
  const [sort, setSort] = useState<SortOption>(
    () => (searchParams.get('sort') as SortOption | null) ?? 'newest',
  )
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  // ─── API fetch state ──────────────────────────────────────────────────────
  // Seed with server-rendered data on first render to eliminate the blank grid flash.
  const [apiListings, setApiListings] = useState<MockListing[] | null>(
    initialListings.length > 0 ? initialListings : null,
  )
  const [apiTotal, setApiTotal] = useState<number>(initialTotal)
  const [apiTotalPages, setApiTotalPages] = useState<number>(initialTotalPages)
  const [apiPage, setApiPage] = useState<number>(() => {
    const p = parseInt(searchParams.get('page') ?? '', 10)
    return Number.isFinite(p) && p >= 1 ? p : initialPage
  })
  // Start in loading state only when Supabase is configured AND we have no initial data.
  // When we have initialListings from SSR there is no flash — skip the spinner.
  const [isLoading, setIsLoading] = useState<boolean>(
    isSupabaseConfigured() && initialListings.length === 0,
  )
  // Error banner shown when the listings fetch fails in production.
  const [fetchErrorBanner, setFetchErrorBanner] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Close sort dropdown on outside click or Escape — mirrors FilterBar's pattern.
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

  // ─── Sync q / page / sort into URL (shallow replace, no full navigation) ────
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())

    // Canonicalise: drop legacy `city` param, write `q`
    params.delete('city')
    if (searchQuery) {
      params.set('q', searchQuery)
    } else {
      params.delete('q')
    }

    if (apiPage > 1) {
      params.set('page', String(apiPage))
    } else {
      params.delete('page')
    }

    if (sort !== 'newest') {
      params.set('sort', sort)
    } else {
      params.delete('sort')
    }

    const newSearch = params.toString()
    const currentSearch = searchParams.toString()
    if (newSearch !== currentSearch) {
      router.replace(`/properties${newSearch ? `?${newSearch}` : ''}`, { scroll: false })
    }
  }, [searchQuery, apiPage, sort, router, searchParams])

  // ─── Fetch from /api/listings whenever filters, sort, page, or query change ─
  // When filters/sort/query change we always reset to page 1 inside this same
  // effect to avoid a second render cycle that would fire a redundant request.
  const prevFilterKey = useRef({ searchQuery, filters, sort })
  // Track whether we have already used the server-provided initial data for the
  // default (no-filter) view. The first render with no filters and default sort
  // should NOT trigger a fetch — the SSR data is already correct.
  const hasUsedInitialData = useRef(initialListings.length > 0)

  useEffect(() => {
    let cancelled = false

    const filterChanged =
      prevFilterKey.current.searchQuery !== searchQuery ||
      prevFilterKey.current.filters !== filters ||
      prevFilterKey.current.sort !== sort

    const pageToFetch = filterChanged ? 1 : apiPage
    if (filterChanged) {
      prevFilterKey.current = { searchQuery, filters, sort }
      setApiPage(1)
    }

    // Skip the initial fetch when SSR data is available and nothing has changed yet.
    const isDefaultView =
      !filterChanged &&
      apiPage === initialPage &&
      !searchQuery &&
      Object.keys(filters).length === 0 &&
      sort === 'newest'

    if (hasUsedInitialData.current && isDefaultView) {
      hasUsedInitialData.current = false
      return
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
        }

        if (cancelled) return

        setApiListings(json.listings)
        setApiTotal(json.total)
        setApiTotalPages(json.totalPages)
      } catch {
        if (!cancelled) {
          setFetchErrorBanner('Unable to load listings right now. Please try again.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void fetchListings()
    return () => {
      cancelled = true
    }
  }, [searchQuery, filters, sort, apiPage, initialPage, retryCount])

  // ─── Active listings ──────────────────────────────────────────────────────
  const listings: MockListing[] = apiListings ?? []
  const totalPages = apiTotalPages
  const totalCount = apiTotal

  const resetFilters = useCallback(() => {
    setFilters({})
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

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {fetchErrorBanner && (
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div
            className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            role="alert"
          >
            <span>{fetchErrorBanner}</span>
            <button
              type="button"
              onClick={() => {
                setFetchErrorBanner(null)
                setRetryCount((c) => c + 1)
              }}
              className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

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
            {listings.map((listing, idx) => (
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
                priorityImage={idx < 4}
              />
            ))}
          </div>
        )}

        {/* Pagination — only shown when using real API data and there are multiple pages */}
        {!isLoading && totalPages > 1 && (
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
