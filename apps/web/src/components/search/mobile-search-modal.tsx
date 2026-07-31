'use client'

import { ChevronDown, IndianRupee, MapPin, Home, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

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

// ── Section label helpers ─────────────────────────────────────────────────────

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

// ── Accordion row ─────────────────────────────────────────────────────────────

interface AccordionRowProps {
  icon: React.ReactNode
  label: string
  valueLabel: string
  placeholder: string
  open: boolean
  hasValue: boolean
  onToggle: () => void
  children: React.ReactNode
}

function AccordionRow({
  icon,
  label,
  valueLabel,
  placeholder,
  open,
  hasValue,
  onToggle,
  children,
}: AccordionRowProps) {
  return (
    <div className="border-b border-[var(--color-border)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {label}
          </span>
          <span
            className={cn(
              'text-base font-semibold',
              hasValue ? 'text-[var(--color-foreground)]' : 'text-gray-400',
            )}
          >
            {hasValue ? valueLabel : placeholder}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {open && <div className="px-5 pb-5">{children}</div>}
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

// ── Modal ─────────────────────────────────────────────────────────────────────

export function MobileSearchModal({
  open,
  defaultValues = {},
  onSearch,
  onClose,
}: MobileSearchModalProps) {
  const [state, setState] = useState<SmartSearchState>({
    ...EMPTY_SMART_SEARCH_STATE,
    ...defaultValues,
  })
  const [openSection, setOpenSection] = useState<'where' | 'what' | 'budget'>('where')
  const panelRef = useRef<HTMLDivElement>(null)

  // Sync defaults when they change (e.g. URL-driven state on /properties)
  useEffect(() => {
    setState({ ...EMPTY_SMART_SEARCH_STATE, ...defaultValues })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaultValues)])

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  function patch(p: Partial<SmartSearchState>) {
    setState((prev) => ({ ...prev, ...p }))
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom sheet panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search properties"
        className="fixed bottom-0 left-0 right-0 z-[201] flex max-h-[90dvh] flex-col rounded-t-2xl bg-white shadow-2xl"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-bold text-[var(--color-foreground)]">Find your home</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable accordions */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AccordionRow
            icon={<MapPin className="h-4 w-4" />}
            label="Where"
            valueLabel={whereLabel(state.city, state.locality)}
            placeholder="Search city or area"
            open={openSection === 'where'}
            hasValue={whereActive}
            onToggle={() => setOpenSection((s) => (s === 'where' ? 'budget' : 'where'))}
          >
            <LocationSegment
              city={state.city}
              locality={state.locality}
              aiFilledFields={state.aiFilledFields}
              onCityChange={(city) => patch({ city, locality: null })}
              onLocalityChange={(locality) => patch({ locality })}
            />
          </AccordionRow>

          <AccordionRow
            icon={<Home className="h-4 w-4" />}
            label="What"
            valueLabel={whatLabel(state.bhkTypes, state.propertyType, state.furnishing)}
            placeholder="Type, BHK, furnishing"
            open={openSection === 'what'}
            hasValue={whatActive}
            onToggle={() => setOpenSection((s) => (s === 'what' ? 'where' : 'what'))}
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
            icon={<IndianRupee className="h-4 w-4" />}
            label="Budget"
            valueLabel={budgetLabel(state.budget)}
            placeholder="Any budget"
            open={openSection === 'budget'}
            hasValue={budgetActive}
            onToggle={() => setOpenSection((s) => (s === 'budget' ? 'where' : 'budget'))}
          >
            <BudgetSegment
              budget={state.budget}
              aiFilledFields={state.aiFilledFields}
              onBudgetChange={(budget) => {
                patch({ budget })
              }}
            />
          </AccordionRow>
        </div>

        {/* Sticky footer */}
        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-4">
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-semibold text-[var(--color-foreground)] underline"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={handleSearch}
            className="flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 active:scale-95"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>
      </div>
    </>
  )
}
