'use client'

import { ArrowRight, MessageSquare, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import type { ChatThreadItem } from '@/app/api/chat/threads/route'
import { useAuth } from '@/lib/supabase/auth-context'
import { cn } from '@/lib/utils'

function relativeDate(iso: string | null): string {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] py-20 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-muted)]">
        <MessageSquare
          className="h-7 w-7 text-[var(--color-muted-foreground)]"
          aria-hidden="true"
        />
      </div>
      <h3 className="text-base font-semibold text-[var(--color-foreground)]">
        No conversations yet
      </h3>
      <p className="mt-1.5 max-w-xs text-sm text-[var(--color-muted-foreground)]">
        Once a seller accepts your interest, you can message them here.
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

export default function MessagesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [threads, setThreads] = useState<ChatThreadItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/messages')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    fetch('/api/chat/threads')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: { threads: ChatThreadItem[] }) => setThreads(json.threads))
      .catch(() => setError('Failed to load conversations. Please refresh.'))
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-foreground)] sm:text-2xl">Messages</h1>
        <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
          Conversations with buyers and sellers
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {threads.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-white">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              href={`/messages/${thread.interestId}`}
              className="flex items-center gap-4 px-4 py-4 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-[var(--color-muted)]"
            >
              {/* Icon / avatar placeholder */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-muted)]">
                <MessageSquare className="h-5 w-5 text-[var(--color-muted-foreground)]" />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                    {thread.otherPartyName ?? (thread.role === 'buyer' ? 'Seller' : 'Buyer')}
                  </p>
                  {thread.lastMessageAt && (
                    <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
                      {relativeDate(thread.lastMessageAt)}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                  {thread.listingTitle ?? 'Property'}
                  {thread.listingCity ? ` · ${thread.listingCity}` : ''}
                </p>
              </div>

              {/* Unread badge */}
              {thread.unreadCount > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-foreground)] px-1 text-[10px] font-bold text-white">
                  {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
