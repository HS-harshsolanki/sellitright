'use client'

import {
  AlertCircle,
  Clock,
  Eye,
  ExternalLink,
  LayoutGrid,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Share2,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'

import { useMessaging } from '@/lib/messaging-context'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BuyerRequest {
  id: string
  listingId: string
  listingTitle: string
  listingCity: string
  listingImageUrl: string | null
  fullName: string
  purpose: string
  timeline: string
  funding: string
  message: string | null
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN'
  createdAt: string
  updatedAt: string
  contactUnlocked?: boolean
  buyerPhone?: string | null
  buyerEmail?: string | null
}

// ─── Label maps ──────────────────────────────────────────────────────────────

const PURPOSE_LABEL: Record<string, string> = {
  SELF: 'Own use',
  INVESTMENT: 'Investment',
}

const TIMELINE_LABEL: Record<string, string> = {
  IMMEDIATELY: 'Immediately',
  WITHIN_30_DAYS: 'Within 30 days',
  ONE_TO_THREE_MONTHS: '1–3 months',
  EXPLORING: 'Just exploring',
}

const FUNDING_LABEL: Record<string, string> = {
  CASH_READY: 'Cash ready',
  LOAN_APPROVED: 'Loan approved',
  LOAN_IN_PROGRESS: 'Loan in progress',
}

const FUNDING_CLASS: Record<string, string> = {
  CASH_READY: 'bg-green-100 text-green-700',
  LOAN_APPROVED: 'bg-blue-100 text-blue-700',
  LOAN_IN_PROGRESS: 'bg-amber-100 text-amber-700',
}

// ─── Stat card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  sub: string
  icon: React.ReactNode
  iconBg: string
}

function StatCard({ label, value, sub, icon, iconBg }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconBg)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[var(--color-muted-foreground)]">{label}</p>
        <p className="mt-0.5 text-xl font-bold tracking-tight text-[var(--color-foreground)]">
          {value}
        </p>
        <p className="text-[11px] text-[var(--color-muted-foreground)]">{sub}</p>
      </div>
    </div>
  )
}

// ─── Request row card ─────────────────────────────────────────────────────────

interface RequestCardProps {
  item: BuyerRequest
  onAction: (id: string, action: 'ACCEPTED' | 'DECLINED') => Promise<void>
  actionLoading: boolean
  onShareContact: (id: string) => Promise<void>
  sharingContactId: string | null
  onChat: (interestId: string) => void
}

function RequestCard({
  item,
  onAction,
  actionLoading,
  onShareContact,
  sharingContactId,
  onChat,
}: RequestCardProps) {
  const [confirmDecline, setConfirmDecline] = useState(false)

  const dateLabel = (() => {
    const diff = Date.now() - new Date(item.createdAt).getTime()
    const hrs = Math.floor(diff / 3_600_000)
    if (hrs < 1) return 'Just now'
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  })()

  const isContactShared = item.contactUnlocked
  const isDone = item.status === 'DECLINED' || item.status === 'WITHDRAWN'

  // Status pill
  const statusPill =
    isContactShared && item.status === 'ACCEPTED' ? (
      <span className="flex shrink-0 items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Accepted · Contact shared
      </span>
    ) : item.status === 'PENDING' ? (
      <span className="flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        <Clock className="h-3 w-3" />
        Awaiting response
      </span>
    ) : item.status === 'ACCEPTED' ? (
      <span className="flex shrink-0 items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Accepted
      </span>
    ) : item.status === 'DECLINED' ? (
      <span className="flex shrink-0 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
        <XCircle className="h-3 w-3" />
        Declined
      </span>
    ) : (
      <span className="flex shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-500">
        Withdrawn
      </span>
    )

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border bg-white transition-shadow',
        isDone
          ? 'border-[var(--color-border)] opacity-60'
          : isContactShared
            ? 'border-green-200 hover:shadow-sm'
            : 'border-[var(--color-border)] hover:shadow-sm',
      )}
    >
      {/* ── Top: photo + info ── */}
      <div className="flex gap-5 p-5">
        {/* Rectangular listing photo */}
        <div
          className={cn(
            'relative h-28 w-36 shrink-0 overflow-hidden rounded-xl bg-[var(--color-muted)] sm:h-32 sm:w-40',
            isDone && 'grayscale',
          )}
        >
          {item.listingImageUrl ? (
            <Image
              src={item.listingImageUrl}
              alt={item.listingTitle}
              fill
              className="object-cover"
              sizes="160px"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Users className="h-8 w-8 text-[var(--color-border)]" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          {/* Row 1: buyer name + status pill + date */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-base font-bold text-[var(--color-foreground)]">{item.fullName}</h3>
            <div className="flex items-center gap-2">
              {statusPill}
              <span className="hidden text-xs text-[var(--color-muted-foreground)] sm:block">
                {dateLabel}
              </span>
            </div>
          </div>

          {/* Row 2: listing title + city */}
          <Link
            href={`/listing/${item.listingId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:underline"
          >
            {item.listingTitle}
            {item.listingCity ? ` · ${item.listingCity}` : ''}
            <ExternalLink className="h-3 w-3 shrink-0 opacity-40" aria-hidden="true" />
          </Link>

          {/* Row 3: qualification chips */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-[var(--color-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">
              {PURPOSE_LABEL[item.purpose] ?? item.purpose}
            </span>
            <span className="rounded-full bg-[var(--color-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">
              {TIMELINE_LABEL[item.timeline] ?? item.timeline}
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium',
                FUNDING_CLASS[item.funding] ??
                  'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
              )}
            >
              {FUNDING_LABEL[item.funding] ?? item.funding}
            </span>
          </div>

          {/* Row 4: date on mobile */}
          <p className="mt-1.5 text-xs text-[var(--color-muted-foreground)] sm:hidden">
            {dateLabel}
          </p>
        </div>
      </div>

      {/* ── Footer: action strip ── */}
      <div className="border-t border-[var(--color-border)] px-5 py-4">
        {/* PENDING — normal */}
        {item.status === 'PENDING' && !confirmDecline && (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <Clock className="h-4 w-4 text-amber-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  New request from buyer
                </p>
                {item.message ? (
                  <p className="mt-0.5 line-clamp-1 text-xs text-[var(--color-muted-foreground)]">
                    &ldquo;{item.message}&rdquo;
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                    Review and respond to this buyer.
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void onAction(item.id, 'ACCEPTED')}
                className="rounded-full bg-green-600 px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Accept'}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirmDecline(true)}
                className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* PENDING — confirm decline */}
        {item.status === 'PENDING' && confirmDecline && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-[var(--color-muted-foreground)]">Decline this request?</p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  void onAction(item.id, 'DECLINED')
                  setConfirmDecline(false)
                }}
                className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Yes, decline'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDecline(false)}
                className="rounded-full border border-[var(--color-border)] px-4 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ACCEPTED + contact not shared */}
        {item.status === 'ACCEPTED' && !isContactShared && (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                <MessageSquare className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  Chat or share contact
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                  Chat with the buyer first, or share your contact whenever you&apos;re ready.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <button
                type="button"
                onClick={() => onChat(item.id)}
                className="hidden items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 lg:flex"
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                Start conversation
              </button>
              <Link
                href={`/messages/${item.id}`}
                className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 lg:hidden"
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                Start conversation
              </Link>
              <button
                type="button"
                disabled={sharingContactId === item.id}
                onClick={() => void onShareContact(item.id)}
                className="flex items-center gap-1 text-xs font-medium text-[var(--color-foreground)] transition-opacity hover:opacity-70 disabled:opacity-50"
              >
                {sharingContactId === item.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Share2 className="h-3 w-3" aria-hidden="true" /> Share contact
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ACCEPTED + contact shared */}
        {isContactShared && (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                <Phone className="h-4 w-4 text-green-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">
                  Contact shared — buyer notified
                </p>
                <div className="mt-1 space-y-0.5">
                  {item.buyerPhone && (
                    <a
                      href={`tel:${item.buyerPhone}`}
                      className="flex items-center gap-1.5 text-xs text-green-700 hover:underline"
                    >
                      <Phone className="h-3 w-3 shrink-0" /> {item.buyerPhone}
                    </a>
                  )}
                  {item.buyerEmail && (
                    <a
                      href={`mailto:${item.buyerEmail}`}
                      className="flex items-center gap-1.5 text-xs text-green-700 hover:underline"
                    >
                      <Mail className="h-3 w-3 shrink-0" /> {item.buyerEmail}
                    </a>
                  )}
                  {!item.buyerPhone && !item.buyerEmail && (
                    <p className="text-xs text-green-600 opacity-70">
                      Contact details will appear here shortly.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChat(item.id)}
              className="hidden shrink-0 items-center gap-1.5 rounded-full border border-green-300 bg-white px-4 py-1.5 text-xs font-semibold text-green-700 transition-colors hover:bg-green-50 lg:flex"
            >
              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
              Message
            </button>
            <Link
              href={`/messages/${item.id}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-green-300 bg-white px-4 py-1.5 text-xs font-semibold text-green-700 transition-colors hover:bg-green-50 lg:hidden"
            >
              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
              Message
            </Link>
          </div>
        )}

        {/* DECLINED / WITHDRAWN */}
        {(item.status === 'DECLINED' || item.status === 'WITHDRAWN') && (
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                item.status === 'DECLINED' ? 'bg-red-100' : 'bg-gray-100',
              )}
            >
              <XCircle
                className={cn(
                  'h-4 w-4',
                  item.status === 'DECLINED' ? 'text-red-500' : 'text-gray-400',
                )}
                aria-hidden="true"
              />
            </div>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {item.status === 'DECLINED'
                ? 'You declined this request'
                : 'Buyer withdrew their request'}
            </p>
          </div>
        )}
      </div>
    </article>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type StatusFilter = 'ALL' | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN'
type Sort = 'newest' | 'oldest'

function BuyerRequestsPageInner() {
  const { openChatForInterest } = useMessaging()

  const [requests, setRequests] = useState<BuyerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [sort, setSort] = useState<Sort>('newest')
  const [total, setTotal] = useState(0)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [sharingContactId, setSharingContactId] = useState<string | null>(null)

  // Auto-dismiss success
  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(null), 4000)
    return () => clearTimeout(t)
  }, [success])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ status: statusFilter, sort })
        const res = await fetch(`/api/dashboard/interests?${params.toString()}`)
        if (res.ok) {
          const json = (await res.json()) as { interests: BuyerRequest[]; total: number }
          setRequests(json.interests)
          setTotal(json.total)
        } else if (res.status === 401) {
          setError('Sign in to view buyer requests.')
        } else {
          setError('Failed to load buyer requests. Please refresh.')
        }
      } catch {
        setError('Network error — check your connection and refresh.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [statusFilter, sort])

  async function handleAction(id: string, action: 'ACCEPTED' | 'DECLINED') {
    setActionLoadingId(id)
    try {
      const res = await fetch(`/api/dashboard/interests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const json = (await res.json()) as { id: string; status: string }
        setRequests((prev) =>
          prev.map((r) =>
            r.id === json.id ? { ...r, status: json.status as BuyerRequest['status'] } : r,
          ),
        )
        setSuccess(
          action === 'ACCEPTED' ? 'Request accepted — buyer notified.' : 'Request declined.',
        )
      } else {
        const d = (await res.json()) as { error?: string }
        setError(d.error ?? 'Failed to update request.')
      }
    } catch {
      setError('Network error — try again.')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleShareContact(id: string) {
    setSharingContactId(id)
    try {
      const res = await fetch(`/api/dashboard/interests/${id}/share-contact`, { method: 'POST' })
      if (res.ok) {
        const d = (await res.json()) as { buyerPhone?: string | null; buyerEmail?: string | null }
        setRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  contactUnlocked: true,
                  buyerPhone: d.buyerPhone ?? r.buyerPhone,
                  buyerEmail: d.buyerEmail ?? r.buyerEmail,
                }
              : r,
          ),
        )
        setSuccess('Contact shared — the buyer can now reach you directly.')
      } else {
        const d = (await res.json()) as { error?: string }
        setError(d.error ?? 'Failed to share contact.')
      }
    } catch {
      setError('Network error — try again.')
    } finally {
      setSharingContactId(null)
    }
  }

  // Derived stats
  const activeCount = requests.filter((r) => r.status === 'ACCEPTED').length
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length

  const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'ACCEPTED', label: 'Accepted' },
    { value: 'DECLINED', label: 'Declined' },
    { value: 'WITHDRAWN', label: 'Withdrawn' },
  ]

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            Buyer Requests
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Connect with interested buyers and manage your conversations.
          </p>
        </div>
        <Link
          href="/sell"
          className="hidden shrink-0 items-center gap-2 rounded-full bg-[var(--color-foreground)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:flex"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New listing
        </Link>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Requests"
          value={loading ? '—' : total}
          sub="All time"
          icon={<LayoutGrid className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-100"
        />
        <StatCard
          label="Active Conversations"
          value={loading ? '—' : activeCount}
          sub={activeCount > 0 ? 'Live now' : 'Currently active'}
          icon={<TrendingUp className="h-4 w-4 text-green-600" />}
          iconBg="bg-green-100"
        />
        <StatCard
          label="Total Views"
          value="—"
          sub="Across all listings"
          icon={<Eye className="h-4 w-4 text-sky-600" />}
          iconBg="bg-sky-100"
        />
        <StatCard
          label="Pending Response"
          value={loading ? '—' : pendingCount}
          sub="Awaiting your reply"
          icon={<Users className="h-4 w-4 text-[var(--color-muted-foreground)]" />}
          iconBg="bg-[var(--color-muted)]"
        />
      </div>

      {/* ── Toasts ── */}
      {success && (
        <div
          className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          role="status"
        >
          <span className="flex-1">{success}</span>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="text-xs text-green-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}
      {error && (
        <div
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs text-red-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Filter pills + sort ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter by status"
        >
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.value
            const count =
              f.value === 'ALL' ? total : requests.filter((r) => r.status === f.value).length
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
                  isActive
                    ? 'border-[var(--color-foreground)] bg-[var(--color-foreground)] text-white'
                    : 'border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)] hover:border-[var(--color-foreground)] hover:text-[var(--color-foreground)]',
                )}
              >
                {f.label}
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
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {/* ── Request list ── */}
      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-[var(--color-border)] bg-white p-5"
            >
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 shrink-0 rounded-full bg-[var(--color-muted)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded-full bg-[var(--color-muted)]" />
                  <div className="h-3 w-48 rounded-full bg-[var(--color-muted)]" />
                  <div className="flex gap-2">
                    <div className="h-6 w-16 rounded-full bg-[var(--color-muted)]" />
                    <div className="h-6 w-20 rounded-full bg-[var(--color-muted)]" />
                    <div className="h-6 w-24 rounded-full bg-[var(--color-muted)]" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-muted)]">
            <Users className="h-8 w-8 text-[var(--color-muted-foreground)]" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-[var(--color-foreground)]">
            {statusFilter === 'ALL'
              ? 'No buyer requests yet'
              : `No ${statusFilter.toLowerCase()} requests`}
          </h3>
          <p className="mt-1 max-w-xs text-sm text-[var(--color-muted-foreground)]">
            {statusFilter === 'ALL'
              ? 'When buyers express interest in your listings, their requests will appear here.'
              : 'Try a different filter to see other requests.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...requests]
            .sort((a, b) => {
              const order = { PENDING: 0, ACCEPTED: 1, DECLINED: 2, WITHDRAWN: 3 }
              return (order[a.status] ?? 9) - (order[b.status] ?? 9)
            })
            .map((item) => (
              <RequestCard
                key={item.id}
                item={item}
                onAction={handleAction}
                actionLoading={actionLoadingId === item.id}
                onShareContact={handleShareContact}
                sharingContactId={sharingContactId}
                onChat={openChatForInterest}
              />
            ))}
        </div>
      )}
    </div>
  )
}

export default function BuyerRequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
        </div>
      }
    >
      <BuyerRequestsPageInner />
    </Suspense>
  )
}
