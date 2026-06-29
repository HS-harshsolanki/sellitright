'use client'

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  IndianRupee,
  Loader2,
  Phone,
  Mail,
  MessageSquare,
  XCircle,
  Search,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import type { BuyerRequestItem } from '@/app/api/buyer/requests/route'
import { formatPrice } from '@/lib/format'
import { useAuth } from '@/lib/supabase/auth-context'
import { cn } from '@/lib/utils'

// ─── Label maps ───────────────────────────────────────────────────────────────

const BHK_LABEL: Record<string, string> = {
  ONE_BHK: '1 BHK',
  TWO_BHK: '2 BHK',
  THREE_BHK: '3 BHK',
  FOUR_BHK: '4 BHK',
  FOUR_PLUS_BHK: '4+ BHK',
  STUDIO: 'Studio',
  PLOT: 'Plot',
  COMMERCIAL: 'Commercial',
}

// ─── Status config ────────────────────────────────────────────────────────────

type DisplayStatus = 'PENDING' | 'ACCEPTED_UNPAID' | 'CONTACT_UNLOCKED' | 'DECLINED'

function getDisplayStatus(item: BuyerRequestItem): DisplayStatus {
  if (item.status === 'ACCEPTED' && item.contactUnlocked) return 'CONTACT_UNLOCKED'
  if (item.status === 'ACCEPTED' && !item.contactUnlocked) return 'ACCEPTED_UNPAID'
  return item.status as 'PENDING' | 'DECLINED'
}

const STATUS_CONFIG: Record<
  DisplayStatus,
  { label: string; dot: string; pill: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: 'Awaiting response',
    dot: 'bg-amber-400',
    pill: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  ACCEPTED_UNPAID: {
    label: 'Pay to unlock contact',
    dot: 'bg-emerald-400',
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <IndianRupee className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  CONTACT_UNLOCKED: {
    label: 'Contact unlocked',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  DECLINED: {
    label: 'Request declined',
    dot: 'bg-red-400',
    pill: 'bg-red-50 text-red-600 border-red-200',
    icon: <XCircle className="h-3.5 w-3.5" aria-hidden="true" />,
  },
}

// ─── Relative date ────────────────────────────────────────────────────────────

function relativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffHr = Math.floor(diffMs / 3_600_000)
  if (diffHr < 1) return 'Just now'
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay} days ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ─── SLA countdown ────────────────────────────────────────────────────────────

function pendingHoursLeft(createdAt: string): number {
  const slaMs = 72 * 3_600_000
  const elapsed = Date.now() - new Date(createdAt).getTime()
  return Math.max(0, Math.round((slaMs - elapsed) / 3_600_000))
}

// ─── Request card ─────────────────────────────────────────────────────────────

interface RequestCardProps {
  item: BuyerRequestItem
  onWithdraw: (id: string) => Promise<void>
  withdrawingId: string | null
}

function RequestCard({ item, onWithdraw, withdrawingId }: RequestCardProps) {
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)
  const displayStatus = getDisplayStatus(item)
  const cfg = STATUS_CONFIG[displayStatus]
  const hoursLeft = displayStatus === 'PENDING' ? pendingHoursLeft(item.createdAt) : null
  const isWithdrawing = withdrawingId === item.id

  return (
    <article className="group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white transition-shadow hover:shadow-sm">
      <Link
        href={`/listing/${item.listingId}`}
        className="flex gap-4 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]"
      >
        {/* Listing thumbnail */}
        <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-[var(--color-muted)] sm:h-24 sm:w-28">
          {item.listingImageUrl ? (
            <Image
              src={item.listingImageUrl}
              alt={item.listingTitle}
              fill
              className="object-cover"
              sizes="112px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[var(--color-border)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 9.75L12 3l9 6.75V21H3V9.75z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Listing info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--color-foreground)] sm:text-base">
                {item.listingBhkType ? (BHK_LABEL[item.listingBhkType] ?? item.listingBhkType) : ''}
                {item.listingBhkType ? ' · ' : ''}
                {item.listingLocality}, {item.listingCity}
              </p>
              <p className="mt-0.5 text-base font-bold text-[var(--color-foreground)]">
                {formatPrice(item.listingPrice)}
              </p>
            </div>
            {/* Status pill */}
            <span
              className={cn(
                'flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
                cfg.pill,
              )}
            >
              {cfg.icon}
              <span className="hidden sm:inline">{cfg.label}</span>
            </span>
          </div>

          <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
            Requested {relativeDate(item.createdAt)}
          </p>

          {/* Pending SLA nudge */}
          {displayStatus === 'PENDING' && hoursLeft !== null && (
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {hoursLeft > 0
                ? `Owner has ${hoursLeft}h left to respond`
                : "Owner hasn't responded — consider withdrawing"}
            </p>
          )}
        </div>
      </Link>

      {/* Action footer — varies by status */}
      <div className="border-t border-[var(--color-border)] px-4 py-3">
        {displayStatus === 'CONTACT_UNLOCKED' && (
          <div className="flex flex-wrap gap-2">
            {item.sellerPhone && (
              <a
                href={`https://wa.me/91${item.sellerPhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                WhatsApp
              </a>
            )}
            {item.sellerPhone && (
              <a
                href={`tel:${item.sellerPhone}`}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {item.sellerPhone}
              </a>
            )}
            {item.sellerEmail && !item.sellerPhone && (
              <a
                href={`mailto:${item.sellerEmail}`}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {item.sellerEmail}
              </a>
            )}
            <Link
              href={`/listing/${item.listingId}`}
              className="ml-auto flex items-center gap-1 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              View listing
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        )}

        {displayStatus === 'ACCEPTED_UNPAID' && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Owner accepted · pay ₹49 to unlock their number
            </p>
            <Link
              href={`/listing/${item.listingId}#unlock`}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-foreground)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              <IndianRupee className="h-3.5 w-3.5" aria-hidden="true" />
              Pay ₹49
            </Link>
          </div>
        )}

        {displayStatus === 'PENDING' && (
          <div className="flex items-center justify-between gap-3">
            {confirmWithdraw ? (
              <>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Withdraw this request?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isWithdrawing}
                    onClick={() => {
                      void onWithdraw(item.id)
                      setConfirmWithdraw(false)
                    }}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    {isWithdrawing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      'Yes, withdraw'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmWithdraw(false)}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)]"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Waiting for the owner to respond
                </p>
                <button
                  type="button"
                  onClick={() => setConfirmWithdraw(true)}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)]"
                >
                  Withdraw
                </button>
              </>
            )}
          </div>
        )}

        {displayStatus === 'DECLINED' && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Owner declined your request
            </p>
            <Link
              href="/properties"
              className="flex items-center gap-1 text-xs font-medium text-[var(--color-foreground)] hover:underline"
            >
              Browse similar
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </article>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] py-20 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-muted)]">
        <Search className="h-7 w-7 text-[var(--color-muted-foreground)]" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-[var(--color-foreground)]">No requests yet</h3>
      <p className="mt-1.5 max-w-xs text-sm text-[var(--color-muted-foreground)]">
        When you express interest in a property, your requests will appear here — with their status
        and owner contact once unlocked.
      </p>
      <Link
        href="/properties"
        className={cn(
          'mt-7 flex items-center gap-2 rounded-xl bg-[var(--color-foreground)] px-5 py-2.5 text-sm font-semibold text-white',
          'transition-opacity hover:opacity-90',
        )}
      >
        Browse properties
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  )
}

// ─── Summary bar ──────────────────────────────────────────────────────────────

function SummaryBar({ requests }: { requests: BuyerRequestItem[] }) {
  const counts = {
    pending: requests.filter((r) => r.status === 'PENDING').length,
    accepted: requests.filter((r) => r.status === 'ACCEPTED' && !r.contactUnlocked).length,
    unlocked: requests.filter((r) => r.contactUnlocked).length,
    declined: requests.filter((r) => r.status === 'DECLINED').length,
  }
  const items = [
    { label: 'Awaiting', count: counts.pending, color: 'text-amber-600' },
    { label: 'Pay to unlock', count: counts.accepted, color: 'text-emerald-600' },
    { label: 'Unlocked', count: counts.unlocked, color: 'text-emerald-700' },
    { label: 'Declined', count: counts.declined, color: 'text-red-500' },
  ].filter((i) => i.count > 0)

  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-4 rounded-xl border border-[var(--color-border)] bg-white px-5 py-3.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-1.5">
          <span className={cn('text-xl font-bold tabular-nums', item.color)}>{item.count}</span>
          <span className="text-xs text-[var(--color-muted-foreground)]">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'accepted' | 'unlocked' | 'declined'

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Awaiting' },
  { value: 'accepted', label: 'Pay to unlock' },
  { value: 'unlocked', label: 'Unlocked' },
  { value: 'declined', label: 'Declined' },
]

export default function MyRequestsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [requests, setRequests] = useState<BuyerRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/dashboard/requests')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setFetchError(null)
    fetch('/api/buyer/requests')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: { requests: BuyerRequestItem[] }) => setRequests(json.requests))
      .catch((e: unknown) => {
        if (e === 401) {
          setFetchError('Sign in to view your requests.')
        } else {
          setFetchError('Failed to load requests. Please refresh.')
        }
      })
      .finally(() => setLoading(false))
  }, [user])

  async function handleWithdraw(id: string) {
    const item = requests.find((r) => r.id === id)
    if (!item) return
    setWithdrawingId(id)
    try {
      const res = await fetch(`/api/listings/${item.listingId}/interest`, { method: 'DELETE' })
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== id))
      } else {
        setFetchError('Could not withdraw — please try again.')
      }
    } catch {
      setFetchError('Network error — please try again.')
    } finally {
      setWithdrawingId(null)
    }
  }

  const filtered = requests.filter((r) => {
    const ds = getDisplayStatus(r)
    if (statusFilter === 'all') return true
    if (statusFilter === 'pending') return ds === 'PENDING'
    if (statusFilter === 'accepted') return ds === 'ACCEPTED_UNPAID'
    if (statusFilter === 'unlocked') return ds === 'CONTACT_UNLOCKED'
    if (statusFilter === 'declined') return ds === 'DECLINED'
    return true
  })

  // Count badges — only show for non-zero tabs
  const tabCounts: Record<StatusFilter, number> = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'PENDING').length,
    accepted: requests.filter((r) => r.status === 'ACCEPTED' && !r.contactUnlocked).length,
    unlocked: requests.filter((r) => r.contactUnlocked).length,
    declined: requests.filter((r) => r.status === 'DECLINED').length,
  }

  const actionRequired = tabCounts.accepted
  const visibleTabs = FILTER_TABS.filter(
    (t) => t.value === 'all' || tabCounts[t.value] > 0 || statusFilter === t.value,
  )

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-foreground)] sm:text-2xl">
            My Requests
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            Properties you&apos;ve expressed interest in
          </p>
        </div>
        {actionRequired > 0 && (
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <span className="text-sm font-bold text-emerald-700">{actionRequired}</span>
            <span className="text-xs text-emerald-700">
              {actionRequired === 1 ? 'request' : 'requests'} accepted — pay to unlock
            </span>
          </div>
        )}
      </div>

      {fetchError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          {fetchError}
        </div>
      )}

      {/* Summary bar — visible when there are requests */}
      {!loading && requests.length > 0 && <SummaryBar requests={requests} />}

      {/* Filter tabs */}
      {!loading && requests.length > 0 && (
        <div
          role="tablist"
          aria-label="Filter requests"
          className="flex gap-1 overflow-x-auto rounded-xl bg-[var(--color-muted)] p-1"
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              type="button"
              aria-selected={statusFilter === tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all',
                'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                statusFilter === tab.value
                  ? 'bg-white text-[var(--color-foreground)] shadow-sm'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
              )}
            >
              {tab.label}
              {tab.value !== 'all' && tabCounts[tab.value] > 0 ? (
                <span
                  className={cn(
                    'flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none',
                    tab.value === 'accepted'
                      ? 'bg-emerald-500 text-white'
                      : statusFilter === tab.value
                        ? 'bg-[var(--color-foreground)] text-white'
                        : 'bg-[var(--color-border)] text-[var(--color-muted-foreground)]',
                  )}
                >
                  {tabCounts[tab.value]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
        </div>
      ) : requests.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] py-14 text-center">
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            No {FILTER_TABS.find((t) => t.value === statusFilter)?.label.toLowerCase()} requests
          </p>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className="mt-3 text-sm text-[var(--color-muted-foreground)] underline underline-offset-2 hover:text-[var(--color-foreground)]"
          >
            View all requests
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <RequestCard
              key={item.id}
              item={item}
              onWithdraw={handleWithdraw}
              withdrawingId={withdrawingId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
