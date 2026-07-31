'use client'

import { useRef } from 'react'

import { cn } from '@/lib/utils'

const EXAMPLE_QUERIES = [
  '2BHK in Pune under 1.5Cr furnished',
  'Studio flat near IT park Bangalore',
  '3BHK villa Hyderabad with garden',
]

interface AiSegmentProps {
  aiQuery: string
  loading: boolean
  error: string | null
  onQueryChange: (q: string) => void
  onSubmit: () => void
}

export function AiSegment({ aiQuery, loading, error, onQueryChange, onSubmit }: AiSegmentProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'text-base leading-none',
            loading ? 'animate-pulse text-violet-400' : 'text-violet-500',
          )}
        >
          ✦
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-violet-600">
          Ask AI
        </span>
      </div>

      <p className="text-xs text-[var(--color-muted-foreground)]">
        Describe your ideal home in plain English — AI fills the other fields for you.
      </p>

      <textarea
        ref={textareaRef}
        value={aiQuery}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSubmit()
          }
        }}
        rows={3}
        placeholder="e.g. 2BHK in Bandra under 1Cr, fully furnished, near the beach"
        className={cn(
          'w-full resize-none rounded-lg border px-3 py-2 text-xs text-gray-800 placeholder:italic placeholder:text-gray-400 focus:outline-none',
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-[var(--color-border)] focus:border-violet-400',
        )}
      />

      {error && (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}

      {/* Example chips */}
      {!aiQuery.trim() && (
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                onQueryChange(q)
                textareaRef.current?.focus()
              }}
              className="rounded-full border border-[var(--color-border)] bg-white px-2.5 py-1 text-xs text-gray-500 transition-colors hover:border-violet-400 hover:text-violet-600"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={loading || !aiQuery.trim()}
        onClick={onSubmit}
        className={cn(
          'flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors',
          loading || !aiQuery.trim()
            ? 'cursor-not-allowed bg-violet-300'
            : 'bg-violet-600 hover:bg-violet-700',
        )}
      >
        {loading ? (
          <>
            <span
              className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
              aria-hidden="true"
            />
            Analyzing…
          </>
        ) : (
          <>✦ Fill fields with AI</>
        )}
      </button>
    </div>
  )
}
