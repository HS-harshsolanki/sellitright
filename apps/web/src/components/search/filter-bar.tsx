'use client'

import { ChevronDown, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BudgetRange {
  min: number | null
  max: number | null
}

export interface ActiveFilters {
  bhkType?: string
  furnishing?: string
  propertyType?: string
  budget?: BudgetRange
}

interface FilterBarProps {
  onFilterChange?: (filters: ActiveFilters) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTER_OPTIONS = {
  bhkType: ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK'],
  furnishing: ['Furnished', 'Semi Furnished', 'Unfurnished'],
  propertyType: ['Apartment', 'Villa', 'Plot', 'Studio'],
} as const

const BUDGET_PRESETS: { label: string; min: number | null; max: number | null }[] = [
  { label: 'Under ₹75L', min: null, max: 7_500_000 },
  { label: '₹75L – ₹1.5Cr', min: 7_500_000, max: 15_000_000 },
  { label: '₹1.5Cr – ₹3Cr', min: 15_000_000, max: 30_000_000 },
  { label: '₹3Cr+', min: 30_000_000, max: null },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBudgetLabel(budget: BudgetRange): string {
  const fmt = (n: number) => {
    if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(n % 1_00_00_000 === 0 ? 0 : 1)}Cr`
    return `₹${(n / 1_00_000).toFixed(n % 1_00_000 === 0 ? 0 : 1)}L`
  }
  if (budget.min !== null && budget.max !== null) return `${fmt(budget.min)} – ${fmt(budget.max)}`
  if (budget.min !== null) return `${fmt(budget.min)}+`
  if (budget.max !== null) return `Under ${fmt(budget.max)}`
  return 'Budget'
}

function parseInputToRupees(raw: string): number | null {
  const n = parseFloat(raw.replace(/,/g, ''))
  if (isNaN(n) || n <= 0) return null
  return Math.round(n * 1_00_000) // treat input as lakhs
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FilterButtonProps {
  label: string
  isActive: boolean
  isOpen: boolean
  onToggle: () => void
  onClear: () => void
}

function FilterButton({ label, isActive, isOpen, onToggle, onClear }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      className={cn(
        'flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
        isActive
          ? 'border-[var(--color-primary)] bg-gray-50 text-[var(--color-primary)]'
          : 'border-[var(--color-border)] bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50',
      )}
    >
      <span>{label}</span>
      {isActive ? (
        <span
          role="button"
          aria-label={`Clear ${label} filter`}
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
          className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary)] text-white"
        >
          <X className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
      ) : (
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      )}
    </button>
  )
}

// ─── Budget Popover ────────────────────────────────────────────────────────────

interface BudgetPopoverProps {
  current: BudgetRange | undefined
  onApply: (range: BudgetRange) => void
  onClear: () => void
}

function BudgetPopover({ current, onApply, onClear }: BudgetPopoverProps) {
  const [minLakh, setMinLakh] = useState(current?.min != null ? String(current.min / 1_00_000) : '')
  const [maxLakh, setMaxLakh] = useState(current?.max != null ? String(current.max / 1_00_000) : '')

  const activePreset = BUDGET_PRESETS.find(
    (p) => p.min === (current?.min ?? null) && p.max === (current?.max ?? null),
  )

  const applyPreset = (preset: (typeof BUDGET_PRESETS)[number]) => {
    onApply({ min: preset.min, max: preset.max })
  }

  const applyManual = () => {
    const min = parseInputToRupees(minLakh)
    const max = parseInputToRupees(maxLakh)
    if (min !== null || max !== null) onApply({ min, max })
  }

  return (
    <div className="w-72 p-4" role="dialog" aria-label="Budget filter">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Quick select
      </p>
      <div className="grid grid-cols-2 gap-2">
        {BUDGET_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyPreset(preset)}
            className={cn(
              'rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors',
              activePreset?.label === preset.label
                ? 'border-[var(--color-primary)] bg-gray-50 text-[var(--color-primary)]'
                : 'border-[var(--color-border)] text-gray-700 hover:border-gray-400 hover:bg-gray-50',
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="my-4 flex items-center gap-2">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-xs text-gray-400">or enter range</span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label htmlFor="budget-min" className="mb-1 block text-xs text-gray-500">
            Min (Lakhs)
          </label>
          <input
            id="budget-min"
            type="number"
            min={0}
            placeholder="e.g. 50"
            value={minLakh}
            onChange={(e) => setMinLakh(e.target.value)}
            className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>
        <span className="mt-5 text-gray-400">–</span>
        <div className="flex-1">
          <label htmlFor="budget-max" className="mb-1 block text-xs text-gray-500">
            Max (Lakhs)
          </label>
          <input
            id="budget-max"
            type="number"
            min={0}
            placeholder="e.g. 100"
            value={maxLakh}
            onChange={(e) => setMaxLakh(e.target.value)}
            className="h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={applyManual}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

// ─── Simple option list popover ────────────────────────────────────────────────

interface OptionListProps {
  options: readonly string[]
  selected: string | undefined
  onSelect: (value: string) => void
  onClear: () => void
  label: string
}

function OptionList({ options, selected, onSelect, onClear, label }: OptionListProps) {
  return (
    <div className="py-2" role="menu" aria-label={`${label} filter`}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="menuitem"
          aria-current={selected === option ? 'true' : undefined}
          onClick={() => onSelect(option)}
          className={cn(
            'flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors',
            selected === option
              ? 'bg-gray-50 font-semibold text-[var(--color-primary)]'
              : 'text-gray-700 hover:bg-gray-50',
          )}
        >
          <span>{option}</span>
          {selected === option && (
            <span
              role="button"
              aria-label={`Remove ${option}`}
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
              className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary)] text-white"
            >
              <X className="h-2.5 w-2.5" />
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Main FilterBar ─────────────────────────────────────────────────────────────

// Popover position — fixed coordinates relative to the viewport.
// `right` is distance from the right edge of the viewport (for right-aligned panels).
interface PopoverPosition {
  top: number
  left?: number
  right?: number
}

export function FilterBar({ onFilterChange }: FilterBarProps) {
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({})
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  // Stores the viewport-relative position computed via getBoundingClientRect so the
  // popover panel can be rendered with `position: fixed` — completely outside the
  // overflow-x:auto scroll container that would otherwise clip it.
  const [popoverPos, setPopoverPos] = useState<PopoverPosition | null>(null)

  // One ref per pill wrapper div so we can read each button's bounding rect.
  const budgetPillRef = useRef<HTMLDivElement>(null)
  const bhkPillRef = useRef<HTMLDivElement>(null)
  const typePillRef = useRef<HTMLDivElement>(null)
  const furnishingPillRef = useRef<HTMLDivElement>(null)

  // The outer container ref — still used by the outside-click handler.
  // The fixed popover panel is a DOM child of this element so .contains() works correctly.
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape
  useEffect(() => {
    if (!openFilter) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenFilter(null)
    }

    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenFilter(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [openFilter])

  const updateFilter = (update: Partial<ActiveFilters>) => {
    const next = { ...activeFilters, ...update }
    // Remove budget if both values are null/undefined
    if ('budget' in update && update.budget?.min == null && update.budget?.max == null) {
      delete next.budget
    }
    setActiveFilters(next)
    onFilterChange?.(next)
    setOpenFilter(null)
    setPopoverPos(null)
  }

  const clearFilter = (key: keyof ActiveFilters) => {
    const next = { ...activeFilters }
    delete next[key]
    setActiveFilters(next)
    onFilterChange?.(next)
    setOpenFilter(null)
    setPopoverPos(null)
  }

  const clearAll = () => {
    setActiveFilters({})
    onFilterChange?.({})
    setOpenFilter(null)
    setPopoverPos(null)
  }

  // Compute the fixed position from the pill's bounding rect and open/close the panel.
  const toggle = (key: string, pillRef: React.RefObject<HTMLDivElement | null>) => {
    if (openFilter === key) {
      setOpenFilter(null)
      setPopoverPos(null)
      return
    }

    if (pillRef.current) {
      const rect = pillRef.current.getBoundingClientRect()
      const GAP = 8 // px gap between pill bottom and panel top
      // Align right for the last pill (furnishing) so the panel doesn't overflow off-screen.
      const alignRight = key === 'furnishing'
      setPopoverPos(
        alignRight
          ? { top: rect.bottom + GAP, right: window.innerWidth - rect.right }
          : { top: rect.bottom + GAP, left: rect.left },
      )
    }

    setOpenFilter(key)
  }

  const activeCount = Object.keys(activeFilters).length
  const budgetLabel = activeFilters.budget ? formatBudgetLabel(activeFilters.budget) : 'Budget'

  // Build the popover panel content for whichever filter is currently open.
  const popoverContent = (() => {
    switch (openFilter) {
      case 'budget':
        return (
          <BudgetPopover
            current={activeFilters.budget}
            onApply={(range) => updateFilter({ budget: range })}
            onClear={() => clearFilter('budget')}
          />
        )
      case 'bhkType':
        return (
          <OptionList
            options={FILTER_OPTIONS.bhkType}
            selected={activeFilters.bhkType}
            label="BHK"
            onSelect={(v) => updateFilter({ bhkType: v })}
            onClear={() => clearFilter('bhkType')}
          />
        )
      case 'propertyType':
        return (
          <OptionList
            options={FILTER_OPTIONS.propertyType}
            selected={activeFilters.propertyType}
            label="Property type"
            onSelect={(v) => updateFilter({ propertyType: v })}
            onClear={() => clearFilter('propertyType')}
          />
        )
      case 'furnishing':
        return (
          <OptionList
            options={FILTER_OPTIONS.furnishing}
            selected={activeFilters.furnishing}
            label="Furnishing"
            onSelect={(v) => updateFilter({ furnishing: v })}
            onClear={() => clearFilter('furnishing')}
          />
        )
      default:
        return null
    }
  })()

  return (
    <div ref={containerRef} className="w-full">
      {/* Filter chips row — scrollable on mobile so pills never wrap.
          IMPORTANT: <Popover> panels are intentionally NOT rendered inside this
          div. The overflow-x:auto on this element triggers the CSS spec behaviour
          where overflow-y is coerced to auto as well, which clips any absolutely-
          positioned children. Instead, panels are rendered as a sibling of this
          row and positioned with `position:fixed` + getBoundingClientRect(). */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Budget */}
        <div ref={budgetPillRef} className="shrink-0">
          <FilterButton
            label={budgetLabel}
            isActive={!!activeFilters.budget}
            isOpen={openFilter === 'budget'}
            onToggle={() => toggle('budget', budgetPillRef)}
            onClear={() => clearFilter('budget')}
          />
        </div>

        {/* BHK */}
        <div ref={bhkPillRef} className="shrink-0">
          <FilterButton
            label={activeFilters.bhkType ?? 'BHK'}
            isActive={!!activeFilters.bhkType}
            isOpen={openFilter === 'bhkType'}
            onToggle={() => toggle('bhkType', bhkPillRef)}
            onClear={() => clearFilter('bhkType')}
          />
        </div>

        {/* Type */}
        <div ref={typePillRef} className="shrink-0">
          <FilterButton
            label={activeFilters.propertyType ?? 'Type'}
            isActive={!!activeFilters.propertyType}
            isOpen={openFilter === 'propertyType'}
            onToggle={() => toggle('propertyType', typePillRef)}
            onClear={() => clearFilter('propertyType')}
          />
        </div>

        {/* Furnishing */}
        <div ref={furnishingPillRef} className="shrink-0">
          <FilterButton
            label={activeFilters.furnishing ?? 'Furnishing'}
            isActive={!!activeFilters.furnishing}
            isOpen={openFilter === 'furnishing'}
            onToggle={() => toggle('furnishing', furnishingPillRef)}
            onClear={() => clearFilter('furnishing')}
          />
        </div>

        {/* Clear all — only when there are active filters */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="min-h-[44px] shrink-0 px-1 text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Fixed-position popover panel — rendered outside the overflow scroll row so
          it is never clipped, but still a DOM child of containerRef so the
          outside-click handler (containerRef.contains) continues to work. */}
      {openFilter && popoverPos && popoverContent && (
        <div
          style={{
            position: 'fixed',
            top: popoverPos.top,
            ...(popoverPos.left !== undefined ? { left: popoverPos.left } : {}),
            ...(popoverPos.right !== undefined ? { right: popoverPos.right } : {}),
            zIndex: 200,
          }}
          className="min-w-[200px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-lg"
        >
          {popoverContent}
        </div>
      )}

      {/* Active filters — removable pills */}
      {activeCount > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {activeFilters.budget && (
            <button
              type="button"
              onClick={() => clearFilter('budget')}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] transition-colors hover:bg-gray-200"
            >
              {formatBudgetLabel(activeFilters.budget)}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
          {activeFilters.bhkType && (
            <button
              type="button"
              onClick={() => clearFilter('bhkType')}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] transition-colors hover:bg-gray-200"
            >
              {activeFilters.bhkType}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
          {activeFilters.propertyType && (
            <button
              type="button"
              onClick={() => clearFilter('propertyType')}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] transition-colors hover:bg-gray-200"
            >
              {activeFilters.propertyType}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
          {activeFilters.furnishing && (
            <button
              type="button"
              onClick={() => clearFilter('furnishing')}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] transition-colors hover:bg-gray-200"
            >
              {activeFilters.furnishing}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
