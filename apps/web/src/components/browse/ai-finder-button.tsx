'use client'

import { Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { ActiveFilters } from '@/components/search/filter-bar'
import type { AISearchFilters } from '@/app/api/listings/ai-search/route'

// ─── Props ────────────────────────────────────────────────────────────────────

interface AIFinderButtonProps {
  onFiltersFound: (filters: ParsedFilters, interpretation: string) => void
  /** When true the FAB shows as "AI Active" state */
  isAIActive?: boolean
  onClearAI?: () => void
}

// The shape we pass back — maps AI filter names to ActiveFilters-compatible keys
export interface ParsedFilters {
  bhkType?: string
  furnishing?: string
  propertyType?: string
  budget?: { min: number | null; max: number | null }
  city?: string
  locality?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAMPLE_CHIPS = [
  '2BHK under ₹1Cr in Andheri',
  'Furnished flat near metro',
  'Villa with parking in Whitefield',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(n % 1_00_00_000 === 0 ? 0 : 1)}Cr`
  return `₹${(n / 1_00_000).toFixed(n % 1_00_000 === 0 ? 0 : 1)}L`
}

// ─── Live filter chips preview ─────────────────────────────────────────────────

function FilterChipsPreview({ filters }: { filters: AISearchFilters | null }) {
  if (!filters) return null
  const chips: string[] = []
  if (filters.bhkType) chips.push(filters.bhkType)
  if (filters.propertyType) chips.push(filters.propertyType)
  if (filters.furnishing) chips.push(filters.furnishing)
  if (filters.city) chips.push(filters.city)
  if (filters.locality) chips.push(filters.locality)
  if (filters.minPrice && filters.maxPrice)
    chips.push(`${fmt(filters.minPrice)} – ${fmt(filters.maxPrice)}`)
  else if (filters.maxPrice) chips.push(`under ${fmt(filters.maxPrice)}`)
  else if (filters.minPrice) chips.push(`above ${fmt(filters.minPrice)}`)
  if (chips.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Filter preview">
      {chips.map((chip) => (
        <span
          key={chip}
          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
          style={{ background: '#F3F2FF', color: '#6C47FF' }}
        >
          {chip}
        </span>
      ))}
    </div>
  )
}

// ─── Quick client-side parse for live chip preview (no API) ───────────────────

function quickParse(query: string): AISearchFilters {
  const q = query.toLowerCase()
  const out: AISearchFilters = {}

  const bhkPatterns: [RegExp, string][] = [
    [/\b5\+?\s*(?:bhk|bedroom)/i, '5+ BHK'],
    [/\b4\s*(?:bhk|bedroom)/i, '4 BHK'],
    [/\b3\s*(?:bhk|bedroom)/i, '3 BHK'],
    [/\b2\s*(?:bhk|bedroom)/i, '2 BHK'],
    [/\b1\s*(?:bhk|bedroom)/i, '1 BHK'],
  ]
  for (const [re, val] of bhkPatterns) {
    if (re.test(q)) {
      out.bhkType = val
      break
    }
  }

  const underMatch = q.match(
    /(?:under|below|up\s+to)\s+([\d.]+)\s*(?:cr(?:ore)?s?|l(?:ac|akh|akhs)?)/,
  )
  if (underMatch?.[0]) {
    const raw = underMatch[0].replace(/(?:under|below|up\s+to)\s+/i, '').trim()
    const crM = raw.match(/([\d.]+)\s*cr/i)
    if (crM) out.maxPrice = Math.round(parseFloat(crM[1]!) * 1_00_00_000)
    else {
      const lM = raw.match(/([\d.]+)\s*(?:l|lac|lakh)/i)
      if (lM) out.maxPrice = Math.round(parseFloat(lM[1]!) * 1_00_000)
    }
  }

  if (/\bfurnished\b/.test(q) && !/un|semi/.test(q)) out.furnishing = 'Furnished'
  else if (/semi[\s-]*furnished/.test(q)) out.furnishing = 'Semi Furnished'
  else if (/unfurnished/.test(q)) out.furnishing = 'Unfurnished'

  const cities = [
    'mumbai',
    'delhi',
    'bangalore',
    'bengaluru',
    'hyderabad',
    'chennai',
    'pune',
    'noida',
    'gurgaon',
    'gurugram',
    'ahmedabad',
    'kolkata',
  ]
  for (const city of cities) {
    if (q.includes(city)) {
      out.city = city.charAt(0).toUpperCase() + city.slice(1)
      break
    }
  }

  return out
}

// ─── FAB component ────────────────────────────────────────────────────────────
//
// Rendered as a fixed bottom-right FAB on desktop. On mobile, the parent
// browse-client.tsx promotes this to a full-width bottom bar via the
// `mobileFullWidth` variant (controlled by CSS classes in the parent).
//
// This FAB is the SECONDARY entry point — shown once the user scrolls
// past the hero banner and enters "browse mode."

export function AIFinderButton({
  onFiltersFound,
  isAIActive = false,
  onClearAI,
}: AIFinderButtonProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<AISearchFilters | null>(null)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Focus input when sheet opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  // Escape to close
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  // Lock body scroll on mobile when sheet is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const updatePreview = useCallback((val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val.trim()) {
      setPreview(null)
      return
    }
    debounceRef.current = setTimeout(() => {
      const quick = quickParse(val)
      setPreview(Object.keys(quick).length > 0 ? quick : null)
    }, 300)
  }, [])

  const handleQueryChange = (val: string) => {
    setQuery(val)
    setError(null)
    updatePreview(val)
  }

  const handleSubmit = async () => {
    const trimmed = query.trim()
    if (!trimmed) return
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/listings/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
        signal: AbortSignal.timeout(10_000),
      })

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(errJson.error ?? 'Something went wrong')
      }

      const data = (await res.json()) as {
        filters: AISearchFilters
        interpretation: string
      }

      const parsed: ParsedFilters = {}
      if (data.filters.bhkType) parsed.bhkType = data.filters.bhkType
      if (data.filters.furnishing) parsed.furnishing = data.filters.furnishing
      if (data.filters.propertyType) parsed.propertyType = data.filters.propertyType
      if (data.filters.minPrice != null || data.filters.maxPrice != null) {
        parsed.budget = {
          min: data.filters.minPrice ?? null,
          max: data.filters.maxPrice ?? null,
        }
      }
      if (data.filters.city) parsed.city = data.filters.city
      if (data.filters.locality) parsed.locality = data.filters.locality

      onFiltersFound(parsed, data.interpretation)
      setOpen(false)
      setQuery('')
      setPreview(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  // ─── AI Active state: FAB shows "AI On" badge + clear option ──────────────
  if (isAIActive) {
    return (
      <>
        {/* Desktop FAB — bottom right */}
        <button
          type="button"
          onClick={onClearAI}
          className="fixed bottom-6 right-6 z-50 hidden items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:flex"
          style={{ background: '#6C47FF' }}
          aria-label="Clear AI property search"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span>AI Active · Clear</span>
        </button>

        {/* Mobile bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white px-4 pb-[env(safe-area-inset-bottom)] pt-3 sm:hidden">
          <button
            type="button"
            onClick={onClearAI}
            className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ background: '#6C47FF' }}
            aria-label="Clear AI property search"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>AI Active · Tap to clear</span>
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {/* ── Desktop FAB ────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open AI property finder"
        className="fixed bottom-6 right-6 z-50 hidden items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:flex"
        style={{
          background: '#0F0F0F',
          boxShadow: '0 4px 24px rgba(0,0,0,0.22)',
        }}
      >
        <Sparkles className="h-4 w-4 animate-pulse" aria-hidden="true" />
        <span>Find My Home</span>
      </button>

      {/* ── Mobile persistent bottom bar ───────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-100 bg-white/95 px-4 pb-[env(safe-area-inset-bottom)] pt-3 backdrop-blur-sm sm:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold text-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ background: '#0F0F0F' }}
          aria-label="Open AI property finder"
        >
          <Sparkles className="h-4 w-4 animate-pulse" aria-hidden="true" />
          <span>✦ Find My Home</span>
        </button>
      </div>

      {/* ── Bottom sheet (mobile) / centered dialog (desktop) ──────────────── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-fab-title"
            className="fixed inset-x-0 bottom-0 z-[301] rounded-t-2xl bg-white shadow-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[460px] sm:max-w-[92vw] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
            style={{ maxHeight: '65vh', overflowY: 'auto' }}
          >
            {/* Drag handle — mobile only */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            <div className="p-5">
              {/* Header */}
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="ai-fab-title"
                    className="flex items-center gap-2 text-base font-semibold text-gray-900"
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ background: '#F3F2FF' }}
                    >
                      <Sparkles
                        className="h-4 w-4"
                        style={{ color: '#6C47FF' }}
                        aria-hidden="true"
                      />
                    </span>
                    AI Property Finder
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Describe what you want in plain words — AI shortlists the right properties
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. 2BHK near a good school, under ₹80L, ready to move in"
                rows={3}
                aria-label="Describe your ideal home"
                className="w-full resize-none rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition-colors focus:outline-none"
                style={{
                  border: '1.5px solid #E2E0EA',
                  background: '#FFFFFF',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#6C47FF'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,71,255,0.12)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E2E0EA'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />

              {/* Live chip preview */}
              <FilterChipsPreview filters={preview} />

              {/* Error */}
              {error && (
                <p role="alert" className="mt-2 text-xs text-red-600">
                  {error}
                </p>
              )}

              {/* Example chips */}
              <div
                className="mt-3 flex gap-2 overflow-x-auto pb-1"
                style={{ scrollbarWidth: 'none' }}
                role="group"
                aria-label="Example searches"
              >
                {EXAMPLE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setQuery(chip)
                      updatePreview(chip)
                    }}
                    className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
                    style={{ background: '#F3F2FF', color: '#6C47FF' }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Submit */}
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isLoading || !query.trim()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: '#0F0F0F' }}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    <span>Find My Home</span>
                  </>
                )}
              </button>

              {/* Trust signal */}
              <p className="mt-3 text-center text-[11px] text-gray-400">
                Searches 500+ live listings &middot; Trusted by 50,000+ buyers
              </p>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// Re-export ActiveFilters for convenience (used in browse-client.tsx)
export type { ActiveFilters }
