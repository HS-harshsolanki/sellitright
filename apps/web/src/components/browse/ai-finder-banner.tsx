'use client'

import { Loader2, Sparkle, X } from 'lucide-react'
import { useRef, useState } from 'react'

import type { AISearchFilters } from '@/app/api/listings/ai-search/route'
import type { ParsedFilters } from './ai-finder-button'
import { cn } from '@/lib/utils'

const CHIPS = ['2BHK under ₹1Cr', 'Furnished near metro', '3BHK in Pune']

interface AIFinderBannerProps {
  onFiltersFound: (filters: ParsedFilters, interpretation: string) => void
  isAIActive?: boolean
  aiInterpretation?: string | null
  onClearAI?: () => void
}

export function AIFinderBanner({
  onFiltersFound,
  isAIActive = false,
  aiInterpretation = null,
  onClearAI,
}: AIFinderBannerProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/listings/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
        signal: AbortSignal.timeout(12_000),
      })
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(d.error ?? 'Something went wrong')
      }
      const data = (await res.json()) as { filters: AISearchFilters; interpretation: string }
      const parsed: ParsedFilters = {}
      if (data.filters.bhkType) parsed.bhkType = data.filters.bhkType
      if (data.filters.furnishing) parsed.furnishing = data.filters.furnishing
      if (data.filters.propertyType) parsed.propertyType = data.filters.propertyType
      if (data.filters.minPrice != null || data.filters.maxPrice != null)
        parsed.budget = { min: data.filters.minPrice ?? null, max: data.filters.maxPrice ?? null }
      if (data.filters.city) parsed.city = data.filters.city
      if (data.filters.locality) parsed.locality = data.filters.locality
      onFiltersFound(parsed, data.interpretation)
      setQuery('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Try again')
    } finally {
      setLoading(false)
    }
  }

  if (isAIActive && aiInterpretation) {
    return (
      <div className="bg-[var(--color-muted)]/40 flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5">
        <Sparkle className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
        <p className="min-w-0 flex-1 truncate text-sm text-[var(--color-foreground)]">
          {aiInterpretation}
        </p>
        <button
          type="button"
          onClick={onClearAI}
          className="flex shrink-0 items-center gap-1 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Input row */}
      <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 transition-colors focus-within:border-[var(--color-foreground)] focus-within:ring-1 focus-within:ring-[var(--color-foreground)]">
        <Sparkle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSubmit()
          }}
          placeholder="Describe your ideal home — 2BHK in Pune under 1.5Cr, furnished…"
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)] focus:outline-none"
          aria-label="AI property search"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setError(null)
              inputRef.current?.focus()
            }}
            className="shrink-0 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={loading || !query.trim()}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium text-white transition-opacity disabled:opacity-40',
            'bg-[var(--color-foreground)] hover:opacity-90',
          )}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
        </button>
      </div>

      {/* Chips + error */}
      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                setQuery(chip)
                inputRef.current?.focus()
              }}
              className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-foreground)] hover:text-[var(--color-foreground)]"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export type { ParsedFilters }
