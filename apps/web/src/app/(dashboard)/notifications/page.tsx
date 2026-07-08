'use client'

import {
  Bell,
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

function getNotificationActionUrl(item: {
  type: string
  entityType?: string | null
  entityId?: string | null
}): string | null {
  if (item.type === 'InterestRequest') {
    return '/dashboard?tab=buyers'
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

function TypeIcon({ type }: { type: string }) {
  const cls = 'h-5 w-5 shrink-0'
  switch (type) {
    case 'InterestRequest':
      return <MessageSquare className={`${cls} text-blue-500`} aria-hidden="true" />
    case 'Accepted':
      return <CheckCircle2 className={`${cls} text-emerald-500`} aria-hidden="true" />
    case 'Rejected':
      return <XCircle className={`${cls} text-red-500`} aria-hidden="true" />
    case 'PaymentReceived':
      return <IndianRupee className={`${cls} text-emerald-600`} aria-hidden="true" />
    case 'ConnectionUnlocked':
      return <Phone className={`${cls} text-emerald-500`} aria-hidden="true" />
    default:
      return <Info className={`${cls} text-[var(--color-muted-foreground)]`} aria-hidden="true" />
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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
        'flex w-full items-start gap-4 rounded-xl border border-[var(--color-border)] p-4 text-left transition-colors hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
        !item.read && 'bg-[var(--color-muted)]',
      )}
    >
      <span className="mt-0.5">
        <TypeIcon type={item.type} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="text-sm font-semibold text-[var(--color-foreground)]">{item.title}</span>
          <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
            {formatDate(item.createdAt)}
          </span>
        </span>
        <span className="mt-1 block text-sm text-[var(--color-muted-foreground)]">
          {item.message}
        </span>
      </span>
      {!item.read && (
        <span
          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-accent)]"
          aria-hidden="true"
        />
      )}
    </button>
  )
}

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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-foreground)] sm:text-2xl">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Mark all read
          </button>
        )}
      </div>

      {/* Content */}
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
      )}
    </div>
  )
}
