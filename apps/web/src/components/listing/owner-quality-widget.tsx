'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, Sparkle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QualityScorePanel } from '@/components/listing/quality-score-panel'
import type { QualityBreakdown, ImprovementAction } from '@/lib/quality-score'

interface OwnerQualityWidgetProps {
  listingId: string
  score: number
  breakdown: QualityBreakdown
  actions: ImprovementAction[]
  isOwner?: boolean
}

function scoreBadgeColor(score: number): string {
  if (score >= 80) return 'bg-emerald-50 text-emerald-600'
  if (score >= 50) return 'bg-amber-50 text-amber-600'
  return 'bg-red-50 text-red-600'
}

export function OwnerQualityWidget({
  listingId,
  score,
  breakdown,
  actions,
  isOwner = true,
}: OwnerQualityWidgetProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // Action card navigation: the ctaLink already encodes ?edit=listingId&step=X
  // (built by getImprovementActions with editBase = `/sell?edit=${listingId}`).
  // We navigate programmatically so the full URL (including the edit param) is
  // preserved, which lets sell/page.tsx hydrate the form on arrival.
  function handleActionNavigate(step: string) {
    router.push(`/sell?edit=${listingId}&step=${step}`)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
          'hover:bg-[var(--color-muted)]/30',
        )}
        aria-expanded={open}
      >
        {/* Left: icon + label */}
        <Sparkle className="h-4 w-4 shrink-0 text-amber-500" />
        <span className="whitespace-nowrap text-sm font-medium text-[var(--color-foreground)]">
          AI Quality Score
        </span>

        {/* Score badge */}
        <span
          className={cn(
            'ml-1 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
            scoreBadgeColor(score),
          )}
        >
          {score}/100
        </span>

        {/* Right: expand hint + chevron */}
        <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
          {open ? 'Collapse' : isOwner ? 'See how to improve' : 'See breakdown'}
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')}
          />
        </span>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="flex min-w-0 flex-col gap-4 overflow-hidden border-t border-[var(--color-border)] px-4 pb-4 pt-1">
          <div className="mt-3 w-full min-w-0 overflow-hidden [&_.grid-cols-2]:grid-cols-1 [&_.grid-cols-3]:grid-cols-1 [&_.lg\:grid-cols-3]:grid-cols-1 [&_.lg\:grid-cols-4]:grid-cols-2 [&_.sm\:grid-cols-2]:grid-cols-1">
            <QualityScorePanel
              score={score}
              breakdown={breakdown}
              actions={actions}
              listingId={listingId}
              onNavigate={handleActionNavigate}
              isOwner={isOwner}
            />
          </div>

          {isOwner && (
            <Link
              href={`/sell?edit=${listingId}`}
              className="inline-flex w-full items-center justify-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/90"
            >
              Edit your listing
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
