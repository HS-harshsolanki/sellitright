'use client'

import {
  Bell,
  BellDot,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Phone,
  Info,
  IndianRupee,
  CheckCheck,
  Loader2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useNotifications } from '@/hooks/use-notifications'
import type { NotificationItem } from '@/hooks/use-notifications'
import { useAuth } from '@/lib/supabase/auth-context'
import { cn } from '@/lib/utils'

// ─── Nav helper ─────────────────────────────────────────────────────────────

function getNotificationActionUrl(item: {
  type: string
  entityType?: string | null
  entityId?: string | null
}): string | null {
  if (item.type === 'InterestRequest') {
    return '/dashboard/buyers'
  }
  if (item.type === 'Accepted' || item.type === 'Rejected') {
    return '/dashboard/requests'
  }
  if (item.type === 'ConnectionUnlocked' || item.type === 'PaymentReceived') {
    return '/dashboard/requests'
  }
  if (item.entityType === 'listing' && item.entityId) {
    return `/listing/${item.entityId}`
  }
  return null
}

// ─── Date helper ─────────────────────────────────────────────────────────────

function relativeDate(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay} days ago`

  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ─── Icon box ─────────────────────────────────────────────────────────────────

function TypeIconBox({ type, unread }: { type: string; unread: boolean }) {
  let bgCls: string
  let Icon: React.ElementType
  let iconCls: string

  switch (type) {
    case 'InterestRequest':
      bgCls = 'bg-blue-100'
      Icon = MessageSquare
      iconCls = 'text-blue-600'
      break
    case 'Accepted':
      bgCls = 'bg-green-100'
      Icon = CheckCircle2
      iconCls = 'text-green-600'
      break
    case 'Rejected':
      bgCls = 'bg-red-100'
      Icon = XCircle
      iconCls = 'text-red-600'
      break
    case 'ConnectionUnlocked':
      bgCls = 'bg-emerald-100'
      Icon = Phone
      iconCls = 'text-emerald-600'
      break
    case 'PaymentReceived':
      // PAYMENT_DISABLED — kept for future use
      bgCls = 'bg-violet-100'
      Icon = IndianRupee
      iconCls = 'text-violet-600'
      break
    default:
      bgCls = 'bg-gray-100'
      Icon = Info
      iconCls = 'text-gray-500'
  }

  return (
    <div className="relative shrink-0">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', bgCls)}>
        <Icon className={cn('h-5 w-5', iconCls)} aria-hidden="true" />
      </div>
      {unread && (
        <span
          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500"
          aria-hidden="true"
        />
      )}
    </div>
  )
}

// ─── Notification card ────────────────────────────────────────────────────────

interface NotificationCardProps {
  item: NotificationItem
  onRead: (id: string) => void
}

function NotificationCard({ item, onRead }: NotificationCardProps) {
  return (
    <button
      type="button"
      onClick={() => onRead(item.id)}
      className={cn(
        'flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
        item.read
          ? 'border-[var(--color-border)] bg-white'
          : 'bg-[var(--color-muted)]/50 border-amber-200',
      )}
    >
      <TypeIconBox type={item.type} unread={!item.read} />

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="text-sm font-semibold text-[var(--color-foreground)]">{item.title}</span>
          <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
            {relativeDate(item.createdAt)}
          </span>
        </span>
        <span className="mt-1 line-clamp-2 block text-sm text-[var(--color-muted-foreground)]">
          {item.message}
        </span>
      </span>
    </button>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  value: number
  label: string
  highlight?: boolean
}

function StatCard({ icon: Icon, iconBg, iconColor, value, label, highlight }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconBg)}
        >
          <Icon className={cn('h-5 w-5', iconColor)} aria-hidden="true" />
        </div>
        <div>
          <p
            className={cn(
              'text-xl font-bold leading-none',
              highlight ? 'text-amber-600' : 'text-[var(--color-foreground)]',
            )}
          >
            {value}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{label}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications(user?.id)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/notifications')
    }
  }, [authLoading, user, router])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
      </div>
    )
  }

  const readCount = notifications.length - unreadCount

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Notifications</h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Mark all read
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-muted)]">
            <Bell className="h-8 w-8 text-[var(--color-muted-foreground)]" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            No notifications yet
          </h2>
          <p className="mt-1 max-w-xs text-sm text-[var(--color-muted-foreground)]">
            When buyers express interest or you receive updates, they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <>
          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              icon={Bell}
              iconBg="bg-violet-100"
              iconColor="text-violet-600"
              value={notifications.length}
              label="Total"
            />
            <StatCard
              icon={BellDot}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
              value={unreadCount}
              label="Unread"
              highlight={unreadCount > 0}
            />
            <StatCard
              icon={CheckCheck}
              iconBg="bg-gray-100"
              iconColor="text-gray-500"
              value={readCount}
              label="Read"
            />
          </div>

          {/* ── Notification list ── */}
          <div className="space-y-2">
            {notifications.map((item) => (
              <NotificationCard
                key={item.id}
                item={item}
                onRead={(id) => {
                  void markRead(id)
                  const actionUrl = getNotificationActionUrl(item)
                  if (actionUrl) router.push(actionUrl)
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
