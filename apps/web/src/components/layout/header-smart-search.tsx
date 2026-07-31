'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { SmartSearchBar } from '@/components/search/smart-search-bar'
import type {
  SmartSearchState,
  BHKType,
  Furnishing,
  PropertyType,
} from '@/components/search/smart-search-types'

// ── URL encode / decode helpers ────────────────────────────────────────────────

const BHK_MAP: Record<string, string> = {
  '1 BHK': 'ONE_BHK',
  '2 BHK': 'TWO_BHK',
  '3 BHK': 'THREE_BHK',
  '4 BHK': 'FOUR_BHK',
  '5+ BHK': 'FIVE_PLUS_BHK',
}
const BHK_REVERSE: Record<string, BHKType> = {
  ONE_BHK: '1 BHK',
  TWO_BHK: '2 BHK',
  THREE_BHK: '3 BHK',
  FOUR_BHK: '4 BHK',
  FIVE_PLUS_BHK: '5+ BHK',
}
const PROPERTY_TYPE_MAP: Record<string, string> = {
  Apartment: 'APARTMENT',
  Penthouse: 'PENTHOUSE',
}
const PROPERTY_TYPE_REVERSE: Record<string, PropertyType> = {
  APARTMENT: 'Apartment',
  PENTHOUSE: 'Penthouse',
}

const FURNISHING_MAP: Record<string, string> = {
  Furnished: 'FURNISHED',
  'Semi-Furnished': 'SEMI_FURNISHED',
  Unfurnished: 'UNFURNISHED',
}
const FURNISHING_REVERSE: Record<string, Furnishing> = {
  FURNISHED: 'Furnished',
  SEMI_FURNISHED: 'Semi-Furnished',
  UNFURNISHED: 'Unfurnished',
}

function buildURL(state: SmartSearchState, currentParams: URLSearchParams): string {
  const p = new URLSearchParams()

  const sort = currentParams.get('sort')
  if (sort) p.set('sort', sort)

  // city / locality written as `q` param (keep compat with browse-client)
  const loc = [state.locality, state.city].filter(Boolean).join(', ')
  if (loc) p.set('q', loc)
  if (state.city) p.set('city_name', state.city)
  if (state.locality) p.set('locality', state.locality)

  // Multiple BHK: use repeated bhkType params so browse-client can getAll('bhkType')
  if (state.bhkTypes.length > 0) {
    state.bhkTypes.forEach((b) => {
      const v = BHK_MAP[b]
      if (v) p.append('bhkType', v)
    })
  }

  if (state.propertyType) {
    const v = PROPERTY_TYPE_MAP[state.propertyType]
    if (v) p.set('propertyType', v)
  }

  if (state.furnishing) {
    const v = FURNISHING_MAP[state.furnishing]
    if (v) p.set('furnishing', v)
  }

  if (state.budget) {
    if (state.budget.min != null) p.set('minPrice', String(state.budget.min))
    if (state.budget.max != null) p.set('maxPrice', String(state.budget.max))
  }

  const qs = p.toString()
  return `/properties${qs ? `?${qs}` : ''}`
}

function defaultsFromParams(params: URLSearchParams): Partial<SmartSearchState> {
  const d: Partial<SmartSearchState> = {}

  const cityName = params.get('city_name')
  if (cityName) d.city = cityName

  const locality = params.get('locality')
  if (locality) d.locality = locality

  const bhkRaws = params.getAll('bhkType')
  if (bhkRaws.length > 0) {
    const labels = bhkRaws.map((v) => BHK_REVERSE[v]).filter((l): l is BHKType => !!l)
    if (labels.length > 0) d.bhkTypes = labels
  }

  const pt = params.get('propertyType')
  if (pt) {
    const label = PROPERTY_TYPE_REVERSE[pt]
    if (label) d.propertyType = label
  }

  const furnishingRaw = params.get('furnishing')
  if (furnishingRaw) {
    const label = FURNISHING_REVERSE[furnishingRaw]
    if (label) d.furnishing = label
  }

  const minP = params.get('minPrice')
  const maxP = params.get('maxPrice')
  if (minP || maxP) {
    const min = minP ? parseInt(minP, 10) : null
    const max = maxP ? parseInt(maxP, 10) : null
    // Match to a preset label
    d.budget = {
      min,
      max,
      label:
        min === null && max !== null
          ? `Under ₹${max / 1_00_000}L`
          : min !== null && max === null
            ? `₹${min / 1_00_00_000}Cr+`
            : `₹${(min ?? 0) / 1_00_00_000}Cr – ₹${(max ?? 0) / 1_00_00_000}Cr`,
    }
  }

  return d
}

// ── Inner component ────────────────────────────────────────────────────────────

function HeaderSmartSearchInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const defaults = defaultsFromParams(searchParams)

  function handleSearch(state: SmartSearchState) {
    router.push(buildURL(state, searchParams))
  }

  return <SmartSearchBar defaultValues={defaults} onSearch={handleSearch} className="w-full" />
}

// ── Public component ───────────────────────────────────────────────────────────

export function HeaderSmartSearch() {
  const pathname = usePathname()
  if (pathname === '/') return null
  return <HeaderSmartSearchInner />
}
