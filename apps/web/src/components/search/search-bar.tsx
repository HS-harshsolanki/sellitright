'use client'

import { Search, X } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

import type { AISearchFilters } from '@/app/api/listings/ai-search/route'
import type { ParsedFilters } from '@/components/browse/ai-finder-button'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'normal' | 'ai'

/** Imperative handle — lets parent activate AI mode without prop drilling */
export interface SearchBarHandle {
  /** Switch the bar into AI mode and focus the input */
  activateAIMode: () => void
}

interface SearchBarProps {
  onSearch?: (query: string) => void
  onAISearch?: (filters: ParsedFilters, interpretation: string) => void
  defaultValue?: string
  /** Whether AI results are currently active (externally controlled) */
  isAIActive?: boolean
  aiInterpretation?: string | null
  onClearAI?: () => void
  /** Show the AI toggle pill — only true on browse page */
  showAIToggle?: boolean
  /** When true, removes max-width cap and centering — for inline use */
  inline?: boolean
  /** Extra classes applied to the outermost wrapper div */
  className?: string
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const AI_CHIPS = [
  '2BHK in Pune under 1.5Cr',
  'Furnished flat near Metro Mumbai',
  '3BHK villa Whitefield with garden',
  'Ready-to-move under 60L Hyderabad',
]

const PLACEHOLDER_NORMAL = 'City, locality, or project...'
const PLACEHOLDER_AI = 'Describe your ideal home — e.g. 2BHK furnished in Bandra under 1Cr'

// ─── Component ─────────────────────────────────────────────────────────────────

export const SearchBar = forwardRef<SearchBarHandle, SearchBarProps>(function SearchBar(
  {
    onSearch,
    onAISearch,
    defaultValue = '',
    isAIActive = false,
    aiInterpretation,
    onClearAI,
    showAIToggle = false,
    inline = false,
    className,
  }: SearchBarProps,
  ref,
) {
  const [mode, setMode] = useState<Mode>('normal')
  const [query, setQuery] = useState(defaultValue)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // "AI filters removed" transient note
  const [aiRemovedNote, setAiRemovedNote] = useState(false)
  // "Analyzing your query…" slow-request hint
  const [slowHint, setSlowHint] = useState(false)
  // Shake on empty submit
  const [shake, setShake] = useState(false)
  // Empty-submit inline hint
  const [emptyHint, setEmptyHint] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Expose imperative handle so parent (HeaderSearch) can activate AI mode
  useImperativeHandle(ref, () => ({
    activateAIMode() {
      setMode('ai')
      setError(null)
      setEmptyHint(null)
      setTimeout(() => inputRef.current?.focus(), 0)
    },
  }))

  // When the parent clears AI state externally, clear the slow hint
  useEffect(() => {
    if (!isAIActive) {
      setSlowHint(false)
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
    }
  }, [isAIActive])

  // ── Keyboard: Esc handling ──────────────────────────────────────────────────
  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (query) {
        setQuery('')
        setError(null)
        setEmptyHint(null)
      } else if (mode === 'ai') {
        switchToNormal()
      }
    }
    input.addEventListener('keydown', handleKeyDown)
    return () => input.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, mode])

  // ── Helpers ────────────────────────────────────────────────────────────────

  function switchToNormal() {
    if (isAIActive) {
      onClearAI?.()
      showAiRemovedNote()
    }
    setMode('normal')
  }

  function showAiRemovedNote() {
    setAiRemovedNote(true)
    setTimeout(() => setAiRemovedNote(false), 2000)
  }

  function triggerShake() {
    setShake(true)
    setTimeout(() => setShake(false), 400)
  }

  // ── Mode toggle ────────────────────────────────────────────────────────────

  function handleToggleMode() {
    if (loading) return
    if (mode === 'ai') {
      switchToNormal()
    } else {
      setMode('ai')
      setError(null)
      setEmptyHint(null)
    }
  }

  // ── Clear ──────────────────────────────────────────────────────────────────

  function handleClear() {
    setQuery('')
    setError(null)
    setEmptyHint(null)
    if (isAIActive) {
      onClearAI?.()
    }
    inputRef.current?.focus()
  }

  // ── Normal submit ─────────────────────────────────────────────────────────

  function handleNormalSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!query.trim()) {
      triggerShake()
      setEmptyHint('Enter a city, locality, or project name.')
      return
    }
    setEmptyHint(null)
    onSearch?.(query)
  }

  // ── AI submit ─────────────────────────────────────────────────────────────

  async function handleAISubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const q = query.trim()
    if (!q) {
      triggerShake()
      setEmptyHint('Describe what you are looking for, e.g. 2BHK in Pune under 1.5Cr.')
      return
    }
    setEmptyHint(null)
    setError(null)
    setLoading(true)
    setSlowHint(false)

    slowTimerRef.current = setTimeout(() => setSlowHint(true), 3000)

    try {
      const res = await fetch('/api/listings/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
        signal: AbortSignal.timeout(12_000),
      })

      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string }
        const msg = d.error ?? 'AI search is unavailable right now. Try normal search or retry.'
        setError(msg)
        return
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

      if (Object.keys(parsed).length === 0) {
        setError("Couldn't understand that — try: 2BHK near Metro under 80L")
        return
      }

      onAISearch?.(parsed, data.interpretation)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('AI search is unavailable right now. Try normal search or retry.')
      } else {
        setError('AI search is unavailable right now. Try normal search or retry.')
      }
    } finally {
      setLoading(false)
      setSlowHint(false)
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
    }
  }

  function handleSubmit(e?: React.FormEvent) {
    if (mode === 'ai') {
      void handleAISubmit(e)
    } else {
      handleNormalSubmit(e)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleChipClick(chip: string) {
    setQuery(chip)
    setError(null)
    setEmptyHint(null)
    inputRef.current?.focus()
    // auto-submit
    setTimeout(() => void handleAISubmit(), 0)
  }

  function handleChange(val: string) {
    setQuery(val)
    setError(null)
    setEmptyHint(null)
  }

  // ── Derived flags ─────────────────────────────────────────────────────────
  const isAIMode = mode === 'ai'
  const showChips = showAIToggle && isAIMode && !query && !loading
  const showClearBtn = Boolean(query) && !loading

  // ── Border / bg classes ────────────────────────────────────────────────────
  const wrapperBorderCls = isAIMode
    ? 'border-[var(--color-primary)] focus-within:border-[var(--color-primary)]'
    : 'border-[var(--color-border)] focus-within:border-[var(--color-primary)]'
  const wrapperBgCls = isAIMode ? 'bg-[var(--color-muted)]' : 'bg-white'

  return (
    <div className={cn('w-full', !inline && 'mx-auto max-w-xl', inline && 'relative', className)}>
      {/* ── Main bar ────────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        className={cn(
          'relative flex items-center rounded-full border shadow-sm transition-[border-color,background-color] duration-150',
          wrapperBorderCls,
          wrapperBgCls,
          inline ? 'h-11' : 'h-12 md:h-14',
          shake && 'animate-search-shake',
        )}
        role="search"
      >
        {/* Left icon */}
        <span
          className={cn(
            'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2',
            isAIMode && loading && 'animate-pulse',
          )}
          aria-hidden="true"
        >
          {isAIMode ? (
            <span
              className={cn(
                'text-[15px] leading-none',
                loading ? 'text-[var(--color-muted-foreground)]' : 'text-[var(--color-primary)]',
              )}
            >
              ✦
            </span>
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </span>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isAIMode ? PLACEHOLDER_AI : PLACEHOLDER_NORMAL}
          readOnly={loading}
          aria-label={isAIMode ? 'AI property search' : 'Search properties'}
          className={cn(
            'h-full min-w-0 flex-1 bg-transparent pl-10 text-sm text-gray-900 focus:outline-none',
            // right padding: clear btn (present or not) + toggle pill + submit btn
            showClearBtn ? 'pr-[7.5rem]' : 'pr-[6rem]',
            inline ? '' : 'md:text-base',
            isAIMode && 'placeholder:italic',
            'placeholder:text-gray-400',
          )}
        />

        {/* Right section: clear + toggle + submit */}
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {/* Clear button */}
          {showClearBtn && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}

          {/* AI toggle pill */}
          {showAIToggle && (
            <button
              type="button"
              role="button"
              onClick={handleToggleMode}
              disabled={loading}
              aria-pressed={isAIMode}
              aria-label={isAIMode ? 'Switch to normal search' : 'Switch to AI search'}
              title={isAIMode ? 'Switch to normal search' : 'Switch to AI search'}
              className={cn(
                // Desktop: pill shape 56×28px; Mobile: 44×44px icon-only square
                'flex items-center justify-center rounded-full transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
                // Mobile (< sm): icon-only square 44×44, collapsed into 28px w/ p
                'h-7 w-7 sm:w-14',
                isAIMode
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600',
                loading && 'pointer-events-none',
              )}
            >
              {loading ? (
                /* Loading spinner inside pill */
                <span
                  className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
              ) : (
                <>
                  <span className="select-none text-[11px] font-semibold leading-none">
                    ✦<span className="sr-only ml-0.5 sm:not-sr-only">AI</span>
                  </span>
                </>
              )}
            </button>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            aria-label="Search"
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:opacity-40',
              inline ? 'h-7 w-7' : '',
            )}
          >
            {loading ? (
              <span
                className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
                aria-hidden="true"
              />
            ) : (
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </form>

      {/* ── Below-bar content ─────────────────────────────────────────────────── */}
      {/*
        In inline (header) mode: render as an absolute dropdown so it doesn't
        push the header's fixed height. In normal (hero/landing) mode: render
        inline so it takes up space naturally.
      */}
      {(emptyHint ||
        (error && !emptyHint) ||
        (slowHint && !error) ||
        aiRemovedNote ||
        showChips) && (
        <div
          className={cn(
            inline
              ? 'absolute left-0 right-0 top-[calc(100%+6px)] z-[300] rounded-2xl border border-[var(--color-border)] bg-white px-3 py-3 shadow-xl'
              : 'mt-1.5',
          )}
        >
          {emptyHint && (
            <p className={cn('text-xs text-gray-500', !inline && 'px-1')}>{emptyHint}</p>
          )}
          {error && !emptyHint && (
            <p className={cn('text-xs text-red-600', !inline && 'px-1')} role="alert">
              {error}
            </p>
          )}
          {slowHint && !error && (
            <p
              className={cn(
                'animate-fade-in text-xs italic text-[var(--color-muted-foreground)]',
                !inline && 'px-1',
              )}
            >
              Analyzing your query...
            </p>
          )}
          {aiRemovedNote && (
            <p className={cn('text-xs text-[var(--color-muted-foreground)]', !inline && 'px-1')}>
              AI filters removed
            </p>
          )}
          {showChips && (
            <div
              className={cn('flex gap-2 overflow-x-auto pb-1', !inline && 'mt-2')}
              style={
                { scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties
              }
              role="group"
              aria-label="Example AI searches"
            >
              {AI_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className="shrink-0 whitespace-nowrap rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs text-gray-500 transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
})
