'use client'

import { Building2, Check, Loader2, X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

interface Suggestion {
  placeId: string
  text: string
  mainText: string
  secondaryText: string
}

interface SocietyAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelect: (result: { placeName: string; lat: number; lng: number }) => void
  locationBias?: { lat: number; lng: number } | null
  placeholder?: string
  className?: string
}

export function SocietyAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  locationBias,
  placeholder = 'e.g. Prestige Lakeside Habitat, DLF Phase 3…',
  className,
}: SocietyAutocompleteProps) {
  const inputId = useId()
  const listboxId = useId()

  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  // Track whether the current input value came from a confirmed selection
  const [isConfirmed, setIsConfirmed] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // One session token per autocomplete session — reset after a selection is confirmed.
  // Passing the same token through autocomplete + details collapses billing to one event.
  const sessionTokenRef = useRef<string>(crypto.randomUUID())

  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (input.trim().length < 2) {
        setSuggestions([])
        return
      }

      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          input: input.trim(),
          sessionToken: sessionTokenRef.current,
        })
        if (locationBias) {
          params.set('locationBias', `${locationBias.lat},${locationBias.lng}`)
        }

        const res = await fetch(`/api/places/autocomplete?${params.toString()}`)
        if (!res.ok) return
        const data = (await res.json()) as { suggestions: Suggestion[] }
        setSuggestions(data.suggestions ?? [])
        setIsOpen((data.suggestions ?? []).length > 0)
      } catch {
        // silently fail — user can still type a manual name
      } finally {
        setIsLoading(false)
      }
    },
    [locationBias],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    onChange(raw)
    setIsConfirmed(false)
    setActiveIndex(-1)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void fetchSuggestions(raw), 300)
  }

  const confirmSelection = useCallback(
    async (suggestion: Suggestion) => {
      onChange(suggestion.mainText)
      setIsConfirmed(true)
      setIsOpen(false)
      setSuggestions([])

      // Fetch lat/lng for the selected place using the same session token
      try {
        const params = new URLSearchParams({
          placeId: suggestion.placeId,
          sessionToken: sessionTokenRef.current,
        })
        const res = await fetch(`/api/places/details?${params.toString()}`)
        if (!res.ok) return
        const place = (await res.json()) as {
          lat: number | null
          lng: number | null
          placeName: string | null
        }
        if (place.lat !== null && place.lng !== null) {
          onPlaceSelect({
            placeName: place.placeName ?? suggestion.mainText,
            lat: place.lat,
            lng: place.lng,
          })
        }
      } catch {
        // lat/lng unavailable — name is still set, user can pin manually
      }

      // Reset session token so the next autocomplete session is billed correctly
      sessionTokenRef.current = crypto.randomUUID()
    },
    [onChange, onPlaceSelect],
  )

  const handleClear = () => {
    onChange('')
    setIsConfirmed(false)
    setSuggestions([])
    setIsOpen(false)
    inputRef.current?.focus()
    sessionTokenRef.current = crypto.randomUUID()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || !suggestions.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          void confirmSelection(suggestions[activeIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Scroll active item into view
  const listRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-center rounded-lg border bg-white transition-colors',
          'border-border focus-within:border-primary focus-within:ring-primary/20 focus-within:ring-2',
        )}
      >
        <Building2 className="text-muted-foreground ml-3 h-4 w-4 shrink-0" aria-hidden />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true)
          }}
          className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent px-3 py-3 text-sm focus:outline-none"
        />

        {isLoading && (
          <Loader2 className="text-muted-foreground mr-3 h-4 w-4 shrink-0 animate-spin" />
        )}

        {!isLoading && value && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            aria-label="Clear society name"
            className="text-muted-foreground hover:text-foreground mr-2 rounded p-1.5 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Society suggestions"
          className="border-border absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border bg-white py-1 shadow-lg"
        >
          {suggestions.map((s, idx) => {
            const isActive = idx === activeIndex
            const isSelected = isConfirmed && value === s.mainText
            return (
              <li
                key={s.placeId}
                id={`${listboxId}-option-${idx}`}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(e) => {
                  e.preventDefault()
                  void confirmSelection(s)
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 px-4 py-2.5',
                  isActive && 'bg-muted',
                )}
              >
                <Building2 className="text-muted-foreground h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-medium">{s.mainText}</p>
                  {s.secondaryText && (
                    <p className="text-muted-foreground truncate text-xs">{s.secondaryText}</p>
                  )}
                </div>
                {isSelected && <Check className="text-primary h-3.5 w-3.5 shrink-0" />}
              </li>
            )
          })}
        </ul>
      )}

      <p className="text-muted-foreground mt-1 text-xs">
        This is what buyers search for — your building or complex name, not the flat number.
      </p>
    </div>
  )
}
