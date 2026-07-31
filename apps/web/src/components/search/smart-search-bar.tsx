'use client'

import { MapPin, Home, IndianRupee, ChevronDown, X, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { BudgetSegment } from './segments/budget-segment'
import { LocationSegment } from './segments/location-segment'
import { WhatSegment } from './segments/what-segment'
import {
  BUDGET_PRESETS,
  EMPTY_SMART_SEARCH_STATE,
  type AiParseResponse,
  type BHKType,
  type BudgetRange,
  type Furnishing,
  type PropertyType,
  type SmartSearchState,
} from './smart-search-types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function budgetLabel(budget: BudgetRange | null): string {
  return budget?.label ?? ''
}

function whereLabel(city: string | null, locality: string | null): string {
  if (locality && city) return `${locality}, ${city}`
  return city ?? locality ?? ''
}

function whatLabel(
  bhkTypes: BHKType[],
  propertyType: PropertyType | null,
  furnishing: Furnishing | null,
): string {
  const parts: string[] = []
  if (bhkTypes.length === 1) parts.push(bhkTypes[0]!)
  else if (bhkTypes.length > 1) parts.push(bhkTypes.join(' / '))
  if (propertyType) parts.push(propertyType)
  if (furnishing) parts.push(furnishing)
  return parts.join(' · ')
}

function matchBudgetPreset(min: number | null, max: number | null): BudgetRange | null {
  return BUDGET_PRESETS.find((p) => p.min === min && p.max === max) ?? null
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface SmartSearchBarProps {
  defaultValues?: Partial<SmartSearchState>
  onSearch: (state: SmartSearchState) => void
  className?: string
}

// ── Segment wrapper — own relative anchor so popover sits directly below ───────

type SegmentKey = 'where' | 'what' | 'budget'

interface SegmentProps {
  segKey: SegmentKey
  icon: React.ReactNode
  label: string
  value: string
  active: boolean
  open: boolean
  aiFilledFields: boolean
  onToggle: () => void
  onClear: () => void
  popover: React.ReactNode
  popoverAlign?: 'left' | 'center' | 'right'
  /** Extra rounding classes for first/last segments so hover bg clips to the pill */
  roundingClass?: string
}

function Segment({
  segKey,
  icon,
  label,
  value,
  active,
  open,
  aiFilledFields,
  onToggle,
  onClear,
  popover,
  popoverAlign = 'left',
  roundingClass = '',
}: SegmentProps) {
  return (
    <div className="group/seg relative flex w-[160px] min-w-[130px] shrink items-stretch xl:w-[220px]">
      <button
        type="button"
        onClick={onToggle}
        data-open={open ? '' : undefined}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2.5 text-left transition-[background-color,box-shadow,color] duration-150',
          roundingClass,
          open ? 'bg-gray-100 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]' : 'hover:bg-gray-100',
        )}
      >
        <span
          className={cn(
            'shrink-0 transition-colors duration-150',
            active ? 'text-[var(--color-primary)]' : 'text-gray-400 group-hover/seg:text-gray-600',
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p
              className={cn(
                'text-xs font-semibold uppercase tracking-wide transition-colors duration-150',
                active
                  ? 'text-[var(--color-primary)]'
                  : 'text-gray-400 group-hover/seg:text-gray-600',
              )}
            >
              {label}
            </p>
            {aiFilledFields && active && (
              <span className="text-[9px] font-bold text-violet-500">✦</span>
            )}
          </div>
          <p
            className={cn(
              'truncate text-xs font-medium transition-colors duration-150',
              active ? 'text-gray-900' : 'text-gray-400 group-hover/seg:text-gray-700',
            )}
          >
            {active ? value : `Add ${label.toLowerCase()}`}
          </p>
        </div>
        {active ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClear()
            }}
            aria-label={`Clear ${label}`}
            className="shrink-0 rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform',
              open && 'rotate-180',
            )}
          />
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-[calc(100%+8px)] z-[200] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-xl',
            popoverAlign === 'left' && 'left-0',
            popoverAlign === 'center' && 'left-1/2 -translate-x-1/2',
            popoverAlign === 'right' && 'right-0',
          )}
          role="dialog"
        >
          {popover}
        </div>
      )}
    </div>
  )
}

// ── AI bar (full-width morphed state) ─────────────────────────────────────────

interface AiBarProps {
  aiQuery: string
  loading: boolean
  error: string | null
  aiActive: boolean
  onQueryChange: (q: string) => void
  onSubmit: () => void
  onExit: () => void
}

const AI_EXAMPLES = [
  '2BHK in Bandra Mumbai under 1.5Cr',
  'Studio near IT park Bangalore',
  '3BHK villa Hyderabad with garden',
]

function AiBar({ aiQuery, loading, error, aiActive, onQueryChange, onSubmit, onExit }: AiBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  return (
    <div className="relative w-full">
      {/* Input row — fixed height, never expands */}
      <div className="flex items-center overflow-hidden rounded-full border border-[var(--color-primary)] bg-[var(--color-muted)] shadow-sm [box-shadow:0_0_0_3px_rgba(34,34,34,0.08)]">
        <span
          className={cn(
            'pl-4 text-[15px] leading-none',
            loading
              ? 'animate-pulse text-[var(--color-muted-foreground)]'
              : 'text-[var(--color-primary)]',
          )}
        >
          ✦
        </span>
        <input
          ref={inputRef}
          type="text"
          value={aiQuery}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSubmit()
            }
            if (e.key === 'Escape') onExit()
          }}
          placeholder="Describe your ideal home — e.g. 2BHK furnished in Bandra under 1Cr"
          readOnly={loading}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm italic text-gray-800 placeholder:text-[var(--color-muted-foreground)] focus:outline-none"
        />
        {/* Exit button */}
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit AI mode"
          className="mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        {/* Submit */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !aiQuery.trim()}
          aria-label="Search with AI"
          className="mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {loading ? (
            <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Dropdown — error + chips — absolutely positioned so header height never changes */}
      {(error || (!aiQuery.trim() && !aiActive)) && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[300] flex flex-wrap gap-2 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 shadow-lg">
          {error && <p className="w-full text-xs text-red-500">{error}</p>}
          {!aiQuery.trim() &&
            !aiActive &&
            AI_EXAMPLES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  onQueryChange(q)
                  inputRef.current?.focus()
                }}
                className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs text-gray-500 transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                {q}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SmartSearchBar({ defaultValues = {}, onSearch, className }: SmartSearchBarProps) {
  const [state, setState] = useState<SmartSearchState>({
    ...EMPTY_SMART_SEARCH_STATE,
    ...defaultValues,
  })
  const [openSegment, setOpenSegment] = useState<SegmentKey | null>(null)
  const [aiMode, setAiMode] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setState({ ...EMPTY_SMART_SEARCH_STATE, ...defaultValues })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaultValues)])

  // Close segment popovers on outside click / Escape
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

  function toggleSegment(seg: SegmentKey) {
    setOpenSegment((p) => (p === seg ? null : seg))
  }

  function patch(p: Partial<SmartSearchState>) {
    setState((prev) => ({ ...prev, ...p }))
  }

  function clearAll() {
    setState(EMPTY_SMART_SEARCH_STATE)
    setOpenSegment(null)
  }

  async function handleAISubmit() {
    const q = state.aiQuery.trim()
    if (!q) {
      setAiError('Describe what you are looking for first.')
      return
    }
    setAiError(null)
    setAiLoading(true)
    try {
      const res = await fetch('/api/search/ai-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
        signal: AbortSignal.timeout(12_000),
      })
      if (!res.ok) {
        setAiError('AI is unavailable right now. Fill fields manually or retry.')
        return
      }
      const data = (await res.json()) as AiParseResponse
      setState((prev) => ({
        ...prev,
        city: data.city ?? prev.city,
        locality: data.locality ?? prev.locality,
        bhkTypes: data.bhkTypes.length > 0 ? data.bhkTypes : prev.bhkTypes,
        propertyType: data.propertyType ?? prev.propertyType,
        budget: matchBudgetPreset(data.budgetMin, data.budgetMax) ?? prev.budget,
        aiFilledFields: true,
      }))
      setAiMode(false)
    } catch {
      setAiError("Couldn't reach AI. Fill fields manually or retry.")
    } finally {
      setAiLoading(false)
    }
  }

  function handleSearch() {
    setOpenSegment(null)
    onSearch(state)
  }

  const whereActive = !!(state.city || state.locality)
  const whatActive = state.bhkTypes.length > 0 || !!state.propertyType || !!state.furnishing
  const budgetActive = !!state.budget
  const isAnythingSet = whereActive || whatActive || budgetActive
  const aiPillActive = state.aiFilledFields

  // ── AI mode: full-width input bar ─────────────────────────────────────────
  if (aiMode) {
    return (
      <div
        ref={containerRef}
        className={cn('relative flex w-full max-w-[760px] justify-center', className)}
      >
        <AiBar
          aiQuery={state.aiQuery}
          loading={aiLoading}
          error={aiError}
          aiActive={aiPillActive}
          onQueryChange={(aiQuery) => patch({ aiQuery })}
          onSubmit={handleAISubmit}
          onExit={() => {
            setAiMode(false)
            setAiError(null)
          }}
        />
      </div>
    )
  }

  // ── Normal segmented bar ──────────────────────────────────────────────────
  return (
    <div ref={containerRef} className={cn('flex min-w-0 justify-center', className)}>
      <div className="group/pill flex min-w-0 items-stretch rounded-full border border-[var(--color-border)] bg-white shadow-sm">
        {/* WHERE */}
        <Segment
          segKey="where"
          icon={<MapPin className="h-3.5 w-3.5" />}
          label="Where"
          value={whereLabel(state.city, state.locality)}
          active={whereActive}
          open={openSegment === 'where'}
          aiFilledFields={state.aiFilledFields}
          onToggle={() => toggleSegment('where')}
          onClear={() => patch({ city: null, locality: null })}
          roundingClass="rounded-l-full"
          popoverAlign="left"
          popover={
            <div className="w-96 p-5">
              <LocationSegment
                city={state.city}
                locality={state.locality}
                aiFilledFields={state.aiFilledFields}
                onCityChange={(city) => patch({ city, locality: null })}
                onLocalityChange={(locality) => patch({ locality })}
              />
              <PopoverFooter onClear={clearAll} onSearch={handleSearch} />
            </div>
          }
        />

        <div className="my-3 w-px shrink-0 self-stretch bg-[var(--color-border)] transition-opacity duration-150 group-has-[[data-open]]/pill:opacity-0" />

        {/* WHAT */}
        <Segment
          segKey="what"
          icon={<Home className="h-3.5 w-3.5" />}
          label="What"
          value={whatLabel(state.bhkTypes, state.propertyType, state.furnishing)}
          active={whatActive}
          open={openSegment === 'what'}
          aiFilledFields={state.aiFilledFields}
          onToggle={() => toggleSegment('what')}
          onClear={() => patch({ bhkTypes: [], propertyType: null, furnishing: null })}
          popoverAlign="center"
          popover={
            <div className="w-80 p-4">
              <WhatSegment
                bhkTypes={state.bhkTypes}
                propertyType={state.propertyType}
                furnishing={state.furnishing}
                aiFilledFields={state.aiFilledFields}
                onBHKChange={(bhkTypes) => patch({ bhkTypes })}
                onPropertyTypeChange={(propertyType) => patch({ propertyType })}
                onFurnishingChange={(furnishing) => patch({ furnishing })}
              />
              <PopoverFooter onClear={clearAll} onSearch={handleSearch} />
            </div>
          }
        />

        <div className="my-3 w-px shrink-0 self-stretch bg-[var(--color-border)] transition-opacity duration-150 group-has-[[data-open]]/pill:opacity-0" />

        {/* BUDGET */}
        <Segment
          segKey="budget"
          icon={<IndianRupee className="h-3.5 w-3.5" />}
          label="Budget"
          value={budgetLabel(state.budget)}
          active={budgetActive}
          open={openSegment === 'budget'}
          aiFilledFields={state.aiFilledFields}
          onToggle={() => toggleSegment('budget')}
          onClear={() => patch({ budget: null })}
          roundingClass="rounded-r-full"
          popoverAlign="right"
          popover={
            <div className="w-64 p-4">
              <BudgetSegment
                budget={state.budget}
                aiFilledFields={state.aiFilledFields}
                onBudgetChange={(budget) => {
                  patch({ budget })
                  setOpenSegment(null)
                }}
              />
            </div>
          }
        />

        {/* Divider + ✦ AI pill + Search */}
        <div className="my-2 w-px self-stretch bg-[var(--color-border)]" />
        <div className="flex shrink-0 items-center gap-1.5 px-2">
          <button
            type="button"
            onClick={() => {
              setAiMode(true)
              setAiError(null)
            }}
            aria-label="Use AI search"
            className={cn(
              'flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
              aiPillActive
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-900 hover:text-white',
            )}
          >
            <span className="leading-none">✦</span>
            <span className="hidden sm:inline">AI</span>
          </button>

          <button
            type="button"
            onClick={handleSearch}
            aria-label="Search properties"
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full text-white shadow-sm transition-all',
              isAnythingSet
                ? 'bg-[var(--color-primary)] hover:opacity-90'
                : 'bg-gray-800 hover:bg-gray-700',
            )}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Shared popover footer ─────────────────────────────────────────────────────

function PopoverFooter({ onClear, onSearch }: { onClear: () => void; onSearch: () => void }) {
  return (
    <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-[var(--color-muted-foreground)] underline-offset-2 hover:text-[var(--color-foreground)] hover:underline"
      >
        Clear all
      </button>
      <button
        type="button"
        onClick={onSearch}
        className="flex items-center gap-1.5 rounded-full bg-[var(--color-foreground)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800"
      >
        <Search className="h-3 w-3" />
        Search
      </button>
    </div>
  )
}
