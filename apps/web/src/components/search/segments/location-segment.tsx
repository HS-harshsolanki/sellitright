'use client'

import { MapPin, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { filterLocalities, getLocalitiesForCity } from '@/lib/localities'
import { cn } from '@/lib/utils'
import { SUPPORTED_CITIES } from '../smart-search-types'

interface LocationSegmentProps {
  city: string | null
  locality: string | null
  aiFilledFields: boolean
  onCityChange: (city: string | null) => void
  onLocalityChange: (locality: string | null) => void
}

export function LocationSegment({
  city,
  locality,
  aiFilledFields,
  onCityChange,
  onLocalityChange,
}: LocationSegmentProps) {
  const [localityQuery, setLocalityQuery] = useState(locality ?? '')
  const [cityQuery, setCityQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync external locality into local query state
  useEffect(() => {
    setLocalityQuery(locality ?? '')
  }, [locality])

  const localities = city ? filterLocalities(getLocalitiesForCity(city), localityQuery) : []
  const filteredCities = SUPPORTED_CITIES.filter((c) =>
    c.toLowerCase().includes(cityQuery.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-3">
      {/* ── City heading ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
          City
          {aiFilledFields && city && (
            <span className="ml-1 text-[10px] font-bold text-[var(--color-primary)]">✦ AI</span>
          )}
        </span>
      </div>

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
                onLocalityChange(null)
                setLocalityQuery('')
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

      {/* ── Locality typeahead — always shown, disabled until city picked ── */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={localityQuery}
          onChange={(e) => {
            if (!city) return
            setLocalityQuery(e.target.value)
            if (!e.target.value.trim()) onLocalityChange(null)
          }}
          onKeyDown={(e) => {
            if (!city) return
            if (e.key === 'Escape') {
              setLocalityQuery('')
              onLocalityChange(null)
            }
            if (e.key === 'Enter' && localities[0]) {
              onLocalityChange(localities[0].name)
              setLocalityQuery(localities[0].name)
            }
          }}
          placeholder={city ? `Search ${city} localities…` : 'Select a city first'}
          disabled={!city}
          className={cn(
            'w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:outline-none',
            city ? 'bg-white text-gray-800' : 'cursor-not-allowed bg-gray-50 text-gray-400',
          )}
        />
        {localityQuery.trim() && localities.length > 0 && (
          <ul className="absolute left-0 right-0 top-[calc(100%+4px)] z-[60] max-h-48 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-white shadow-xl">
            {localities.slice(0, 8).map((loc) => (
              <li key={loc.name}>
                <button
                  type="button"
                  onClick={() => {
                    onLocalityChange(loc.name)
                    setLocalityQuery(loc.name)
                  }}
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
      {city && (
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {locality ? `${locality}, ${city}` : city}
        </p>
      )}
    </div>
  )
}
