'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ExpandableDescriptionProps {
  text: string
  /** Number of lines shown when collapsed (default 4) */
  clampLines?: number
}

export function ExpandableDescription({
  text,
  clampLines = 4,
}: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false)

  const clampClass: Record<number, string> = {
    3: 'line-clamp-3',
    4: 'line-clamp-4',
    5: 'line-clamp-5',
    6: 'line-clamp-6',
  }

  return (
    <div>
      <p
        className={cn(
          'whitespace-pre-line text-sm leading-relaxed text-[var(--color-muted-foreground)]',
          !expanded && (clampClass[clampLines] ?? 'line-clamp-4'),
        )}
      >
        {text}
      </p>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold underline-offset-2 hover:underline text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] rounded"
      >
        {expanded ? 'Show less' : 'Show more'}
      </button>
    </div>
  )
}
