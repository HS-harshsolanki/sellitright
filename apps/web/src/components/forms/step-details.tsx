'use client'

import { useMemo, useState } from 'react'

import { ChevronDown, Minus, Plus } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  type BHKType,
  type Facing,
  type Furnishing,
  type Parking,
  useSellFormStore,
} from '@/stores/sell-form.store'

const AMENITY_LIST = [
  'Lift',
  'Security',
  'Power Backup',
  'Parking',
  'Gym',
  'Clubhouse',
  'Swimming Pool',
  'Garden',
  'CCTV',
  'Intercom',
  'Fire Safety',
  'Playground',
]

const BHK_OPTIONS: { value: BHKType; label: string }[] = [
  { value: 'ONE_BHK', label: '1 BHK' },
  { value: 'TWO_BHK', label: '2 BHK' },
  { value: 'THREE_BHK', label: '3 BHK' },
  { value: 'FOUR_BHK', label: '4 BHK' },
  { value: 'FIVE_PLUS_BHK', label: '5+ BHK' },
]

const FACING_OPTIONS: { value: Facing; label: string }[] = [
  { value: 'NORTH', label: 'North' },
  { value: 'SOUTH', label: 'South' },
  { value: 'EAST', label: 'East' },
  { value: 'WEST', label: 'West' },
  { value: 'NORTH_EAST', label: 'North East' },
  { value: 'NORTH_WEST', label: 'North West' },
  { value: 'SOUTH_EAST', label: 'South East' },
  { value: 'SOUTH_WEST', label: 'South West' },
]

const FURNISHING_OPTIONS: { value: Furnishing; label: string; description: string }[] = [
  { value: 'FURNISHED', label: 'Furnished', description: 'All furniture & appliances included' },
  { value: 'SEMI_FURNISHED', label: 'Semi-furnished', description: 'Some fittings included' },
  { value: 'UNFURNISHED', label: 'Unfurnished', description: 'Empty — no furnishings' },
]

const PARKING_OPTIONS: { value: Parking; label: string }[] = [
  { value: 'COVERED', label: 'Covered parking' },
  { value: 'OPEN', label: 'Open parking' },
  { value: 'BOTH', label: 'Both' },
  { value: 'NONE', label: 'No parking' },
]

const inputBase = cn(
  'w-full rounded-lg border bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground',
  'transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
)

const labelClass = 'block text-sm font-medium text-foreground'

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground border-border border-b pb-2 text-xs font-semibold uppercase tracking-wider">
      {children}
    </p>
  )
}

interface CounterProps {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (val: number) => void
}

function Counter({ label, value, min = 0, max = 20, onChange }: CounterProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-foreground text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className={cn(
            'border-border flex h-9 w-9 items-center justify-center rounded-full border',
            'hover:border-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-30',
          )}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-6 text-center text-sm font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className={cn(
            'border-border flex h-9 w-9 items-center justify-center rounded-full border',
            'hover:border-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-30',
          )}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

interface StepDetailsProps {
  showErrors?: boolean
}

export function StepDetails({ showErrors = false }: StepDetailsProps) {
  const { details, propertyType, setDetails } = useSellFormStore()

  const [showOptional, setShowOptional] = useState(() => {
    const d = useSellFormStore.getState().details
    return !!(
      d.carpetArea ||
      d.floor ||
      d.totalFloors ||
      d.facing ||
      d.ageOfProperty ||
      d.parking ||
      (d.amenities && d.amenities.length > 0)
    )
  })

  const suggestedAmenities = useMemo(() => {
    const base = ['Lift', 'Security', 'Power Backup']
    if (propertyType === 'PENTHOUSE') return [...base, 'Gym', 'Swimming Pool', 'Clubhouse']
    return base
  }, [propertyType])

  const bhkMissing = showErrors && !details.bhkType
  const areaMissing = showErrors && !details.builtUpArea
  const furnishingMissing = showErrors && !details.furnishing

  const toggleAmenity = (amenity: string) => {
    const current = details.amenities
    setDetails({
      amenities: current.includes(amenity)
        ? current.filter((a) => a !== amenity)
        : [...current, amenity],
    })
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Tell us about your home.
        </h2>
        <p className="text-muted-foreground">
          Add details to help buyers understand your property better.
        </p>
      </div>

      {/* ── Home details (required) ── */}
      <div className="space-y-6">
        <SectionHeading>Home details</SectionHeading>

        {/* BHK */}
        <fieldset className="space-y-3">
          <legend className={labelClass}>
            BHK configuration <span className="text-destructive">*</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {BHK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={details.bhkType === opt.value}
                onClick={() => setDetails({ bhkType: opt.value })}
                className={cn(
                  'rounded-full border-2 px-4 py-2 text-sm font-medium transition-all',
                  'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                  details.bhkType === opt.value
                    ? 'border-primary bg-primary text-white'
                    : bhkMissing
                      ? 'border-destructive/60 text-foreground hover:border-primary/50'
                      : 'border-border text-foreground hover:border-primary/50',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {bhkMissing && (
            <p role="alert" className="text-destructive text-xs">
              Please select a BHK configuration.
            </p>
          )}
        </fieldset>

        {/* Built-up area */}
        <div className="space-y-1.5">
          <label htmlFor="builtup" className={labelClass}>
            Built-up area (sq ft) <span className="text-destructive">*</span>
          </label>
          <input
            id="builtup"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="e.g. 1200"
            value={details.builtUpArea}
            onChange={(e) => setDetails({ builtUpArea: e.target.value })}
            aria-invalid={areaMissing ? 'true' : undefined}
            aria-describedby={areaMissing ? 'builtup-error' : undefined}
            className={cn(
              inputBase,
              'max-w-xs',
              areaMissing
                ? 'border-destructive focus:border-destructive'
                : 'border-border focus:border-primary',
            )}
          />
          {areaMissing && (
            <p id="builtup-error" role="alert" className="text-destructive text-xs">
              Please enter the built-up area.
            </p>
          )}
        </div>
      </div>

      {/* ── Condition (required) ── */}
      <div className="space-y-6">
        <SectionHeading>Condition</SectionHeading>

        {/* Furnishing */}
        <fieldset className="space-y-3">
          <legend className={labelClass}>
            Furnishing status <span className="text-destructive">*</span>
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {FURNISHING_OPTIONS.map((opt) => {
              const isSelected = details.furnishing === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setDetails({ furnishing: opt.value })}
                  className={cn(
                    'rounded-xl border-2 p-4 text-left transition-all',
                    'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : furnishingMissing
                        ? 'border-destructive/60 hover:border-primary/40'
                        : 'border-border hover:border-primary/40',
                  )}
                >
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      isSelected ? 'text-primary' : 'text-foreground',
                    )}
                  >
                    {opt.label}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">{opt.description}</p>
                </button>
              )
            })}
          </div>
          {furnishingMissing && (
            <p role="alert" className="text-destructive text-xs">
              Please select furnishing status.
            </p>
          )}
        </fieldset>
      </div>

      {/* ── Optional expander ── */}
      {!showOptional && (
        <button
          type="button"
          onClick={() => setShowOptional(true)}
          className="flex w-full items-center gap-1.5 rounded-lg border border-dashed border-[var(--color-border)] px-4 py-3 text-sm font-medium text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          <ChevronDown className="h-4 w-4" />
          Add more details — floor, parking, amenities & more (optional)
        </button>
      )}

      {/* ── Optional fields ── */}
      {showOptional && (
        <>
          {/* More home details: carpet area, floor, facing */}
          <div className="space-y-6">
            <SectionHeading>More home details</SectionHeading>

            {/* Carpet area */}
            <div className="space-y-1.5">
              <label htmlFor="carpet" className={labelClass}>
                Carpet area (sq ft)
              </label>
              <input
                id="carpet"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Optional"
                value={details.carpetArea}
                onChange={(e) => setDetails({ carpetArea: e.target.value })}
                className={cn(inputBase, 'border-border focus:border-primary max-w-xs')}
              />
              {details.builtUpArea &&
                parseInt(details.builtUpArea, 10) > 0 &&
                !details.carpetArea && (
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Approx.{' '}
                    <span className="font-medium">
                      {Math.round(parseInt(details.builtUpArea, 10) * 0.7).toLocaleString('en-IN')}{' '}
                      sq ft
                    </span>{' '}
                    typical for Indian apartments (70% of built-up area).{' '}
                    <button
                      type="button"
                      onClick={() =>
                        setDetails({
                          carpetArea: String(Math.round(parseInt(details.builtUpArea, 10) * 0.7)),
                        })
                      }
                      className="text-[var(--color-accent)] underline hover:no-underline focus-visible:outline-none"
                    >
                      Use this
                    </button>
                  </p>
                )}
            </div>

            {/* Floor */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="floor" className={labelClass}>
                  Floor number
                </label>
                <input
                  id="floor"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="e.g. 5"
                  value={details.floor}
                  onChange={(e) => setDetails({ floor: e.target.value })}
                  className={cn(inputBase, 'border-border focus:border-primary')}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="totalfloors" className={labelClass}>
                  Total floors
                </label>
                <input
                  id="totalfloors"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="e.g. 14"
                  value={details.totalFloors}
                  onChange={(e) => setDetails({ totalFloors: e.target.value })}
                  className={cn(inputBase, 'border-border focus:border-primary')}
                />
              </div>
            </div>

            {/* Facing */}
            <div className="space-y-1.5">
              <label htmlFor="facing" className={labelClass}>
                Facing direction
              </label>
              <select
                id="facing"
                value={details.facing ?? ''}
                onChange={(e) => setDetails({ facing: (e.target.value as Facing) || null })}
                className={cn(
                  inputBase,
                  'border-border focus:border-primary cursor-pointer appearance-none',
                )}
              >
                <option value="">Select facing</option>
                {FACING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Living experience ── */}
          <div className="space-y-6">
            <SectionHeading>Living experience</SectionHeading>

            {/* Counters */}
            <div className="border-border space-y-4 rounded-xl border p-4">
              <Counter
                label="Bathrooms"
                value={details.bathrooms}
                min={1}
                max={10}
                onChange={(val) => setDetails({ bathrooms: val })}
              />
              <div className="border-border border-t" />
              <Counter
                label="Balconies"
                value={details.balconies}
                min={0}
                max={10}
                onChange={(val) => setDetails({ balconies: val })}
              />
            </div>

            {/* Parking */}
            <fieldset className="space-y-3">
              <legend className={labelClass}>Parking</legend>
              <div className="flex flex-wrap gap-2">
                {PARKING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={details.parking === opt.value}
                    onClick={() => setDetails({ parking: opt.value })}
                    className={cn(
                      'rounded-full border-2 px-4 py-2 text-sm font-medium transition-all',
                      'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                      details.parking === opt.value
                        ? 'border-primary bg-primary text-white'
                        : 'border-border text-foreground hover:border-primary/50',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {/* ── Age of property ── */}
          <div className="space-y-6">
            <SectionHeading>Property age</SectionHeading>
            <div className="space-y-1.5">
              <label htmlFor="age" className={labelClass}>
                Age of property (years)
              </label>
              <input
                id="age"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="e.g. 3"
                value={details.ageOfProperty}
                onChange={(e) => setDetails({ ageOfProperty: e.target.value })}
                className={cn(inputBase, 'border-border focus:border-primary max-w-xs')}
              />
            </div>
          </div>

          {/* ── Amenities ── */}
          <div className="space-y-4">
            <SectionHeading>Amenities</SectionHeading>
            <p className="text-muted-foreground text-sm">
              Select everything available in your society.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {AMENITY_LIST.map((amenity) => {
                const isChecked = details.amenities.includes(amenity)
                const isSuggested = suggestedAmenities.includes(amenity) && !isChecked
                return (
                  <label
                    key={amenity}
                    className={cn(
                      'border-border flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
                      isChecked ? 'border-primary bg-primary/5' : 'hover:border-primary/40',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleAmenity(amenity)}
                      className="accent-primary h-4 w-4 cursor-pointer"
                    />
                    <span
                      className={cn(
                        'text-sm',
                        isChecked ? 'text-primary font-medium' : 'text-foreground',
                      )}
                    >
                      {amenity}
                      {isSuggested && (
                        <span className="ml-1 text-xs text-[var(--color-muted-foreground)]">
                          Suggested
                        </span>
                      )}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
