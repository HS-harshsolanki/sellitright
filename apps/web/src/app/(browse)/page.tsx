'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronDown, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { MOCK_LISTINGS } from '@/lib/mock-data'
import { ListingCard } from '@/components/listing/listing-card'
import { FilterBar, type ActiveFilters } from '@/components/search/filter-bar'

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

  const listings = useMemo(() => {
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
  }, [searchQuery, filters, sort])

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
      <div className="sticky top-14 sm:top-16 z-40 bg-white border-b border-[var(--color-border)]">
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
              {listings.length} {listings.length === 1 ? 'property' : 'properties'}
            </span>
            {searchQuery && (
              <span> for &ldquo;{searchQuery}&rdquo;</span>
            )}
          </p>

          {/* Sort dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setSortOpen((o) => !o)}
              className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] rounded"
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
            >
              {SORT_LABELS[sort]}
              <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
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
                      onClick={() => { setSort(key); setSortOpen(false) }}
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

        {/* Empty state */}
        {listings.length === 0 ? (
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
              className="mt-4 text-sm font-medium text-[var(--color-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] rounded"
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
      </section>

      {/*
        Floating "Post Property" FAB — mobile only (md:hidden).
        Positioned above the mobile bottom nav (bottom-24 = h-16 nav + 8px gap).
        Pill-shaped, not circular — carries both icon and short label.
      */}
      <motion.div
        className="pointer-events-none fixed bottom-24 right-4 z-30 md:hidden"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
      >
        <Link
          href="/sell"
          className="pointer-events-auto flex h-12 items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 active:scale-95"
          aria-label="Post your property for sale"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Post
        </Link>
      </motion.div>
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
