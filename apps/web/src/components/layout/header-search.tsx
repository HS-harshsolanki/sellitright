'use client'

import { MapPin, Home, IndianRupee, X, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { ParsedFilters } from '@/components/browse/ai-finder-button'
import { SearchBar, type SearchBarHandle } from '@/components/search/search-bar'
import { filterLocalities, getLocalitiesForCity } from '@/lib/localities'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

type OpenSegment = 'where' | 'what' | 'budget' | null

interface SegmentFilters {
  city: string | null
  locality: string | null
  bhkType: string | null
  propertyType: string | null
  budget: { min: number | null; max: number | null } | null
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CITIES = [
  'Mumbai',
  'Delhi',
  'Bangalore',
  'Hyderabad',
  'Chennai',
  'Pune',
  'Kolkata',
  'Ahmedabad',
]
const BHK_OPTIONS = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK']
const TYPE_OPTIONS = ['Apartment', 'Villa', 'Plot', 'Studio']
const BUDGET_PRESETS = [
  { label: 'Under ₹75L', min: null, max: 7_500_000 },
  { label: '₹75L – ₹1.5Cr', min: 7_500_000, max: 15_000_000 },
  { label: '₹1.5Cr – ₹3Cr', min: 15_000_000, max: 30_000_000 },
  { label: '₹3Cr+', min: 30_000_000, max: null },
]

const BHK_MAP: Record<string, string> = {
  '1 BHK': 'ONE_BHK',
  '2 BHK': 'TWO_BHK',
  '3 BHK': 'THREE_BHK',
  '4 BHK': 'FOUR_BHK',
  '5+ BHK': 'FIVE_PLUS_BHK',
}
const BHK_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(BHK_MAP).map(([k, v]) => [v, k]),
)
const PROPERTY_TYPE_MAP: Record<string, string> = {
  Apartment: 'APARTMENT',
  Villa: 'VILLA',
  Plot: 'PLOT',
  Studio: 'STUDIO',
}
const PROPERTY_TYPE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(PROPERTY_TYPE_MAP).map(([k, v]) => [v, k]),
)

// ── URL builder ────────────────────────────────────────────────────────────────

function buildPropertiesURL(
  q: string,
  seg: SegmentFilters,
  currentParams: URLSearchParams,
): string {
  const p = new URLSearchParams()
  const sort = currentParams.get('sort')
  if (sort) p.set('sort', sort)
  if (q.trim()) p.set('q', q.trim())
  if (seg.city) p.set('city_name', seg.city)
  if (seg.locality) p.set('locality', seg.locality)
  if (seg.bhkType) {
    const v = BHK_MAP[seg.bhkType]
    if (v) p.set('bhkType', v)
  }
  if (seg.propertyType) {
    const v = PROPERTY_TYPE_MAP[seg.propertyType]
    if (v) p.set('propertyType', v)
  }
  if (seg.budget) {
    if (seg.budget.min != null) p.set('minPrice', String(seg.budget.min))
    if (seg.budget.max != null) p.set('maxPrice', String(seg.budget.max))
  }
  const qs = p.toString()
  return `/properties${qs ? `?${qs}` : ''}`
}

function segmentFiltersFromParams(params: URLSearchParams): SegmentFilters {
  const bhkRaw = params.get('bhkType')
  const ptRaw = params.get('propertyType')
  const minP = params.get('minPrice')
  const maxP = params.get('maxPrice')
  return {
    city: params.get('city_name'),
    locality: params.get('locality'),
    bhkType: bhkRaw ? (BHK_REVERSE[bhkRaw] ?? null) : null,
    propertyType: ptRaw ? (PROPERTY_TYPE_REVERSE[ptRaw] ?? null) : null,
    budget:
      minP || maxP
        ? { min: minP ? parseInt(minP, 10) : null, max: maxP ? parseInt(maxP, 10) : null }
        : null,
  }
}

// ── Segment pill button ────────────────────────────────────────────────────────

interface SegmentPillProps {
  icon: React.ReactNode
  label: string
  value: string | null
  open: boolean
  onClick: () => void
  onClear: () => void
}

function SegmentPill({ icon, label, value, open, onClick, onClear }: SegmentPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
        value
          ? 'border-[var(--color-primary)] bg-gray-50 text-[var(--color-primary)]'
          : open
            ? 'border-gray-400 bg-gray-50 text-gray-700'
            : 'border-[var(--color-border)] bg-white text-gray-500 hover:border-gray-400 hover:bg-gray-50',
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="hidden sm:inline">{value ?? label}</span>
      {value ? (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            onClear()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation()
              onClear()
            }
          }}
          aria-label={`Clear ${label}`}
          className="hover:bg-[var(--color-primary)]/10 flex h-4 w-4 items-center justify-center rounded-full"
        >
          <X className="h-3 w-3" />
        </span>
      ) : (
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      )}
    </button>
  )
}

// ── Chip row helper ────────────────────────────────────────────────────────────

function ChipRow({
  options,
  active,
  onToggle,
}: {
  options: string[]
  active: string | null
  onToggle: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onToggle(opt)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            active === opt
              ? 'border-[var(--color-primary)] bg-gray-50 text-[var(--color-primary)]'
              : 'border-[var(--color-border)] text-gray-600 hover:border-gray-400 hover:bg-gray-50',
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// ── Inner component ────────────────────────────────────────────────────────────

function HeaderSearchInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchBarRef = useRef<SearchBarHandle>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [openSegment, setOpenSegment] = useState<OpenSegment>(null)
  const [seg, setSeg] = useState<SegmentFilters>(() => segmentFiltersFromParams(searchParams))
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null)
  // Locality typeahead query
  const [localityQuery, setLocalityQuery] = useState(seg.locality ?? '')

  const q = searchParams.get('q') ?? ''

  // Sync URL → segment state when searchParams change externally
  useEffect(() => {
    const next = segmentFiltersFromParams(searchParams)
    setSeg(next)
    setLocalityQuery(next.locality ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()])

  // Pick up AI activation intent set by filter panel on non-properties pages
  useEffect(() => {
    try {
      if (sessionStorage.getItem('sir_activate_ai_mode') === '1') {
        sessionStorage.removeItem('sir_activate_ai_mode')
        setTimeout(() => searchBarRef.current?.activateAIMode(), 50)
      }
    } catch {
      /* sessionStorage unavailable */
    }
  }, [])

  // Close popovers on outside click or Escape
  useEffect(() => {
    if (!openSegment) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenSegment(null)
    }
    function onPointer(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpenSegment(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [openSegment])

  function toggle(s: OpenSegment) {
    setOpenSegment((prev) => (prev === s ? null : s))
  }

  function patch(next: Partial<SegmentFilters>) {
    const updated = { ...seg, ...next }
    setSeg(updated)
    router.push(buildPropertiesURL(q, updated, searchParams))
  }

  const handleSearch = useCallback(
    (query: string) => {
      router.push(buildPropertiesURL(query, seg, searchParams))
    },
    [router, seg, searchParams],
  )

  const handleAISearch = useCallback(
    (parsed: ParsedFilters, interpretation: string) => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          'sir_pending_ai_search',
          JSON.stringify({ filters: parsed, interpretation }),
        )
      }
      setAiInterpretation(interpretation)
      router.push('/properties')
    },
    [router],
  )

  const handleClearAI = useCallback(() => {
    setAiInterpretation(null)
    router.push(buildPropertiesURL(q, seg, searchParams))
  }, [router, q, seg, searchParams])

  const handleEnableAI = useCallback(() => {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/properties')) {
      sessionStorage.setItem('sir_activate_ai_mode', '1')
      router.push('/properties')
    } else {
      searchBarRef.current?.activateAIMode()
    }
  }, [router])

  // Budget label helper
  function budgetLabel() {
    if (!seg.budget) return null
    const p = BUDGET_PRESETS.find((b) => b.min === seg.budget!.min && b.max === seg.budget!.max)
    return p?.label ?? '₹ Custom'
  }

  // Where label
  function whereLabel() {
    if (seg.locality && seg.city) return `${seg.locality}, ${seg.city}`
    return seg.city ?? seg.locality ?? null
  }

  // What label
  function whatLabel() {
    const parts = [seg.bhkType, seg.propertyType].filter(Boolean)
    return parts.length > 0 ? parts.join(' · ') : null
  }

  const localities = seg.city ? filterLocalities(getLocalitiesForCity(seg.city), localityQuery) : []

  return (
    <div ref={containerRef} className="relative flex w-full items-center gap-2">
      {/* ── Search bar (unchanged — has ✦ AI pill inside) ── */}
      <div className="min-w-0 flex-1">
        <SearchBar
          ref={searchBarRef}
          onSearch={handleSearch}
          onAISearch={handleAISearch}
          defaultValue={q}
          showAIToggle
          isAIActive={!!aiInterpretation}
          aiInterpretation={aiInterpretation}
          onClearAI={handleClearAI}
          inline
        />
      </div>

      {/* ── 3 segment pills ── */}
      <div className="hidden shrink-0 items-center gap-1.5 md:flex">
        {/* WHERE */}
        <SegmentPill
          icon={<MapPin className="h-3.5 w-3.5" />}
          label="Where"
          value={whereLabel()}
          open={openSegment === 'where'}
          onClick={() => toggle('where')}
          onClear={() => {
            patch({ city: null, locality: null })
            setLocalityQuery('')
          }}
        />

        {/* WHAT */}
        <SegmentPill
          icon={<Home className="h-3.5 w-3.5" />}
          label="What"
          value={whatLabel()}
          open={openSegment === 'what'}
          onClick={() => toggle('what')}
          onClear={() => patch({ bhkType: null, propertyType: null })}
        />

        {/* BUDGET */}
        <SegmentPill
          icon={<IndianRupee className="h-3.5 w-3.5" />}
          label="Budget"
          value={budgetLabel()}
          open={openSegment === 'budget'}
          onClick={() => toggle('budget')}
          onClear={() => patch({ budget: null })}
        />
      </div>

      {/* ── Popovers ── */}
      {openSegment === 'where' && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[200] w-72 rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-xl md:left-[calc(100%-17rem)] md:right-auto">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
            City
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CITIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  patch({ city: seg.city === c ? null : c, locality: null })
                  setLocalityQuery('')
                }}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  seg.city === c
                    ? 'border-[var(--color-primary)] bg-gray-50 text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-gray-600 hover:border-gray-400 hover:bg-gray-50',
                )}
              >
                {c}
              </button>
            ))}
          </div>
          {seg.city && (
            <div className="relative mt-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Locality
              </p>
              <input
                type="text"
                value={localityQuery}
                onChange={(e) => {
                  setLocalityQuery(e.target.value)
                  if (!e.target.value.trim()) patch({ locality: null })
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && localities[0]) {
                    patch({ locality: localities[0].name })
                    setLocalityQuery(localities[0].name)
                  }
                  if (e.key === 'Escape') {
                    setLocalityQuery('')
                    patch({ locality: null })
                  }
                }}
                placeholder={`Search ${seg.city} localities…`}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:outline-none"
              />
              {localityQuery.trim() && localities.length > 0 && (
                <ul className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 max-h-44 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-white shadow-xl">
                  {localities.slice(0, 8).map((loc) => (
                    <li key={loc.name}>
                      <button
                        type="button"
                        onClick={() => {
                          patch({ locality: loc.name })
                          setLocalityQuery(loc.name)
                          setOpenSegment(null)
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                      >
                        {loc.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {openSegment === 'what' && (
        <div className="absolute right-[5.5rem] top-[calc(100%+8px)] z-[200] w-72 rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
            BHK
          </p>
          <ChipRow
            options={BHK_OPTIONS}
            active={seg.bhkType}
            onToggle={(v) => patch({ bhkType: seg.bhkType === v ? null : v })}
          />
          <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Type
          </p>
          <ChipRow
            options={TYPE_OPTIONS}
            active={seg.propertyType}
            onToggle={(v) => patch({ propertyType: seg.propertyType === v ? null : v })}
          />
        </div>
      )}

      {openSegment === 'budget' && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[200] w-64 rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
            Budget
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {BUDGET_PRESETS.map((p) => {
              const isActive = seg.budget?.min === p.min && seg.budget?.max === p.max
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    patch({ budget: isActive ? null : { min: p.min, max: p.max } })
                    setOpenSegment(null)
                  }}
                  className={cn(
                    'rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors',
                    isActive
                      ? 'border-[var(--color-primary)] bg-gray-50 text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] text-gray-700 hover:border-gray-400 hover:bg-gray-50',
                  )}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Public component ───────────────────────────────────────────────────────────

export function HeaderSearch() {
  const pathname = usePathname()
  if (pathname === '/') return null
  return <HeaderSearchInner />
}
