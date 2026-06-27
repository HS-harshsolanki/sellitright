'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Phone,
  Info,
  IndianRupee,
  CheckCheck,
} from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import type { NotificationItem } from '@/hooks/use-notifications'

interface NotificationBellProps {
  userId: string
}

// ── Type icon mapping ─────────────────────────────────────────────────────────

function TypeIcon({ type }: { type: string }) {
  const cls = 'h-4 w-4 shrink-0'
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

// ── Relative time helper ──────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ── Notification row ──────────────────────────────────────────────────────────

interface NotificationRowProps {
  item: NotificationItem
  onRead: (id: string) => void
}

function NotificationRow({ item, onRead }: NotificationRowProps) {
  return (
    <button
      type="button"
      onClick={() => onRead(item.id)}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)] ${
        !item.read ? 'bg-[var(--color-muted)]' : ''
      }`}
    >
      <span className="mt-0.5 shrink-0">
        <TypeIcon type={item.type} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-[var(--color-foreground)]">
            {item.title}
          </span>
          <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
            {relativeTime(item.createdAt)}
          </span>
        </span>
        <span className="mt-0.5 line-clamp-2 text-xs text-[var(--color-muted-foreground)]">
          {item.message}
        </span>
      </span>
      {!item.read && (
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent)]"
          aria-hidden="true"
        />
      )}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(userId)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `Notifications — ${badgeLabel} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-bold leading-none text-white"
          >
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications panel"
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] shadow-lg sm:w-96"
        >
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--color-foreground)]">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <Bell
                  className="mb-3 h-8 w-8 text-[var(--color-muted-foreground)]"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  No notifications yet
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                  Activity on your listings will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {notifications.map((item) => (
                  <NotificationRow key={item.id} item={item} onRead={(id) => void markRead(id)} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--color-border)] px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
