'use client'

import { ChevronDown, Loader2, Search, Sparkles, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

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

// ── Label helpers ─────────────────────────────────────────────────────────────

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

function budgetLabel(budget: BudgetRange | null): string {
  return budget?.label ?? ''
}

function matchBudgetPreset(min: number | null, max: number | null): BudgetRange | null {
  return BUDGET_PRESETS.find((p) => p.min === min && p.max === max) ?? null
}

// ── Accordion row (CSS grid trick for smooth height animation) ────────────────

type SectionKey = 'where' | 'what' | 'budget' | null

interface AccordionRowProps {
  label: string
  valueLabel: string
  placeholder: string
  isOpen: boolean
  hasValue: boolean
  onToggle: () => void
  children: React.ReactNode
}

function AccordionRow({
  label,
  valueLabel,
  placeholder,
  isOpen,
  hasValue,
  onToggle,
  children,
}: AccordionRowProps) {
  return (
    <div className="border-b border-[var(--color-border)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
            {label}
          </span>
          <span
            className={cn(
              'text-base font-semibold leading-snug',
              hasValue ? 'text-[var(--color-foreground)]' : 'text-gray-400',
            )}
          >
            {hasValue ? valueLabel : placeholder}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {/* CSS grid trick — animates height without JS measurement */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-1">{children}</div>
        </div>
      </div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface MobileSearchModalProps {
  open: boolean
  defaultValues?: Partial<SmartSearchState>
  onSearch: (state: SmartSearchState) => void
  onClose: () => void
  onExited?: () => void
}

// ── AI bar (full-width text input inside the sheet) ───────────────────────────

const AI_EXAMPLES = [
  '2BHK in Bandra Mumbai under 1.5Cr',
  'Studio near IT park Bangalore',
  '3BHK villa Hyderabad with garden',
]

interface AiBarProps {
  aiQuery: string
  loading: boolean
  error: string | null
  onQueryChange: (q: string) => void
  onSubmit: () => void
  onExit: () => void
}

function AiBar({ aiQuery, loading, error, onQueryChange, onSubmit, onExit }: AiBarProps) {
  return (
    <div className="flex flex-col gap-3 px-5 pb-4 pt-2">
      {/* Input row */}
      <div className="flex items-center overflow-hidden rounded-2xl border border-[var(--color-primary)] bg-[var(--color-muted)] shadow-sm [box-shadow:0_0_0_3px_rgba(34,34,34,0.08)]">
        <span
          className={cn(
            'pl-4 text-base leading-none',
            loading
              ? 'animate-pulse text-[var(--color-muted-foreground)]'
              : 'text-[var(--color-primary)]',
          )}
        >
          ✦
        </span>
        <textarea
          value={aiQuery}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSubmit()
            }
            if (e.key === 'Escape') onExit()
          }}
          placeholder="Describe your ideal home — e.g. 2BHK furnished in Bandra under 1Cr"
          readOnly={loading}
          rows={2}
          className="min-h-[52px] min-w-0 flex-1 resize-none bg-transparent px-3 py-3 text-sm italic text-gray-800 placeholder:text-[var(--color-muted-foreground)] focus:outline-none"
        />
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit AI mode"
          className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Example chips */}
      {!aiQuery.trim() && (
        <div className="flex flex-wrap gap-2">
          {AI_EXAMPLES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onQueryChange(q)}
              className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs text-gray-500 transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Sheet inner (rendered via portal) ────────────────────────────────────────

function SheetInner({
  open,
  defaultValues = {},
  onSearch,
  onClose,
  onExited,
}: MobileSearchModalProps) {
  const [state, setState] = useState<SmartSearchState>({
    ...EMPTY_SMART_SEARCH_STATE,
    ...defaultValues,
  })
  const [openSection, setOpenSection] = useState<SectionKey>('where')
  const [visible, setVisible] = useState(false)

  // AI mode state
  const [aiMode, setAiMode] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Sync defaults (URL-driven filter state on /properties)
  useEffect(() => {
    setState({ ...EMPTY_SMART_SEARCH_STATE, ...defaultValues })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaultValues)])

  // Drive slide-in animation after mount
  useEffect(() => {
    if (!open) {
      setVisible(false)
      return
    }
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [open])

  // Lock body scroll — iOS Safari requires position:fixed + saved scrollY
  useEffect(() => {
    if (!open) return
    const scrollY = window.scrollY
    const prevCssText = document.body.style.cssText
    document.body.style.cssText = `position:fixed;top:-${scrollY}px;left:0;right:0;overflow-y:scroll;`
    return () => {
      document.body.style.cssText = prevCssText
      window.scrollTo(0, scrollY)
    }
  }, [open])

  function patch(p: Partial<SmartSearchState>) {
    setState((prev) => ({ ...prev, ...p }))
  }

  function toggleSection(sec: Exclude<SectionKey, null>) {
    setOpenSection((prev) => (prev === sec ? null : sec))
  }

  function clearAll() {
    setState(EMPTY_SMART_SEARCH_STATE)
    setOpenSection('where')
    setAiMode(false)
    setAiError(null)
  }

  function handleSearch() {
    onSearch(state)
    onClose()
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

  const whereActive = !!(state.city || state.locality)
  const whatActive = state.bhkTypes.length > 0 || !!state.propertyType || !!state.furnishing
  const budgetActive = !!state.budget

  return (
    <>
      {/* Backdrop — position:fixed from body, not from header */}
      <div
        className={cn(
          'fixed inset-0 z-[500] bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom sheet panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search properties"
        onTransitionEnd={() => {
          if (!visible) onExited?.()
        }}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-[501] flex max-h-[92dvh] flex-col',
          'rounded-t-3xl bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.18)]',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3">
          <div className="h-1.5 w-12 rounded-full bg-gray-200" />
        </div>

        {/* Title row */}
        <div className="flex items-center justify-between px-5 pb-3 pt-3">
          <h2 className="text-lg font-bold text-[var(--color-foreground)]">Find your home</h2>
          <div className="flex items-center gap-2">
            {/* AI toggle button */}
            <button
              type="button"
              onClick={() => {
                setAiMode((v) => !v)
                setAiError(null)
              }}
              aria-label="Use AI search"
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-[background-color,color] duration-150',
                aiMode || state.aiFilledFields
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              <span className="leading-none">✦</span>
              AI
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* AI mode bar */}
          {aiMode && (
            <div className="border-b border-[var(--color-border)]">
              <AiBar
                aiQuery={state.aiQuery}
                loading={aiLoading}
                error={aiError}
                onQueryChange={(aiQuery) => patch({ aiQuery })}
                onSubmit={handleAISubmit}
                onExit={() => {
                  setAiMode(false)
                  setAiError(null)
                }}
              />
            </div>
          )}

          <AccordionRow
            label="Where"
            valueLabel={whereLabel(state.city, state.locality)}
            placeholder="Search city or area"
            isOpen={openSection === 'where'}
            hasValue={whereActive}
            onToggle={() => toggleSection('where')}
          >
            <LocationSegment
              city={state.city}
              locality={state.locality}
              aiFilledFields={state.aiFilledFields}
              onCityChange={(city) => patch({ city, locality: null })}
              onLocalityChange={(locality) => patch({ locality })}
              inlineResults
            />
          </AccordionRow>

          <AccordionRow
            label="What"
            valueLabel={whatLabel(state.bhkTypes, state.propertyType, state.furnishing)}
            placeholder="Type, BHK, furnishing"
            isOpen={openSection === 'what'}
            hasValue={whatActive}
            onToggle={() => toggleSection('what')}
          >
            <WhatSegment
              bhkTypes={state.bhkTypes}
              propertyType={state.propertyType}
              furnishing={state.furnishing}
              aiFilledFields={state.aiFilledFields}
              onBHKChange={(bhkTypes) => patch({ bhkTypes })}
              onPropertyTypeChange={(propertyType) => patch({ propertyType })}
              onFurnishingChange={(furnishing) => patch({ furnishing })}
            />
          </AccordionRow>

          <AccordionRow
            label="Budget"
            valueLabel={budgetLabel(state.budget)}
            placeholder="Any budget"
            isOpen={openSection === 'budget'}
            hasValue={budgetActive}
            onToggle={() => toggleSection('budget')}
          >
            <BudgetSegment
              budget={state.budget}
              aiFilledFields={state.aiFilledFields}
              onBudgetChange={(budget) => patch({ budget })}
            />
          </AccordionRow>
        </div>

        {/* Sticky footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-[var(--color-border)] px-5 py-4">
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-semibold text-[var(--color-foreground)] underline underline-offset-2 transition-opacity hover:opacity-70"
          >
            Clear all
          </button>
          {aiMode ? (
            <button
              type="button"
              onClick={handleAISubmit}
              disabled={aiLoading || !state.aiQuery.trim()}
              className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {aiLoading ? 'Searching…' : 'Search with AI'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSearch}
              className="flex items-center gap-2 rounded-xl bg-[var(--color-foreground)] px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ── Public component — portal wrapper (SSR-safe, exit-animation-safe) ─────────

export function MobileSearchModal(props: MobileSearchModalProps) {
  const [mounted, setMounted] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (props.open) setShouldRender(true)
    // Don't set false here — SheetInner calls onExited after the CSS transition ends
  }, [props.open])

  if (!mounted || !shouldRender) return null

  // Portal to document.body escapes the header's backdrop-filter stacking context,
  // allowing position:fixed children to use the viewport as their containing block.
  return createPortal(
    <SheetInner {...props} onExited={() => setShouldRender(false)} />,
    document.body,
  )
}
