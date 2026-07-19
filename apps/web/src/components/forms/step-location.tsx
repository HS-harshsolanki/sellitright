'use client'

import { AlertCircle, MapPin } from 'lucide-react'

import { LocalityCombobox } from '@/components/forms/locality-combobox'
import { getLocalitiesForCity, type LocalityOption } from '@/lib/localities'
import { cn } from '@/lib/utils'
import { useSellFormStore } from '@/stores/sell-form.store'

interface CityOption {
  label: string
  value: string
  state: string
}

const CITIES: CityOption[] = [
  { label: 'Mumbai', value: 'Mumbai', state: 'Maharashtra' },
  { label: 'Pune', value: 'Pune', state: 'Maharashtra' },
  { label: 'Bangalore', value: 'Bengaluru', state: 'Karnataka' },
  { label: 'Delhi NCR', value: 'Delhi NCR', state: 'Delhi' },
  { label: 'Hyderabad', value: 'Hyderabad', state: 'Telangana' },
  { label: 'Chennai', value: 'Chennai', state: 'Tamil Nadu' },
  { label: 'Kolkata', value: 'Kolkata', state: 'West Bengal' },
  { label: 'Ahmedabad', value: 'Ahmedabad', state: 'Gujarat' },
]

const inputBase = cn(
  'w-full rounded-lg border bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground',
  'transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
)

const labelClass = 'block text-sm font-medium text-foreground'

interface StepLocationProps {
  showErrors?: boolean
}

export function StepLocation({ showErrors = false }: StepLocationProps) {
  const { location, setLocation } = useSellFormStore()

  const cityMissing = showErrors && !location.city
  const localityMissing = showErrors && !location.locality.trim()
  const pincodeMissing = showErrors && location.pincode.length !== 6

  const handleCityChange = (value: string) => {
    const cityOption = CITIES.find((c) => c.value === value)
    setLocation({ city: value, state: cityOption?.state ?? '', locality: '', pincode: '' })
  }

  const handleLocalitySelect = (option: LocalityOption | null) => {
    if (!option) {
      setLocation({ locality: '' })
      return
    }
    // Always write pincode — clears stale value when locality has no pincode
    setLocation({
      locality: option.name,
      pincode: option.pincode ?? '',
      ...(option.city && !location.city ? { city: option.city } : {}),
    })
  }

  const localities = getLocalitiesForCity(location.city)

  // Determine if selected locality is curated (has a pincode from the list)
  const selectedLocality = localities.find((l) => l.name === location.locality)
  const localityIsCustom = location.locality.trim() !== '' && !selectedLocality
  const localityHasAutofill =
    location.locality.trim() !== '' && !!selectedLocality && !!location.pincode

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Where is your home located?
        </h2>
        <p className="text-muted-foreground">
          We&apos;ll only show the location you choose to share publicly.
        </p>
      </div>

      <div className="space-y-4">
        {/* City */}
        <div className="space-y-1.5">
          <label htmlFor="city" className={labelClass}>
            City <span className="text-destructive">*</span>
          </label>
          <select
            id="city"
            value={location.city}
            onChange={(e) => handleCityChange(e.target.value)}
            aria-invalid={cityMissing ? 'true' : undefined}
            className={cn(
              inputBase,
              'cursor-pointer appearance-none',
              cityMissing
                ? 'border-destructive focus:border-destructive'
                : 'border-border focus:border-primary',
            )}
          >
            <option value="" disabled>
              Select your city
            </option>
            {CITIES.map((city) => (
              <option key={city.value} value={city.value}>
                {city.label}
              </option>
            ))}
          </select>
          {cityMissing && (
            <p role="alert" className="text-destructive text-xs">
              Please select a city.
            </p>
          )}
        </div>

        {/* State (auto-filled) */}
        {location.state && (
          <div className="bg-muted flex items-center gap-2 rounded-lg px-4 py-3">
            <span className="text-muted-foreground text-sm">State:</span>
            <span className="text-foreground text-sm font-medium">{location.state}</span>
          </div>
        )}

        {/* Locality */}
        <div className="space-y-1.5">
          <label htmlFor="locality" className={labelClass}>
            Locality / Area <span className="text-destructive">*</span>
          </label>

          <LocalityCombobox
            localities={localities}
            value={location.locality}
            onChange={handleLocalitySelect}
            hasError={localityMissing}
            disabled={!location.city}
            placeholder={
              location.city
                ? `Search or type your area in ${location.city}…`
                : 'Select a city first'
            }
          />

          {localityMissing && (
            <p role="alert" className="text-destructive text-xs">
              Please enter your locality or area.
            </p>
          )}

          {/* Pincode auto-filled */}
          {localityHasAutofill && (
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <MapPin className="h-3 w-3" />
              Pincode auto-filled:{' '}
              <span className="text-foreground font-medium">{location.pincode}</span>
            </p>
          )}

          {/* Custom locality — prompt user to enter pincode manually */}
          {localityIsCustom && (
            <p className="flex items-center gap-1 text-xs text-amber-600">
              <AlertCircle className="h-3 w-3 shrink-0" />
              This area isn&apos;t in our list — please enter the pincode below.
            </p>
          )}
        </div>

        {/* Full address */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label htmlFor="address" className={labelClass}>
              Full address
            </label>
            <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs font-medium text-[var(--color-muted-foreground)]">
              Private
            </span>
          </div>
          <textarea
            id="address"
            rows={3}
            placeholder="Building name, street, landmark…"
            value={location.address}
            onChange={(e) => setLocation({ address: e.target.value })}
            className={cn(inputBase, 'border-border focus:border-primary resize-none')}
          />
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            Only verified buyers will see your complete address.
          </p>
        </div>

        {/* Pincode */}
        <div className="space-y-1.5">
          <label htmlFor="pincode" className={labelClass}>
            Pincode <span className="text-destructive">*</span>
            {localityIsCustom && (
              <span className="ml-1 font-normal text-amber-600">(required)</span>
            )}
          </label>
          <input
            id="pincode"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit pincode"
            value={location.pincode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6)
              setLocation({ pincode: val })
            }}
            aria-invalid={pincodeMissing ? 'true' : undefined}
            className={cn(
              inputBase,
              pincodeMissing
                ? 'border-destructive focus:border-destructive'
                : localityIsCustom && !location.pincode
                  ? 'border-amber-400 focus:border-amber-500'
                  : 'border-border focus:border-primary',
            )}
          />
          {pincodeMissing && (
            <p role="alert" className="text-destructive text-xs">
              Enter a valid 6-digit pincode.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
