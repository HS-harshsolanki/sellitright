'use client'

import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Home,
  MapPin,
  Shield,
  Sparkles,
  Tag,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'

import { type ImprovementAction, type QualityBreakdown } from '@/lib/quality-score'
import { cn } from '@/lib/utils'

interface QualityScorePanelProps {
  score: number
  breakdown: QualityBreakdown
  actions: ImprovementAction[]
  listingId?: string
  compact?: boolean
  peerPercentile?: number
  /** When provided, action card clicks call this instead of navigating via Link (preserves in-memory form state) */
  onNavigate?: (step: string) => void
  /** When false (buyer view), hides the "How to improve" / "Perfect score" section entirely */
  isOwner?: boolean
}

function scoreColour(score: number) {
  if (score >= 80) return 'green'
  if (score >= 50) return 'amber'
  return 'red'
}

function barColour(score: number, max: number) {
  if (score === max) return 'green'
  const pct = max > 0 ? (score / max) * 100 : 0
  if (pct >= 50) return 'amber'
  return 'red'
}

function scoreHeadline(score: number, isOwner: boolean) {
  if (isOwner) {
    if (score >= 90) return 'Excellent listing!'
    if (score >= 80) return "Great listing — you're set!"
    if (score >= 65) return 'Good progress!'
    if (score >= 50) return 'Almost there'
    return 'Needs attention'
  }
  // Buyer-facing: describe the listing quality, not the owner's to-do
  if (score >= 90) return 'Highly detailed listing'
  if (score >= 80) return 'Well-detailed listing'
  if (score >= 65) return 'Good amount of detail'
  if (score >= 50) return 'Some details missing'
  return 'Limited details'
}

function scoreSubline(score: number, isOwner: boolean) {
  if (isOwner) {
    if (score >= 90) return 'Your listing is fully optimised for buyers.'
    if (score >= 80) return "You're in great shape to attract serious buyers."
    if (score >= 65) return 'A few improvements will help you get more interest.'
    if (score >= 50) return 'A bit more detail will significantly improve your visibility.'
    return 'Add photos and a description to attract buyers.'
  }
  // Buyer-facing
  if (score >= 90) return 'Photos, description, and all specs are complete.'
  if (score >= 80) return 'Most information is provided — good listing quality.'
  if (score >= 65) return 'Core details are present; some info may be missing.'
  if (score >= 50) return 'Basic info available. You may want to ask the owner for more.'
  return 'Limited info — consider reaching out to the owner directly.'
}

const DIMENSION_ICONS: Record<keyof QualityBreakdown, React.ReactNode> = {
  photos: <Camera className="h-4 w-4" />,
  description: <FileText className="h-4 w-4" />,
  details: <Home className="h-4 w-4" />,
  price: <Tag className="h-4 w-4" />,
  location: <MapPin className="h-4 w-4" />,
  trust: <Shield className="h-4 w-4" />,
}

const DIMENSION_LABELS: Record<keyof QualityBreakdown, string> = {
  photos: 'Photos',
  description: 'Description',
  details: 'Listing details',
  price: 'Price',
  location: 'Location',
  trust: 'Verified',
}

// House illustration SVG (minimal line art matching the reference)
function HouseIllustration() {
  return (
    <svg
      width="96"
      height="80"
      viewBox="0 0 96 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 opacity-80"
      aria-hidden="true"
    >
      {/* sky/cloud */}
      <ellipse cx="72" cy="12" rx="12" ry="6" fill="white" stroke="#d4a96a" strokeWidth="1.5" />
      <ellipse cx="82" cy="10" rx="8" ry="5" fill="white" stroke="#d4a96a" strokeWidth="1.5" />
      {/* house body */}
      <rect
        x="18"
        y="36"
        width="52"
        height="36"
        rx="2"
        fill="white"
        stroke="#d4a96a"
        strokeWidth="2"
      />
      {/* roof */}
      <polygon
        points="10,38 44,12 78,38"
        fill="#f5e6c8"
        stroke="#d4a96a"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* door */}
      <rect
        x="37"
        y="54"
        width="14"
        height="18"
        rx="2"
        fill="#f5e6c8"
        stroke="#d4a96a"
        strokeWidth="1.5"
      />
      <circle cx="49" cy="63" r="1.5" fill="#d4a96a" />
      {/* windows */}
      <rect
        x="22"
        y="44"
        width="12"
        height="10"
        rx="1.5"
        fill="#e8f4f8"
        stroke="#d4a96a"
        strokeWidth="1.5"
      />
      <line x1="28" y1="44" x2="28" y2="54" stroke="#d4a96a" strokeWidth="1" />
      <line x1="22" y1="49" x2="34" y2="49" stroke="#d4a96a" strokeWidth="1" />
      <rect
        x="54"
        y="44"
        width="12"
        height="10"
        rx="1.5"
        fill="#e8f4f8"
        stroke="#d4a96a"
        strokeWidth="1.5"
      />
      <line x1="60" y1="44" x2="60" y2="54" stroke="#d4a96a" strokeWidth="1" />
      <line x1="54" y1="49" x2="66" y2="49" stroke="#d4a96a" strokeWidth="1" />
      {/* tree left */}
      <rect x="4" y="58" width="4" height="14" rx="1" fill="#d4a96a" strokeWidth="0" />
      <ellipse cx="6" cy="54" rx="7" ry="8" fill="#c8e6c9" stroke="#81c784" strokeWidth="1.5" />
      {/* tree right */}
      <rect x="84" y="60" width="4" height="12" rx="1" fill="#d4a96a" strokeWidth="0" />
      <ellipse cx="86" cy="56" rx="6" ry="7" fill="#c8e6c9" stroke="#81c784" strokeWidth="1.5" />
      {/* ground line */}
      <line x1="0" y1="72" x2="96" y2="72" stroke="#e0d0b0" strokeWidth="1.5" />
    </svg>
  )
}

interface DimensionRowProps {
  dimKey: keyof QualityBreakdown
  score: number
  max: number
  pending?: boolean
  ctaLink?: string
}

function DimensionRow({ dimKey, score, max, pending, ctaLink }: DimensionRowProps) {
  const pct = pending ? 0 : Math.round((score / max) * 100)
  const colour = barColour(score, max)
  const label = DIMENSION_LABELS[dimKey]
  const icon = DIMENSION_ICONS[dimKey]

  const barClass = cn(
    'h-2 rounded-full transition-all duration-500',
    colour === 'green' && 'bg-emerald-500',
    colour === 'amber' && 'bg-amber-400',
    colour === 'red' && 'bg-red-400',
    pending && 'animate-pulse bg-gray-300',
  )

  const scoreClass = cn(
    'text-sm font-semibold tabular-nums',
    colour === 'green' && 'text-emerald-600',
    colour === 'amber' && 'text-amber-600',
    colour === 'red' && 'text-red-500',
    pending && 'text-gray-400',
  )

  return (
    <div className="flex items-center gap-2.5">
      {/* icon */}
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
        <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      </span>
      {/* bar + label */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs text-[var(--color-foreground)]">{label}</span>
          {pending ? (
            <span className="flex items-center gap-1 text-[11px] text-[var(--color-muted-foreground)]">
              <Clock className="h-3 w-3" />
              Analysing…
            </span>
          ) : (
            <span className={cn(scoreClass, 'text-xs')}>
              {score}/{max}
            </span>
          )}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div className={barClass} style={{ width: pending ? '10%' : `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}

function ActionCard({
  action,
  isTop,
  onNavigate,
}: {
  action: ImprovementAction
  isTop: boolean
  onNavigate?: (step: string) => void
}) {
  const stepMatch = action.ctaLink?.match(/[?&]step=([^&]+)/)
  const step = stepMatch?.[1]

  const inner = (
    <div
      className={cn(
        'flex h-full flex-col gap-3 rounded-2xl border p-4 transition-colors',
        isTop
          ? 'border-[var(--color-border)] bg-white shadow-sm'
          : 'border-[var(--color-border)] bg-white',
        action.ctaLink && 'cursor-pointer hover:border-[var(--color-foreground)]',
      )}
    >
      {/* Top row: points pill + Fix it button */}
      <div className="flex items-center justify-between gap-2">
        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
          +{action.pointsGain}
        </span>
        {action.ctaLink && (
          <span className="shrink-0 rounded-full bg-[var(--color-foreground)] px-3 py-1 text-xs font-semibold text-white">
            Fix it →
          </span>
        )}
      </div>
      {/* Text */}
      <div>
        <p className="text-sm font-semibold leading-snug text-[var(--color-foreground)]">
          {action.title ?? action.message}
        </p>
        {action.subtitle && (
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
            {action.subtitle}
          </p>
        )}
      </div>
    </div>
  )

  if (!action.ctaLink) return inner

  // In-flow navigation (sell form): use callback so store state is preserved
  if (onNavigate && step) {
    return (
      <button
        type="button"
        className="block h-full w-full text-left"
        onClick={() => onNavigate(step)}
      >
        {inner}
      </button>
    )
  }

  // Standalone (dashboard/edit): navigate via Link
  return (
    <Link href={action.ctaLink} className="block h-full">
      {inner}
    </Link>
  )
}

// Compact badge for listing cards / dashboard
export function QualityScoreBadge({
  score,
  breakdown,
  actions,
  listingId,
}: Pick<QualityScorePanelProps, 'score' | 'breakdown' | 'actions' | 'listingId'>) {
  const topActions = actions.slice(0, 2)
  const colour = scoreColour(score)

  return (
    <div className="space-y-2">
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
          colour === 'green' && 'bg-emerald-50 text-emerald-700',
          colour === 'amber' && 'bg-amber-50 text-amber-700',
          colour === 'red' && 'bg-red-50 text-red-600',
        )}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            colour === 'green' && 'bg-emerald-500',
            colour === 'amber' && 'bg-amber-500',
            colour === 'red' && 'bg-red-500',
          )}
        />
        Score {score}/100
      </span>

      {score < 30 && (
        <div className="flex items-start gap-1.5 rounded-lg bg-red-50 px-2.5 py-2 text-[11px] text-red-600">
          <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
          <span>Won&apos;t appear in recommended results. Add photos and a description.</span>
        </div>
      )}

      {topActions.length > 0 && (
        <ul className="space-y-1">
          {topActions.map((action, i) => (
            <li key={i}>
              {action.ctaLink ? (
                <Link
                  href={action.ctaLink}
                  className={cn(
                    'flex items-center gap-1.5 text-[11px] transition-opacity hover:opacity-80',
                    colour === 'green' && 'text-emerald-600',
                    colour === 'amber' && 'text-amber-600',
                    colour === 'red' && 'text-red-500',
                  )}
                >
                  <ArrowRight className="h-3 w-3 shrink-0" />
                  <span>{action.message}</span>
                  <span className="ml-auto shrink-0 font-semibold">+{action.pointsGain}</span>
                </Link>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted-foreground)]">
                  <ArrowRight className="h-3 w-3 shrink-0" />
                  {action.message}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {score >= 80 && (
        <div className="flex items-center gap-1 text-[11px] text-emerald-600">
          <CheckCircle2 className="h-3 w-3" />
          Great listing — you&apos;re set!
        </div>
      )}
    </div>
  )
}

// Full panel — two column on lg, stacked on mobile
export function QualityScorePanel({
  score,
  breakdown,
  actions,
  listingId,
  compact = false,
  peerPercentile,
  onNavigate,
  isOwner = true,
}: QualityScorePanelProps) {
  if (compact) {
    return (
      <QualityScoreBadge
        score={score}
        breakdown={breakdown}
        actions={actions}
        listingId={listingId}
      />
    )
  }

  const colour = scoreColour(score)
  const circumference = 2 * Math.PI * 35

  // Map ctaLinks onto dimension rows
  const dimensionLinks: Partial<Record<keyof QualityBreakdown, string>> = {
    photos: '/sell?step=photos',
    description: '/sell?step=pricing',
    details: '/sell?step=details',
    location: '/sell?step=location',
    trust: '/sell?step=review',
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-sm">
      {/* ── Hero header ── */}
      <div
        className={cn(
          'relative flex items-center gap-3 px-4 py-4',
          colour === 'green' && 'bg-gradient-to-br from-emerald-50 to-white',
          colour === 'amber' && 'bg-gradient-to-br from-amber-50 via-orange-50 to-white',
          colour === 'red' && 'bg-gradient-to-br from-red-50 to-white',
        )}
      >
        {/* Score ring — compact 56px */}
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <svg className="h-14 w-14 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="35" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle
              cx="40"
              cy="40"
              r="35"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={`${circumference * (1 - score / 100)}`}
              className={cn(
                'transition-all duration-700',
                colour === 'green' && 'stroke-emerald-500',
                colour === 'amber' && 'stroke-amber-400',
                colour === 'red' && 'stroke-red-400',
              )}
            />
          </svg>
          <div className="absolute flex flex-col items-center leading-none">
            <span
              className={cn(
                'text-lg font-bold tabular-nums',
                colour === 'green' && 'text-emerald-600',
                colour === 'amber' && 'text-amber-500',
                colour === 'red' && 'text-red-500',
              )}
            >
              {score}
            </span>
          </div>
        </div>

        {/* Headline + subline */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight text-[var(--color-foreground)]">
            {scoreHeadline(score, isOwner)}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-[var(--color-muted-foreground)]">
            {scoreSubline(score, isOwner)}
          </p>
          {peerPercentile !== undefined && peerPercentile > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
              <TrendingUp className="h-3 w-3" />
              Beats {peerPercentile}% of similar listings
            </p>
          )}
        </div>

        {/* Score label top-right */}
        <span
          className={cn(
            'shrink-0 self-start rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
            colour === 'green' && 'bg-emerald-100 text-emerald-700',
            colour === 'amber' && 'bg-amber-100 text-amber-700',
            colour === 'red' && 'bg-red-100 text-red-600',
          )}
        >
          {score}/100
        </span>
      </div>

      {/* ── Score breakdown — full width ── */}
      <div className="border-t border-[var(--color-border)] px-4 py-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          Score breakdown
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-100 text-[9px] text-gray-400">
            i
          </span>
        </p>
        <div className="grid grid-cols-1 gap-3">
          {(Object.keys(breakdown) as Array<keyof QualityBreakdown>).map((key) => (
            <DimensionRow
              key={key}
              dimKey={key}
              score={breakdown[key].score}
              max={breakdown[key].max}
              ctaLink={dimensionLinks[key]}
            />
          ))}
        </div>
        {score < 30 && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-600">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
            <div>
              <p className="font-semibold">Won&apos;t appear in recommended results</p>
              {isOwner && (
                <p className="mt-0.5 text-red-500">Add photos and a description to qualify.</p>
              )}
            </div>
          </div>
        )}
        {isOwner && (
          <p className="mt-3 flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Complete all sections to boost your visibility and build buyer trust.
          </p>
        )}
      </div>

      {/* ── How to improve / Perfect score — owner only ── */}
      {isOwner &&
        (actions.length > 0 && score < 100 ? (
          <div className="border-t border-[var(--color-border)] p-5">
            <p className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-foreground)]">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              How to improve
            </p>
            <div className="grid grid-cols-2 gap-3">
              {actions.map((action, i) => (
                <ActionCard key={i} action={action} isTop={i === 0} onNavigate={onNavigate} />
              ))}
            </div>
            {/* Social proof banner */}
            <div className="bg-[var(--color-muted)]/40 mt-4 flex items-center gap-3 rounded-2xl border border-[var(--color-border)] px-4 py-3">
              <TrendingUp className="h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                Listings with a score of <span className="font-semibold text-amber-500">90+</span>{' '}
                get{' '}
                <span className="font-semibold text-[var(--color-foreground)]">3x more views</span>{' '}
                and enquiries.
              </p>
            </div>
          </div>
        ) : (
          <div className="border-t border-[var(--color-border)] p-5">
            <div className="flex flex-col items-center justify-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <div>
                <p className="font-semibold text-[var(--color-foreground)]">Perfect score!</p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Your listing is fully optimised.
                </p>
              </div>
            </div>
          </div>
        ))}
    </div>
  )
}
