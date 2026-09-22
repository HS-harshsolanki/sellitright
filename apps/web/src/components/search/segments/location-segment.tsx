'use client'

import { Loader2, MapPin, Navigation, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { filterLocalities, getLocalitiesForCity } from '@/lib/localities'
import { cn } from '@/lib/utils'

import { SUPPORTED_CITIES } from '../smart-search-types'

// ── Reverse-geocode via Mapbox ─────────────────────────────────────────────────

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

// Maps common Mapbox place names → our supported city list
const CITY_ALIASES: Record<string, string> = {
  mumbai: 'Mumbai',
  'navi mumbai': 'Mumbai',
  thane: 'Mumbai',
  pune: 'Pune',
  pimpri: 'Pune',
  chinchwad: 'Pune',
  bangalore: 'Bangalore',
  bengaluru: 'Bangalore',
}

interface GeoResult {
  city: string | null
  locality: string | null
}

async function reverseGeocode(lat: number, lng: number): Promise<GeoResult> {
  if (!MAPBOX_TOKEN) return { city: null, locality: null }
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,neighborhood,locality&language=en&access_token=${MAPBOX_TOKEN}`
  const res = await fetch(url)
  if (!res.ok) return { city: null, locality: null }
  const data = (await res.json()) as {
    features: { place_type: string[]; text: string; context?: { id: string; text: string }[] }[]
  }

  let city: string | null = null
  let locality: string | null = null

  for (const feature of data.features) {
    const text = feature.text.toLowerCase()
    // Try to match a city
    if (!city) {
      const matched =
        CITY_ALIASES[text] ??
        SUPPORTED_CITIES.find((c) => c.toLowerCase() === text) ??
        // check in context (parent regions)
        (feature.context ?? []).reduce<string | null>((found, ctx) => {
          if (found) return found
          const ctxText = ctx.text.toLowerCase()
          return (
            CITY_ALIASES[ctxText] ??
            SUPPORTED_CITIES.find((c) => c.toLowerCase() === ctxText) ??
            null
          )
        }, null)
      if (matched) city = matched
    }
    // Neighborhood / locality from the first neighborhood/locality feature
    if (
      !locality &&
      (feature.place_type.includes('neighborhood') || feature.place_type.includes('locality'))
    ) {
      // Title-case the locality name
      locality = feature.text.replace(/\b\w/g, (c) => c.toUpperCase())
    }
  }

  return { city, locality }
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface LocationSegmentProps {
  city: string | null
  localities: string[]
  aiFilledFields: boolean
  onCityChange: (city: string | null) => void
  onLocalitiesChange: (localities: string[]) => void
  /** Called when geolocation resolves — lets parent trigger an immediate search */
  onNearMe?: (city: string, localities: string[]) => void
  /** Render autocomplete results as a static block instead of position:absolute
   *  — required inside containers with overflow:hidden (e.g. accordion) */
  inlineResults?: boolean
}

export function LocationSegment({
  city,
  localities,
  aiFilledFields,
  onCityChange,
  onLocalitiesChange,
  onNearMe,
  inlineResults = false,
}: LocationSegmentProps) {
  const [localityQuery, setLocalityQuery] = useState('')
  const [cityQuery, setCityQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [geoError, setGeoError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Clear query when city changes
  useEffect(() => {
    setLocalityQuery('')
    setShowSuggestions(false)
  }, [city])

  const allLocalities = city ? getLocalitiesForCity(city) : []
  // Filter out already-selected localities from suggestions
  const suggestions = filterLocalities(
    allLocalities.filter((l) => !localities.includes(l.name)),
    localityQuery,
  )
  const filteredCities = SUPPORTED_CITIES.filter((c) =>
    c.toLowerCase().includes(cityQuery.toLowerCase()),
  )

  function addLocality(name: string) {
    if (!localities.includes(name)) {
      onLocalitiesChange([...localities, name])
    }
    setLocalityQuery('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  function removeLocality(name: string) {
    onLocalitiesChange(localities.filter((l) => l !== name))
  }

  async function handleNearMe() {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported by your browser.')
      setGeoState('error')
      return
    }
    setGeoState('loading')
    setGeoError(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { city: detectedCity, locality } = await reverseGeocode(
            pos.coords.latitude,
            pos.coords.longitude,
          )
          if (!detectedCity) {
            setGeoError('Could not find a supported city near you. Try searching manually.')
            setGeoState('error')
            return
          }
          const nearLocalities = locality ? [locality] : []
          onCityChange(detectedCity)
          onLocalitiesChange(nearLocalities)
          onNearMe?.(detectedCity, nearLocalities)
          setGeoState('idle')
        } catch {
          setGeoError('Location lookup failed. Try again.')
          setGeoState('error')
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location access denied. Enable it in browser settings.')
        } else {
          setGeoError('Could not get your location. Try again.')
        }
        setGeoState('error')
      },
      { timeout: 10000, maximumAge: 60000 },
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── City heading ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
            City
            {aiFilledFields && city && (
              <span className="ml-1 text-[10px] font-bold text-[var(--color-primary)]">✦ AI</span>
            )}
          </span>
        </div>

        {/* Near me button */}
        <button
          type="button"
          onClick={handleNearMe}
          disabled={geoState === 'loading'}
          className={cn(
            'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
            geoState === 'loading'
              ? 'cursor-not-allowed border-gray-200 text-gray-400'
              : 'border-[var(--color-border)] text-gray-500 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
          )}
        >
          {geoState === 'loading' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Navigation className="h-3 w-3" />
          )}
          {geoState === 'loading' ? 'Locating…' : 'Near me'}
        </button>
      </div>

      {/* Geo error */}
      {geoState === 'error' && geoError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{geoError}</p>
      )}

      {/* ── City search box ──────────────────────────────────────── */}
      <div className="relative">
        <Search
          className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={cityQuery}
          onChange={(e) => setCityQuery(e.target.value)}
          placeholder="Search city..."
          className="w-full rounded-lg border border-[var(--color-border)] py-2 pl-7 pr-3 text-xs text-gray-800 placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:outline-none"
        />
      </div>

      {/* ── Filtered city chips ──────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {filteredCities.length === 0 ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            No cities match &quot;{cityQuery}&quot;
          </p>
        ) : (
          filteredCities.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onCityChange(city === c ? null : c)
                onLocalitiesChange([])
                setCityQuery('')
              }}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                city === c
                  ? 'border-[var(--color-primary)] bg-gray-50 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-gray-600 hover:border-gray-400 hover:bg-gray-50',
              )}
            >
              {c}
            </button>
          ))
        )}
      </div>

      {/* ── Divider + Area / Locality label ─────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          Area / Locality
        </span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      {/* ── Selected locality chips ──────────────────────────────── */}
      {localities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {localities.map((loc) => (
            <span
              key={loc}
              className="bg-[var(--color-primary)]/8 flex items-center gap-1 rounded-full border border-[var(--color-primary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary)]"
            >
              {loc}
              <button
                type="button"
                onClick={() => removeLocality(loc)}
                aria-label={`Remove ${loc}`}
                className="ml-0.5 rounded-full hover:text-red-500"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Locality typeahead — always shown, disabled until city picked ── */}
      <div className={inlineResults ? undefined : 'relative'}>
        <input
          ref={inputRef}
          type="text"
          value={localityQuery}
          onChange={(e) => {
            if (!city) return
            setLocalityQuery(e.target.value)
            setShowSuggestions(true)
          }}
          onKeyDown={(e) => {
            if (!city) return
            if (e.key === 'Escape') {
              setLocalityQuery('')
              setShowSuggestions(false)
            }
            if (e.key === 'Enter' && suggestions[0]) {
              addLocality(suggestions[0].name)
            }
          }}
          placeholder={
            city
              ? localities.length > 0
                ? `Add more areas in ${city}…`
                : `Search ${city} localities…`
              : 'Select a city first'
          }
          disabled={!city}
          className={cn(
            'w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:outline-none',
            city ? 'bg-white text-gray-800' : 'cursor-not-allowed bg-gray-50 text-gray-400',
          )}
        />
        {showSuggestions && localityQuery.trim() && suggestions.length > 0 && (
          <ul
            className={cn(
              'max-h-48 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-white',
              inlineResults
                ? 'mt-1 shadow-sm'
                : 'absolute left-0 right-0 top-[calc(100%+4px)] z-[60] shadow-xl',
            )}
          >
            {suggestions.slice(0, 8).map((loc) => (
              <li key={loc.name}>
                <button
                  type="button"
                  onClick={() => addLocality(loc.name)}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  {loc.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Summary ──────────────────────────────────────────────── */}
      {city && localities.length === 0 && (
        <p className="text-xs text-[var(--color-muted-foreground)]">{city}</p>
      )}
    </div>
  )
}
