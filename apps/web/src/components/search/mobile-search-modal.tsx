'use client'

import { ChevronDown, IndianRupee, MapPin, Home, Search, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'
import { BudgetSegment } from './segments/budget-segment'
import { LocationSegment } from './segments/location-segment'
import { WhatSegment } from './segments/what-segment'
import {
  EMPTY_SMART_SEARCH_STATE,
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

// ── Accordion row (CSS grid trick for smooth height animation) ────────────────

type SectionKey = 'where' | 'what' | 'budget'

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

      {/* CSS grid trick — smooth height animation without JS measurement */}
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
}

// ── Sheet inner (rendered via portal, so position:fixed is relative to viewport) ─

function SheetInner({ open, defaultValues = {}, onSearch, onClose }: MobileSearchModalProps) {
  const [state, setState] = useState<SmartSearchState>({
    ...EMPTY_SMART_SEARCH_STATE,
    ...defaultValues,
  })
  const [openSection, setOpenSection] = useState<SectionKey>('where')
  const [visible, setVisible] = useState(false)

  // Sync URL-driven filter state on /properties
  useEffect(() => {
    setState({ ...EMPTY_SMART_SEARCH_STATE, ...defaultValues })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaultValues)])

  // Drive slide-in animation after open becomes true
  useEffect(() => {
    if (!open) {
      setVisible(false)
      return
    }
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [open])

  // Lock body scroll
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  function patch(p: Partial<SmartSearchState>) {
    setState((prev) => ({ ...prev, ...p }))
  }

  function toggleSection(sec: SectionKey) {
    setOpenSection((prev) => (prev === sec ? 'where' : sec))
  }

  function clearAll() {
    setState(EMPTY_SMART_SEARCH_STATE)
    setOpenSection('where')
  }

  function handleSearch() {
    onSearch(state)
    onClose()
  }

  const whereActive = !!(state.city || state.locality)
  const whatActive = state.bhkTypes.length > 0 || !!state.propertyType || !!state.furnishing
  const budgetActive = !!state.budget

  return (
    <>
      {/* Backdrop — covers full viewport because portal is under <body> */}
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
        className={cn(
          'fixed bottom-0 left-0 right-0 z-[501] flex max-h-[90dvh] flex-col',
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
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <h2 className="text-lg font-bold text-[var(--color-foreground)]">Find your home</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable accordion body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
              onCityChange={(city: string | null) => patch({ city, locality: null })}
              onLocalityChange={(locality: string | null) => patch({ locality })}
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
              onBHKChange={(bhkTypes: BHKType[]) => patch({ bhkTypes })}
              onPropertyTypeChange={(propertyType: PropertyType | null) =>
                patch({ propertyType })
              }
              onFurnishingChange={(furnishing: Furnishing | null) => patch({ furnishing })}
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
              onBudgetChange={(budget: BudgetRange | null) => patch({ budget })}
            />
          </AccordionRow>
        </div>

        {/* Sticky footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-[var(--color-border)] px-5 py-4">
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-semibold underline underline-offset-2 text-[var(--color-foreground)] hover:opacity-70 transition-opacity"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={handleSearch}
            className="flex items-center gap-2 rounded-xl bg-[var(--color-foreground)] px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>
      </div>
    </>
  )
}

// ── Public export — SSR-safe portal wrapper ───────────────────────────────────
// createPortal renders at document.body, escaping the header's backdrop-filter
// stacking context so position:fixed resolves to the viewport, not the header.

export function MobileSearchModal(props: MobileSearchModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !props.open) return null

  return createPortal(<SheetInner {...props} />, document.body)
}
