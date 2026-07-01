'use client'

import { MapPin } from 'lucide-react'

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
    // Clear locality and pincode when city changes — they belong to the old city
    setLocation({
      city: value,
      state: cityOption?.state ?? '',
      locality: '',
      pincode: '',
    })
  }

  const handleLocalitySelect = (option: LocalityOption | null) => {
    if (!option) {
      // User cleared or is mid-type — clear locality only
      setLocation({ locality: '' })
      return
    }
    // Auto-fill locality name, pincode (if available), and city (if not already set)
    setLocation({
      locality: option.name,
      ...(option.pincode ? { pincode: option.pincode } : {}),
      ...(option.city && !location.city ? { city: option.city } : {}),
    })
  }

  const localities = getLocalitiesForCity(location.city)
  const hasLocalityList = localities.length > 0

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Where is your property?
        </h2>
        <p className="text-muted-foreground">Help buyers find your property easily.</p>
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

        {/* Locality — combobox when city has a curated list, plain input otherwise */}
        <div className="space-y-1.5">
          <label htmlFor="locality" className={labelClass}>
            Locality / Area <span className="text-destructive">*</span>
          </label>

          {hasLocalityList ? (
            <>
              <LocalityCombobox
                localities={localities}
                value={location.locality}
                onChange={handleLocalitySelect}
                hasError={localityMissing}
                disabled={!location.city}
                placeholder={
                  location.city ? `Search localities in ${location.city}…` : 'Select a city first'
                }
              />
              {localityMissing && (
                <p role="alert" className="text-destructive text-xs">
                  Please enter your locality or area.
                </p>
              )}
              {location.locality && location.pincode && (
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  <MapPin className="h-3 w-3" />
                  Pincode auto-filled:{' '}
                  <span className="text-foreground font-medium">{location.pincode}</span>
                </p>
              )}
            </>
          ) : (
            <>
              <input
                id="locality"
                type="text"
                placeholder="e.g. Koramangala, Bandra West, Sector 62"
                value={location.locality}
                onChange={(e) => setLocation({ locality: e.target.value })}
                aria-invalid={localityMissing ? 'true' : undefined}
                className={cn(
                  inputBase,
                  localityMissing
                    ? 'border-destructive focus:border-destructive'
                    : 'border-border focus:border-primary',
                )}
              />
              {localityMissing && (
                <p role="alert" className="text-destructive text-xs">
                  Please enter your locality or area.
                </p>
              )}
            </>
          )}
        </div>

        {/* Full address */}
        <div className="space-y-1.5">
          <label htmlFor="address" className={labelClass}>
            Full Address
          </label>
          <textarea
            id="address"
            rows={3}
            placeholder="Building name, street, landmark…"
            value={location.address}
            onChange={(e) => setLocation({ address: e.target.value })}
            className={cn(inputBase, 'border-border focus:border-primary resize-none')}
          />
        </div>

        {/* Pincode — editable even when auto-filled */}
        <div className="space-y-1.5">
          <label htmlFor="pincode" className={labelClass}>
            Pincode <span className="text-destructive">*</span>
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
                : 'border-border focus:border-primary',
            )}
          />
          {pincodeMissing && (
            <p role="alert" className="text-destructive text-xs">
              Enter a valid 6-digit pincode.
            </p>
          )}
        </div>

        {/* Google Maps placeholder */}
        <div className="space-y-1.5">
          <p className={labelClass}>Pin on Map</p>
          <button
            type="button"
            className={cn(
              'border-border text-muted-foreground flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed py-6 text-sm font-medium',
              'hover:border-primary/50 hover:text-primary transition-colors',
            )}
          >
            <MapPin className="h-4 w-4" />
            Add Google Maps pin (coming soon)
          </button>
        </div>
      </div>
    </div>
  )
}
