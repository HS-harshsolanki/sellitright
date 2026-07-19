'use client'

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  // IndianRupee, /* PAYMENT_DISABLED */
  LayoutGrid,
  Loader2,
  MapPin,
  MessageSquare,
  Mail,
  Phone,
  Search,
  Users,
  XCircle,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import type { BuyerRequestItem } from '@/app/api/buyer/requests/route'
import { useToast } from '@/components/ui/toast'
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

type DisplayStatus = 'PENDING' | 'ACCEPTED_PENDING_SHARE' | 'CONTACT_UNLOCKED' | 'DECLINED'
// /* PAYMENT_DISABLED — was: 'ACCEPTED_UNPAID' */

function getDisplayStatus(item: BuyerRequestItem): DisplayStatus {
  if (item.status === 'ACCEPTED' && item.contactUnlocked) return 'CONTACT_UNLOCKED'
  if (item.status === 'ACCEPTED' && !item.contactUnlocked) return 'ACCEPTED_PENDING_SHARE'
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
  ACCEPTED_PENDING_SHARE: {
    /* PAYMENT_DISABLED — was: 'Pay to unlock contact' with IndianRupee icon */
    label: 'Contact coming soon',
    dot: 'bg-emerald-400',
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" />,
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
  const bhkLabel = item.listingBhkType
    ? (BHK_LABEL[item.listingBhkType] ?? item.listingBhkType)
    : null

  return (
    <article className="group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white transition-shadow hover:shadow-sm">
      {/* Top section: photo + info */}
      <Link
        href={`/listing/${item.listingId}`}
        className="flex gap-5 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]"
      >
        {/* Photo with BHK badge */}
        <div className="relative h-28 w-36 shrink-0 overflow-hidden rounded-xl bg-[var(--color-muted)] sm:h-32 sm:w-40">
          {item.listingImageUrl ? (
            <Image
              src={item.listingImageUrl}
              alt={item.listingTitle}
              fill
              className="object-cover"
              sizes="160px"
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
          {/* BHK badge bottom-left */}
          {bhkLabel && (
            <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              {bhkLabel}
            </span>
          )}
        </div>

        {/* Info section */}
        <div className="min-w-0 flex-1">
          {/* Row 1: title + status pill */}
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-lg font-bold text-[var(--color-foreground)]">
              {bhkLabel ? `${bhkLabel} · ` : ''}
              {item.listingLocality}, {item.listingCity}
            </p>
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

          {/* Row 2: price */}
          <p className="mt-1 text-base font-bold text-[var(--color-foreground)]">
            {formatPrice(item.listingPrice)}
          </p>

          {/* Row 3: city */}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{item.listingCity}</span>
          </div>

          {/* Row 4: requested time */}
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            Requested {relativeDate(item.createdAt)}
          </p>

          {/* Row 5: SLA / status text */}
          {displayStatus === 'PENDING' && hoursLeft !== null && (
            <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
              {hoursLeft > 0
                ? `Owner has ${hoursLeft}h left to respond`
                : 'Owner has not responded yet'}
            </p>
          )}
        </div>
      </Link>

      {/* Footer — separated by border-t, varies by status */}
      <div className="border-t border-[var(--color-border)] px-5 py-4">
        {/* CONTACT_UNLOCKED */}
        {displayStatus === 'CONTACT_UNLOCKED' && (
          <div className="flex flex-wrap gap-2">
            {item.sellerPhone && (
              <a
                href={`https://wa.me/${item.sellerPhone.replace(/\D/g, '').replace(/^91/, '').replace(/^0/, '')}`}
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

        {/* ACCEPTED_PENDING_SHARE */}
        {/* PAYMENT_DISABLED — was: "Pay ₹99" button */}
        {displayStatus === 'ACCEPTED_PENDING_SHARE' && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <Clock className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                Owner accepted — contact details coming soon
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                They&apos;ll share their contact with you shortly.
              </p>
            </div>
          </div>
        )}

        {/* PENDING */}
        {displayStatus === 'PENDING' && (
          <div className="flex items-start justify-between gap-3">
            {confirmWithdraw ? (
              <>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Withdraw this request?
                </p>
                <div className="flex shrink-0 gap-2">
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
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <Clock className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">
                      Waiting for the owner to respond
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                      We&apos;ll notify you as soon as they reply.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmWithdraw(true)}
                  className="shrink-0 rounded-full border border-[var(--color-border)] px-4 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)]"
                >
                  Withdraw
                </button>
              </>
            )}
          </div>
        )}

        {/* DECLINED */}
        {displayStatus === 'DECLINED' && (
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  Owner declined your request
                </p>
              </div>
            </div>
            <Link
              href="/properties"
              className="flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--color-foreground)] hover:underline"
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
          'mt-7 flex items-center gap-2 rounded-full bg-[var(--color-foreground)] px-5 py-2.5 text-sm font-semibold text-white',
          'transition-opacity hover:opacity-90',
        )}
      >
        Browse properties
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'accepted' | 'declined'

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
]

export default function MyRequestsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [requests, setRequests] = useState<BuyerRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
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
    setMutationError(null)
    try {
      const res = await fetch(`/api/listings/${item.listingId}/interest`, { method: 'DELETE' })
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== id))
        toast('Request withdrawn.', 'success')
      } else {
        setMutationError('Could not withdraw — please try again.')
        toast('Could not withdraw — please try again.', 'error')
      }
    } catch {
      setMutationError('Network error — please try again.')
      toast('Network error — please try again.', 'error')
    } finally {
      setWithdrawingId(null)
    }
  }

  // Stat card counts
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length
  const activeCount = requests.filter((r) => r.status === 'ACCEPTED').length

  // Tab counts
  const tabCounts: Record<StatusFilter, number> = {
    all: requests.length,
    pending: requests.filter((r) => getDisplayStatus(r) === 'PENDING').length,
    accepted: requests.filter(
      (r) =>
        getDisplayStatus(r) === 'ACCEPTED_PENDING_SHARE' ||
        getDisplayStatus(r) === 'CONTACT_UNLOCKED',
    ).length,
    declined: requests.filter((r) => getDisplayStatus(r) === 'DECLINED').length,
  }

  const filtered = requests
    .filter((r) => {
      const ds = getDisplayStatus(r)
      if (statusFilter === 'all') return true
      if (statusFilter === 'pending') return ds === 'PENDING'
      if (statusFilter === 'accepted')
        return ds === 'ACCEPTED_PENDING_SHARE' || ds === 'CONTACT_UNLOCKED'
      if (statusFilter === 'declined') return ds === 'DECLINED'
      return true
    })
    .sort((a, b) =>
      sort === 'newest'
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )

  if (authLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-[var(--color-border)] bg-white p-5"
          >
            <div className="flex gap-5">
              <div className="h-28 w-36 shrink-0 rounded-xl bg-[var(--color-muted)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded-full bg-[var(--color-muted)]" />
                <div className="h-3 w-32 rounded-full bg-[var(--color-muted)]" />
                <div className="flex gap-2">
                  <div className="h-6 w-16 rounded-full bg-[var(--color-muted)]" />
                  <div className="h-6 w-20 rounded-full bg-[var(--color-muted)]" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            My Requests
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            Properties you&apos;ve expressed interest in
          </p>
        </div>
        <Link
          href="/properties"
          className="flex items-center gap-1.5 rounded-full bg-[var(--color-foreground)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Browse properties
        </Link>
      </div>

      {fetchError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          {fetchError}
        </div>
      )}

      {mutationError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          {mutationError}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total requests */}
        <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
            <LayoutGrid className="h-[18px] w-[18px] text-violet-600" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[var(--color-muted-foreground)]">
              Total Requests
            </p>
            <p className="mt-0.5 text-xl font-bold tracking-tight text-[var(--color-foreground)]">
              {loading ? '—' : requests.length}
            </p>
            <p className="text-[11px] text-[var(--color-muted-foreground)]">All time</p>
          </div>
        </div>

        {/* Active conversations */}
        <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100">
            <MessageSquare className="h-[18px] w-[18px] text-green-600" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[var(--color-muted-foreground)]">
              Active Conversations
            </p>
            <p className="mt-0.5 text-xl font-bold tracking-tight text-[var(--color-foreground)]">
              {loading ? '—' : activeCount}
            </p>
            <p className="text-[11px] text-[var(--color-muted-foreground)]">
              {activeCount > 0 ? 'Live now' : 'Currently active'}
            </p>
          </div>
        </div>

        {/* Total views */}
        <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100">
            <Eye className="h-[18px] w-[18px] text-sky-600" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[var(--color-muted-foreground)]">
              Total Views
            </p>
            <p className="mt-0.5 text-xl font-bold tracking-tight text-[var(--color-foreground)]">
              —
            </p>
            <p className="text-[11px] text-[var(--color-muted-foreground)]">Across all listings</p>
          </div>
        </div>

        {/* Pending response */}
        <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-muted)]">
            <Users
              className="h-[18px] w-[18px] text-[var(--color-muted-foreground)]"
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[var(--color-muted-foreground)]">
              Pending Response
            </p>
            <p className="mt-0.5 text-xl font-bold tracking-tight text-[var(--color-foreground)]">
              {loading ? '—' : pendingCount}
            </p>
            <p className="text-[11px] text-[var(--color-muted-foreground)]">Awaiting your reply</p>
          </div>
        </div>
      </div>

      {/* Filter pills + sort */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter by status"
        >
          {FILTER_TABS.map((tab) => {
            const isActive = statusFilter === tab.value
            const count = tabCounts[tab.value]
            return (
              <button
                key={tab.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
                  isActive
                    ? 'border-[var(--color-foreground)] bg-[var(--color-foreground)] text-white'
                    : 'border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)] hover:border-[var(--color-foreground)] hover:text-[var(--color-foreground)]',
                )}
              >
                {tab.label}
                {!loading && (
                  <span
                    className={cn(
                      'flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-muted-foreground)]">Sort by:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')}
            className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-[var(--color-border)] bg-white p-5"
            >
              <div className="flex gap-5">
                <div className="h-28 w-36 shrink-0 rounded-xl bg-[var(--color-muted)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded-full bg-[var(--color-muted)]" />
                  <div className="h-3 w-32 rounded-full bg-[var(--color-muted)]" />
                  <div className="flex gap-2">
                    <div className="h-6 w-16 rounded-full bg-[var(--color-muted)]" />
                    <div className="h-6 w-20 rounded-full bg-[var(--color-muted)]" />
                  </div>
                </div>
              </div>
            </div>
          ))}
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
            className="mt-3 rounded-full border border-[var(--color-border)] px-4 py-1.5 text-sm font-medium text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-foreground)] hover:text-[var(--color-foreground)]"
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
