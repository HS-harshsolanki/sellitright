'use client'

import { AlertCircle, ChevronDown, MapPin } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useState } from 'react'

import { LocalityCombobox } from '@/components/forms/locality-combobox'
import { buildLocationQuery, geocodePlace, type GeocodeResult } from '@/lib/geocoding'
import { getLocalitiesForCity, type LocalityOption } from '@/lib/localities'
import { cn } from '@/lib/utils'
import { useSellFormStore } from '@/stores/sell-form.store'

// Dynamically imported — keeps mapbox-gl out of the initial bundle
const MapLocationPicker = dynamic(
  () => import('@/components/forms/map-location-picker').then((m) => m.MapLocationPicker),
  { ssr: false },
)

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
  // Suggested map center from geocoding the locality — separate from the pinned lat/lng
  // so the map pans to the right area without forcing a pin until the user taps/drags.
  const [suggestedCenter, setSuggestedCenter] = useState<GeocodeResult | null>(null)

  const cityMissing = showErrors && !location.city
  const localityMissing = showErrors && !location.locality.trim()
  const pincodeMissing = showErrors && location.pincode.length !== 6

  const handleCityChange = (value: string) => {
    const cityOption = CITIES.find((c) => c.value === value)
    setLocation({ city: value, state: cityOption?.state ?? '', locality: '', pincode: '' })
    setSuggestedCenter(null)
  }

  const handleLocalitySelect = useCallback(
    (option: LocalityOption | null) => {
      if (!option) {
        setLocation({ locality: '' })
        setSuggestedCenter(null)
        return
      }
      setLocation({
        locality: option.name,
        pincode: option.pincode ?? '',
        ...(option.city && !location.city ? { city: option.city } : {}),
      })

      // Custom locality (no pincode in our list) — scroll user to the pincode field
      if (!option.pincode) {
        setTimeout(() => {
          document
            .getElementById('pincode')
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 150)
      }

      // Auto-geocode the locality to give the map picker a sensible starting center.
      const query = buildLocationQuery({
        locality: option.name,
        city: option.city ?? location.city,
      })
      if (query) {
        void geocodePlace(query).then((result) => {
          if (!result) return
          setSuggestedCenter(result)
          if (location.latitude === null || location.longitude === null) {
            setLocation({ latitude: result.lat, longitude: result.lng })
          }
        })
      }
    },
    [location.city, location.latitude, location.longitude, setLocation],
  )

  // Re-geocode with society name for a more precise map center
  const handleSocietyBlur = useCallback(() => {
    if (!location.societyName?.trim() || !location.locality || !location.city) return
    const query = buildLocationQuery({
      societyName: location.societyName,
      locality: location.locality,
      city: location.city,
    })
    if (query) {
      void geocodePlace(query).then((result) => {
        if (!result) return
        setSuggestedCenter(result)
        if (location.latitude === null || location.longitude === null) {
          setLocation({ latitude: result.lat, longitude: result.lng })
        }
      })
    }
  }, [
    location.societyName,
    location.locality,
    location.city,
    location.latitude,
    location.longitude,
    setLocation,
  ])

  const localities = getLocalitiesForCity(location.city)

  const selectedLocality = localities.find((l) => l.name === location.locality)
  const localityIsCustom = location.locality.trim() !== '' && !selectedLocality
  const localityHasAutofill =
    location.locality.trim() !== '' && !!selectedLocality && !!location.pincode

  const showMap = !!location.city && !!location.locality.trim()

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
          <div className="relative">
            <select
              id="city"
              value={location.city}
              onChange={(e) => handleCityChange(e.target.value)}
              aria-invalid={cityMissing ? 'true' : undefined}
              className={cn(
                inputBase,
                'cursor-pointer appearance-none pr-10',
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
            <ChevronDown
              className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
              aria-hidden
            />
          </div>
          {location.state && <p className="text-muted-foreground text-xs">{location.state}</p>}
          {cityMissing && (
            <p role="alert" className="text-destructive text-xs">
              Please select a city.
            </p>
          )}
        </div>

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

          {localityHasAutofill && (
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <MapPin className="h-3 w-3" />
              Pincode auto-filled:{' '}
              <span className="text-foreground font-medium">{location.pincode}</span>
            </p>
          )}

          {localityIsCustom && (
            <p className="flex items-center gap-1 text-xs text-amber-600">
              <AlertCircle className="h-3 w-3 shrink-0" />
              This area isn&apos;t in our list — please enter the pincode below.
            </p>
          )}
        </div>

        {/* Society / Building name — moved before address so it can refine geocoding */}
        <div className="space-y-1.5">
          <label htmlFor="societyName" className={labelClass}>
            Society / Building name
          </label>
          <input
            id="societyName"
            type="text"
            placeholder="e.g. Prestige Lakeside Habitat, DLF Phase 3…"
            value={location.societyName}
            onChange={(e) => setLocation({ societyName: e.target.value })}
            onBlur={handleSocietyBlur}
            className={cn(inputBase, 'border-border focus:border-primary')}
          />
          <p className="text-muted-foreground text-xs">
            This is what buyers search for — your building or complex name, not the flat number.
          </p>
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
            placeholder="Flat/door number, floor, landmark…"
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

        {/* Map location picker — shown once a city is selected */}
        {showMap && (
          <div className="space-y-1.5">
            <span className={labelClass}>Pin location on map</span>
            <p className="text-muted-foreground text-xs">
              Tap the map or drag the pin to mark your property exactly.
            </p>
            <MapLocationPicker
              latitude={location.latitude}
              longitude={location.longitude}
              suggestedCenter={
                suggestedCenter ? { lat: suggestedCenter.lat, lng: suggestedCenter.lng } : null
              }
              onLocationChange={(lat, lng) => setLocation({ latitude: lat, longitude: lng })}
              onLocationClear={() => setLocation({ latitude: null, longitude: null })}
            />
          </div>
        )}
      </div>
    </div>
  )
}
