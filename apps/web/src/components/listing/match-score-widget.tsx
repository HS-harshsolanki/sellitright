'use client'

import {
  BedDouble,
  CheckCircle2,
  DollarSign,
  Home,
  MapPin,
  Sofa,
  XCircle,
  Minus,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { computeMatchScore, type MatchPreferences } from '@/lib/match-score'
import type { MockListing } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const SESSION_KEY = 'sir_last_search_prefs'

// ─── Enum → human label helpers ──────────────────────────────────────────────

const BHK_LABEL: Record<string, string> = {
  ONE_BHK: '1 BHK',
  TWO_BHK: '2 BHK',
  THREE_BHK: '3 BHK',
  FOUR_BHK: '4 BHK',
  FIVE_PLUS_BHK: '5+ BHK',
}

const FURNISHING_LABEL: Record<string, string> = {
  FURNISHED: 'Furnished',
  SEMI_FURNISHED: 'Semi Furnished',
  UNFURNISHED: 'Unfurnished',
}

// BHK display → enum (mirrors match-score.ts)
const BHK_DISPLAY_TO_ENUM: Record<string, string> = {
  '1 BHK': 'ONE_BHK',
  '2 BHK': 'TWO_BHK',
  '3 BHK': 'THREE_BHK',
  '4 BHK': 'FOUR_BHK',
  '5+ BHK': 'FIVE_PLUS_BHK',
}

const FURNISHING_DISPLAY_TO_ENUM: Record<string, string> = {
  Furnished: 'FURNISHED',
  'Semi Furnished': 'SEMI_FURNISHED',
  Unfurnished: 'UNFURNISHED',
}

function normaliseEnum(value: string, displayMap: Record<string, string>): string {
  return displayMap[value] ?? value
}

// ─── Per-dimension status ─────────────────────────────────────────────────────

type DimStatus = 'match' | 'partial' | 'no_match'

interface DimResult {
  label: string
  icon: React.ReactNode
  status: DimStatus
  detail: string
}

function formatPrice(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

function buildBreakdown(listing: MockListing, prefs: MatchPreferences): DimResult[] {
  const results: DimResult[] = []

  // BHK
  if (prefs.bhkType) {
    const target = normaliseEnum(prefs.bhkType, BHK_DISPLAY_TO_ENUM)
    const matched = listing.bhkType === target
    results.push({
      label: 'BHK',
      icon: <BedDouble className="h-3.5 w-3.5" aria-hidden="true" />,
      status: matched ? 'match' : 'no_match',
      detail: matched
        ? `${BHK_LABEL[listing.bhkType] ?? listing.bhkType} matches your filter`
        : `You wanted ${BHK_LABEL[target] ?? target}, this is ${BHK_LABEL[listing.bhkType] ?? listing.bhkType}`,
    })
  }

  // Price
  if (prefs.minPrice != null || prefs.maxPrice != null) {
    const min = prefs.minPrice ?? 0
    const max = prefs.maxPrice ?? Infinity
    const inRange = listing.price >= min && listing.price <= max
    const range = isFinite(max) ? max - min : 0
    const position = range > 0 ? (listing.price - min) / range : 0
    const isLowerThird = inRange && position <= 0.33
    results.push({
      label: 'Price',
      icon: <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />,
      status: inRange ? (isLowerThird ? 'match' : 'partial') : 'no_match',
      detail: inRange
        ? isLowerThird
          ? `${formatPrice(listing.price)} — great value within your budget`
          : `${formatPrice(listing.price)} is within budget but toward the higher end`
        : `${formatPrice(listing.price)} is outside your budget of ${prefs.minPrice ? formatPrice(prefs.minPrice) : '0'}–${prefs.maxPrice ? formatPrice(prefs.maxPrice) : 'any'}`,
    })
  }

  // Location
  if (prefs.city?.trim() || prefs.locality?.trim()) {
    const targetCity = prefs.city?.trim().toLowerCase() ?? ''
    const targetLoc = prefs.locality?.trim().toLowerCase() ?? ''
    const listingCity = listing.city.toLowerCase()
    const listingLoc = listing.locality.toLowerCase()
    const cityMatch =
      targetCity &&
      (listingCity === targetCity ||
        listingCity.includes(targetCity) ||
        targetCity.includes(listingCity))
    const locMatch =
      targetLoc &&
      (listingLoc === targetLoc || listingLoc.includes(targetLoc) || targetLoc.includes(listingLoc))

    let status: DimStatus
    let detail: string
    if (locMatch && cityMatch) {
      status = 'match'
      detail = `${listing.locality}, ${listing.city} matches your search`
    } else if (locMatch || cityMatch) {
      status = 'partial'
      detail = cityMatch
        ? `City matches (${listing.city}), but locality differs`
        : `Locality matches (${listing.locality}), city differs`
    } else {
      status = 'no_match'
      detail = `${listing.locality}, ${listing.city} does not match your search`
    }
    results.push({
      label: 'Location',
      icon: <MapPin className="h-3.5 w-3.5" aria-hidden="true" />,
      status,
      detail,
    })
  }

  // Furnishing
  if (prefs.furnishing) {
    const target = normaliseEnum(prefs.furnishing, FURNISHING_DISPLAY_TO_ENUM)
    const exact = listing.furnishing === target
    const partial =
      !exact &&
      ((target === 'FURNISHED' && listing.furnishing === 'SEMI_FURNISHED') ||
        (target === 'UNFURNISHED' && listing.furnishing === 'SEMI_FURNISHED'))
    results.push({
      label: 'Furnishing',
      icon: <Sofa className="h-3.5 w-3.5" aria-hidden="true" />,
      status: exact ? 'match' : partial ? 'partial' : 'no_match',
      detail: exact
        ? `${FURNISHING_LABEL[listing.furnishing] ?? listing.furnishing} matches your filter`
        : partial
          ? `${FURNISHING_LABEL[listing.furnishing] ?? listing.furnishing} is close to ${FURNISHING_LABEL[target] ?? target}`
          : `You wanted ${FURNISHING_LABEL[target] ?? target}, this is ${FURNISHING_LABEL[listing.furnishing] ?? listing.furnishing}`,
    })
  }

  // Property type
  if (prefs.propertyType) {
    const matched = listing.propertyType === prefs.propertyType
    results.push({
      label: 'Property type',
      icon: <Home className="h-3.5 w-3.5" aria-hidden="true" />,
      status: matched ? 'match' : 'no_match',
      detail: matched
        ? `${listing.propertyType.charAt(0) + listing.propertyType.slice(1).toLowerCase()} matches your filter`
        : `You wanted ${prefs.propertyType.toLowerCase()}, this is ${listing.propertyType.toLowerCase()}`,
    })
  }

  return results
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MatchScoreWidgetProps {
  listing: MockListing
}

export function MatchScoreWidget({ listing }: MatchScoreWidgetProps) {
  const [prefs, setPrefs] = useState<MatchPreferences | null>(null)
  const [score, setScore] = useState<number | undefined>(undefined)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as MatchPreferences & { searchQuery?: string | null }
      // Hydrate city/locality from stored prefs
      const hydrated: MatchPreferences = {
        bhkType: parsed.bhkType ?? null,
        furnishing: parsed.furnishing ?? null,
        propertyType: parsed.propertyType ?? null,
        minPrice: parsed.minPrice ?? null,
        maxPrice: parsed.maxPrice ?? null,
        city:
          parsed.city ??
          (parsed.searchQuery ? (parsed.searchQuery.split(',')[0]?.trim() ?? null) : null),
        locality:
          parsed.locality ??
          (parsed.searchQuery
            ? (parsed.searchQuery.split(',')[1]?.trim() ??
              parsed.searchQuery.split(',')[0]?.trim() ??
              null)
            : null),
      }
      const hasAny =
        hydrated.bhkType ||
        hydrated.furnishing ||
        hydrated.propertyType ||
        hydrated.minPrice != null ||
        hydrated.maxPrice != null ||
        hydrated.city ||
        hydrated.locality
      if (!hasAny) return
      const computed = computeMatchScore(listing, hydrated)
      if (computed === undefined) return
      setPrefs(hydrated)
      setScore(computed)
    } catch {
      // sessionStorage unavailable — silently skip
    }
  }, [listing])

  if (score === undefined || prefs === null) return null

  const breakdown = buildBreakdown(listing, prefs)

  // Label and colours
  const isStrong = score >= 70
  const isPartial = score >= 40 && score < 70
  const bandLabel = isStrong ? 'Strong Match' : isPartial ? 'Partial Match' : 'Low Match'

  const pillClasses = isStrong
    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
    : isPartial
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : 'bg-gray-50 border-gray-200 text-gray-600'

  const scoreTextClass = isStrong
    ? 'text-emerald-700'
    : isPartial
      ? 'text-amber-700'
      : 'text-gray-600'

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-4',
        isStrong
          ? 'border-emerald-200 bg-emerald-50'
          : isPartial
            ? 'border-amber-200 bg-amber-50'
            : 'border-gray-200 bg-gray-50',
      )}
      aria-label={`Buyer match score: ${score}%`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Your match
          </p>
          <p className={cn('text-2xl font-bold leading-tight', scoreTextClass)}>{score}%</p>
        </div>
        <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', pillClasses)}>
          {bandLabel}
        </span>
      </div>

      {/* Score bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/60">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isStrong ? 'bg-emerald-500' : isPartial ? 'bg-amber-400' : 'bg-gray-400',
          )}
          style={{ width: `${score}%` }}
          aria-hidden="true"
        />
      </div>

      {/* Breakdown */}
      {breakdown.length > 0 && (
        <ul className="mt-3 space-y-1.5" aria-label="Match breakdown">
          {breakdown.map((dim) => (
            <li key={dim.label} className="flex items-start gap-2">
              <span
                className={cn(
                  'mt-0.5 shrink-0',
                  dim.status === 'match'
                    ? 'text-emerald-600'
                    : dim.status === 'partial'
                      ? 'text-amber-500'
                      : 'text-gray-400',
                )}
              >
                {dim.status === 'match' ? (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : dim.status === 'partial' ? (
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-[var(--color-foreground)]">
                  {dim.label}
                </span>
                <span className="ml-1 text-xs text-[var(--color-muted-foreground)]">
                  — {dim.detail}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] text-[var(--color-muted-foreground)]">
        Based on your last search filters
      </p>
    </div>
  )
}
