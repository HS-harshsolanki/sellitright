'use client'

import { SlidersHorizontal, X, ChevronDown, Sparkle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterPanelFilters {
  bhkType?: string
  furnishing?: string
  propertyType?: string
  budget?: { min: number | null; max: number | null }
}

interface FilterPanelProps {
  filters?: FilterPanelFilters
  onFiltersChange: (filters: FilterPanelFilters) => void
  onEnableAI?: () => void
  /** When true, AI is already active — show "AI active" state instead of "Enable AI" */
  isAIActive?: boolean
  onClearAI?: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BHK_OPTIONS = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK']
const FURNISHING_OPTIONS = ['Furnished', 'Semi Furnished', 'Unfurnished']
const TYPE_OPTIONS = ['Apartment', 'Villa', 'Plot', 'Studio']
const BUDGET_PRESETS = [
  { label: 'Under ₹75L', min: null, max: 7_500_000 },
  { label: '₹75L – ₹1.5Cr', min: 7_500_000, max: 15_000_000 },
  { label: '₹1.5Cr – ₹3Cr', min: 15_000_000, max: 30_000_000 },
  { label: '₹3Cr+', min: 30_000_000, max: null },
]

function activeCount(f: FilterPanelFilters): number {
  let n = 0
  if (f.bhkType) n++
  if (f.furnishing) n++
  if (f.propertyType) n++
  if (f.budget) n++
  return n
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FilterPanel({
  filters = {},
  onFiltersChange,
  onEnableAI,
  isAIActive = false,
  onClearAI,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<FilterPanelFilters>(filters)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  // Sync external filters into local state
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onPointer(e: PointerEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      )
        setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  function update(patch: Partial<FilterPanelFilters>) {
    const next = { ...localFilters, ...patch }
    // Remove nullish budget
    if ('budget' in patch && patch.budget?.min == null && patch.budget?.max == null) {
      delete next.budget
    }
    setLocalFilters(next)
    onFiltersChange(next)
  }

  function clearAll() {
    setLocalFilters({})
    onFiltersChange({})
  }

  const count = activeCount(localFilters) + (isAIActive ? 1 : 0)
  const hasFilters = count > 0

  return (
    <div className="relative shrink-0">
      {/* Trigger button */}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Filters"
        aria-expanded={open}
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
          hasFilters
            ? 'border-[var(--color-primary)] bg-gray-50 text-[var(--color-primary)]'
            : 'border-[var(--color-border)] bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50',
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Filters</span>
        {count > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white">
            {count}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+8px)] z-[200] w-72 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-xl"
          role="dialog"
          aria-label="Search filters"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <span className="text-sm font-semibold text-[var(--color-foreground)]">Filters</span>
            <div className="flex items-center gap-2">
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    clearAll()
                    if (isAIActive) onClearAI?.()
                  }}
                  className="text-xs text-[var(--color-muted-foreground)] underline-offset-2 hover:text-[var(--color-foreground)] hover:underline"
                >
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-gray-100"
                aria-label="Close filters"
              >
                <X className="h-3.5 w-3.5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            {/* Budget */}
            <FilterSection
              label="Budget"
              active={!!localFilters.budget}
              onClear={() => update({ budget: undefined })}
            >
              <div className="grid grid-cols-2 gap-1.5">
                {BUDGET_PRESETS.map((p) => {
                  const isActive =
                    localFilters.budget?.min === p.min && localFilters.budget?.max === p.max
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        update({ budget: isActive ? undefined : { min: p.min, max: p.max } })
                      }
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
            </FilterSection>

            {/* BHK */}
            <FilterSection
              label="BHK"
              active={!!localFilters.bhkType}
              onClear={() => update({ bhkType: undefined })}
            >
              <div className="flex flex-wrap gap-1.5">
                {BHK_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      update({ bhkType: localFilters.bhkType === opt ? undefined : opt })
                    }
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      localFilters.bhkType === opt
                        ? 'border-[var(--color-primary)] bg-gray-50 text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-gray-700 hover:border-gray-400',
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Property Type */}
            <FilterSection
              label="Type"
              active={!!localFilters.propertyType}
              onClear={() => update({ propertyType: undefined })}
            >
              <div className="flex flex-wrap gap-1.5">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      update({ propertyType: localFilters.propertyType === opt ? undefined : opt })
                    }
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      localFilters.propertyType === opt
                        ? 'border-[var(--color-primary)] bg-gray-50 text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-gray-700 hover:border-gray-400',
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Furnishing */}
            <FilterSection
              label="Furnishing"
              active={!!localFilters.furnishing}
              onClear={() => update({ furnishing: undefined })}
            >
              <div className="flex flex-wrap gap-1.5">
                {FURNISHING_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      update({ furnishing: localFilters.furnishing === opt ? undefined : opt })
                    }
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      localFilters.furnishing === opt
                        ? 'border-[var(--color-primary)] bg-gray-50 text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-gray-700 hover:border-gray-400',
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </FilterSection>
          </div>

          {/* Footer: AI toggle */}
          <div className="border-t border-[var(--color-border)] p-3">
            {isAIActive ? (
              <button
                type="button"
                onClick={() => {
                  onClearAI?.()
                  setOpen(false)
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-100"
              >
                <Sparkle className="h-4 w-4" aria-hidden="true" />
                AI Search active · Clear
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onEnableAI?.()
                  setOpen(false)
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50"
              >
                <Sparkle className="h-4 w-4 text-amber-500" aria-hidden="true" />✦ Use AI Search
                instead
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Section sub-component ────────────────────────────────────────────────────

function FilterSection({
  label,
  active,
  onClear,
  children,
}: {
  label: string
  active: boolean
  onClear: () => void
  children: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="px-4 py-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mb-2.5 flex w-full items-center justify-between"
      >
        <span
          className={cn(
            'text-xs font-semibold uppercase tracking-wide',
            active ? 'text-[var(--color-primary)]' : 'text-gray-500',
          )}
        >
          {label}
          {active && <span className="ml-1 text-[var(--color-primary)]">·</span>}
        </span>
        <div className="flex items-center gap-2">
          {active && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClear()
              }}
              className="text-[11px] text-[var(--color-muted-foreground)] underline-offset-2 hover:underline"
            >
              Clear
            </button>
          )}
          <ChevronDown
            className={cn('h-3 w-3 text-gray-400 transition-transform', expanded && 'rotate-180')}
          />
        </div>
      </button>
      {expanded && children}
    </div>
  )
}
