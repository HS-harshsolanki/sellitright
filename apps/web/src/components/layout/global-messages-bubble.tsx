'use client'

import {
  AlertTriangle,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Loader2,
  ArrowLeft,
  Send,
  X,
  Search,
  MoreVertical,
  Ban,
  Flag,
  ShieldOff,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import type { ChatMessage, DisplayMessage } from '@/lib/chat-types'
import { isPhoneWarning } from '@/lib/chat-types'
import type { ChatThreadItem, ThreadsResponse } from '@/app/api/chat/threads/route'
import { containsPhoneNumber, containsPhoneNumberInWindow } from '@/lib/phone-filter'
import { useAuth } from '@/lib/supabase/auth-context'
import { cn } from '@/lib/utils'

function phoneBlockText(offenseNumber: number): string {
  if (offenseNumber >= 3)
    return 'Your account has been automatically restricted after 3 phone-sharing attempts. Only an admin can restore access. Please contact support.'
  if (offenseNumber === 2)
    return `Warning ${offenseNumber}/3: Sharing phone numbers violates our Terms. One more attempt will automatically block your account.`
  return `Warning ${offenseNumber}/3: Phone numbers can't be shared here. Use the Call or WhatsApp buttons after unlocking contact. 3 attempts will block your account.`
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function formatDay(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function groupByDay(
  messages: DisplayMessage[],
): Array<{ day: string; messages: DisplayMessage[] }> {
  const groups: Array<{ day: string; messages: DisplayMessage[] }> = []
  for (const msg of messages) {
    const day = formatDay(msg.createdAt)
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.messages.push(msg)
    else groups.push({ day, messages: [msg] })
  }
  return groups
}

// ── Main component ────────────────────────────────────────────────────────────

export function GlobalMessagesBubble() {
  const { user, loading: authLoading } = useAuth()
  const pathname = usePathname()

  const [open, setOpen] = useState(false)
  const [threads, setThreads] = useState<ChatThreadItem[]>([])
  const [threadsLoading, setThreadsLoading] = useState(false)
  const [threadsError, setThreadsError] = useState<string | null>(null)
  const [totalUnread, setTotalUnread] = useState(0)
  const [activeThread, setActiveThread] = useState<ChatThreadItem | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [threadStatus, setThreadStatus] = useState<'active' | 'locked' | 'disabled'>('active')
  const [msgsLoading, setMsgsLoading] = useState(false)
  const [msgsError, setMsgsError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  // Once a phone block fires the input is locked for the rest of this browser session for that thread
  const [sessionBlocked, setSessionBlocked] = useState(false)
  const [lastOffense, setLastOffense] = useState(0)
  // Warning counts — always driven by DB; refreshed on every poll tick
  const [myOffenseCount, setMyOffenseCount] = useState(0)
  const [otherPartyOffenseCount, setOtherPartyOffenseCount] = useState(0)
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [blockConfirming, setBlockConfirming] = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportSuccess, setReportSuccess] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Tracks last 8 messages sent by this user — used for cross-message window detection
  const recentSentRef = useRef<string[]>([])
  // Tracks accumulated offense count seeded from GET load — used so client-side blocks show correct badge
  const priorOffenseRef = useRef<number>(0)

  const isListingPage = /^\/listing\//.test(pathname)

  // ── Load thread list ────────────────────────────────────────────────────
  const loadThreads = useCallback(async () => {
    if (!user) return
    setThreadsLoading(true)
    setThreadsError(null)
    try {
      const res = await fetch('/api/chat/threads')
      if (!res.ok) {
        setThreadsError('Could not load conversations.')
        return
      }
      const data = (await res.json()) as ThreadsResponse
      setThreads(data.threads)
      setTotalUnread(data.threads.reduce((sum, t) => sum + t.unreadCount, 0))
      setMyOffenseCount(data.myOffenseCount ?? 0)
    } catch {
      setThreadsError('Could not connect. Check your connection.')
    } finally {
      setThreadsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (open && !activeThread) void loadThreads()
  }, [open, activeThread, loadThreads])

  // Unread badge on mount — also seeds global offense count
  useEffect(() => {
    if (!user || open) return
    fetch('/api/chat/threads')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ThreadsResponse | null) => {
        if (!data) return
        setTotalUnread(data.threads.reduce((sum, t) => sum + t.unreadCount, 0))
        setMyOffenseCount(data.myOffenseCount ?? 0)
      })
      .catch(() => {})
  }, [user, open])

  // ── Load messages ───────────────────────────────────────────────────────
  const loadMessages = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!activeThread) return
      if (!opts?.silent) setMsgsLoading(true)
      setMsgsError(null)
      try {
        const res = await fetch(`/api/chat/threads/${activeThread.id}/messages`)
        if (!res.ok) {
          const body = (await res.json()) as { error?: string }
          if (!opts?.silent) setMsgsError(body.error ?? 'Failed to load.')
          return
        }
        const data = (await res.json()) as {
          messages: ChatMessage[]
          threadStatus: string
          otherPartyName: string | null
          priorOffenseCount: number
          isPhoneBlocked: boolean
          otherPartyOffenseCount: number
          otherPartyIsPhoneBlocked: boolean
        }
        // Preserve local phone-warning entries across polls
        setMessages((prev) => {
          const warnings = prev.filter(isPhoneWarning)
          return [...warnings, ...data.messages]
        })
        setThreadStatus((data.threadStatus as 'active' | 'locked' | 'disabled') ?? 'active')

        // Always refresh DB-backed counts on every fetch (initial AND poll)
        const serverCount = data.priorOffenseCount ?? 0
        priorOffenseRef.current = serverCount
        setMyOffenseCount(serverCount)
        setOtherPartyOffenseCount(data.otherPartyOffenseCount ?? 0)

        if (!opts?.silent && user) {
          recentSentRef.current = data.messages
            .filter((m) => m.senderId === user.id && !m.isDeleted)
            .slice(-8)
            .map((m) => m.content)
          // Restore phone-block state from server on initial load
          if (data.isPhoneBlocked) {
            setSessionBlocked(true)
            setLastOffense(serverCount)
          }
        }
      } catch {
        if (!opts?.silent) setMsgsError('Could not connect.')
      } finally {
        if (!opts?.silent) setMsgsLoading(false)
      }
    },
    [activeThread, user],
  )

  useEffect(() => {
    if (!activeThread) return
    void loadMessages()
    pollRef.current = setInterval(() => void loadMessages({ silent: true }), 10_000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [activeThread, loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (activeThread && !msgsLoading) {
      setTimeout(() => textareaRef.current?.focus(), 80)
    }
  }, [activeThread, msgsLoading])

  useEffect(() => {
    if (open && !activeThread) {
      setTimeout(() => searchRef.current?.focus(), 80)
    }
  }, [open, activeThread])

  // ── Phone detection helpers ──────────────────────────────────────────────
  function checkPhoneInWindow(val: string): boolean {
    return containsPhoneNumber(val) || containsPhoneNumberInWindow(recentSentRef.current, val)
  }

  // pushPhoneWarning is called ONLY with server-confirmed offenseNumber values
  function pushPhoneWarning(serverWarningText: string, offenseNumber: number) {
    const warning = {
      id: `warn-${Date.now()}`,
      isPhoneWarning: true as const,
      warningText: serverWarningText,
      offenseNumber,
      createdAt: new Date().toISOString(),
    }
    // Append warning card; only lock and clear history at offense 3+
    const shouldLock = offenseNumber >= 3
    setMessages((prev) =>
      shouldLock ? [warning] : [...prev.filter((m) => !isPhoneWarning(m)), warning],
    )
    if (shouldLock) setSessionBlocked(true)
    setLastOffense(offenseNumber)
    // Update from server-confirmed value
    priorOffenseRef.current = offenseNumber
    setMyOffenseCount(offenseNumber)
    setInput('')
    setSendError(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    // recentSentRef intentionally NOT cleared — preserves cross-message context
  }

  // ── Send ────────────────────────────────────────────────────────────────
  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || !activeThread || sending || sessionBlocked) return
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch(`/api/chat/threads/${activeThread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      })
      const data = (await res.json()) as {
        message?: ChatMessage
        error?: string
        code?: string
        offenseNumber?: number
      }
      if (!res.ok) {
        if (data.code === 'PHONE_NUMBER_BLOCKED' || data.code === 'PHONE_SEND_BLOCKED') {
          // Server confirmed violation — use server's offenseNumber as source of truth
          pushPhoneWarning(
            data.error ?? phoneBlockText(data.offenseNumber ?? 1),
            data.offenseNumber ?? 1,
          )
        } else {
          setSendError(data.error ?? 'Failed to send.')
        }
        return
      }
      if (data.message) {
        setMessages((prev) => [...prev, data.message!])
        recentSentRef.current = [...recentSentRef.current, trimmed].slice(-8)
      }
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch {
      setSendError('Network error.')
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (sessionBlocked) return
    const val = e.target.value
    setInput(val)
    setSendError(null)
    // On typing: if phone detected, clear the input and show a soft inline notice
    // Do NOT change priorOffenseRef or counts — no DB write happened yet
    if (checkPhoneInWindow(val)) {
      setInput('')
      setSendError("Phone numbers can't be shared here. Send the message to record a violation.")
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      return
    }
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 72) + 'px'
    }
  }

  function openThread(t: ChatThreadItem) {
    setActiveThread(t)
    setMessages([])
    setMsgsError(null)
    setInput('')
    setSendError(null)
    setSessionBlocked(false)
    setLastOffense(0)
    recentSentRef.current = []
    priorOffenseRef.current = 0
    setSearch('')
    setMenuOpen(false)
    setBlockConfirming(false)
    setReportModalOpen(false)
    setReportError(null)
    setReportSuccess(false)
    setReportReason('')
    setReportDetails('')
  }

  // Outside-click handler for the ⋮ menu
  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  async function handleBlock() {
    if (!activeThread) return
    setBlockLoading(true)
    try {
      const res = await fetch(`/api/chat/threads/${activeThread.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'disabled' }),
      })
      if (res.ok) {
        setThreadStatus('disabled')
        setThreads((prev) =>
          prev.map((t) => (t.id === activeThread.id ? { ...t, status: 'disabled' as const } : t)),
        )
        setActiveThread((prev) => (prev ? { ...prev, status: 'disabled' as const } : null))
      }
    } finally {
      setBlockLoading(false)
      setBlockConfirming(false)
    }
  }

  async function handleUnblock() {
    if (!activeThread) return
    setBlockLoading(true)
    try {
      const res = await fetch(`/api/chat/threads/${activeThread.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      if (res.ok) {
        setThreadStatus('active')
        setThreads((prev) =>
          prev.map((t) => (t.id === activeThread.id ? { ...t, status: 'active' as const } : t)),
        )
        setActiveThread((prev) => (prev ? { ...prev, status: 'active' as const } : null))
      }
    } finally {
      setBlockLoading(false)
    }
  }

  async function handleReportSubmit() {
    if (!activeThread || !reportReason) return
    setReportSubmitting(true)
    setReportError(null)
    try {
      const res = await fetch(`/api/chat/threads/${activeThread.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reportReason, details: reportDetails.trim() || undefined }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setReportError(data.error ?? 'Failed to submit report.')
        return
      }
      setReportSuccess(true)
      setTimeout(() => {
        setReportModalOpen(false)
        setReportSuccess(false)
        setReportReason('')
        setReportDetails('')
      }, 1500)
    } catch {
      setReportError('Network error.')
    } finally {
      setReportSubmitting(false)
    }
  }

  function closeThread() {
    if (pollRef.current) clearInterval(pollRef.current)
    setActiveThread(null)
    void loadThreads()
  }

  if (authLoading || !user || isListingPage) return null

  const groups = groupByDay(messages)

  // ── Single unified container — pill IS the bottom bar ────────────────────
  // When collapsed: only the pill (h-11) is visible — looks like a tab at the bottom edge.
  // When expanded: panel content appears above the pill inside the same container.
  // The container has rounded top corners always; the pill just sits at the bottom.

  return (
    <>
      <div className="fixed bottom-0 right-6 z-50 flex w-64 flex-col overflow-hidden rounded-tl-2xl rounded-tr-2xl border border-b-0 border-[var(--color-border)] bg-[var(--color-background)] shadow-2xl">
        {/* ── Pill / header — ALWAYS FIRST so it sits at the top when open ── */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close messaging' : 'Messaging'}
          aria-expanded={open}
          className={cn(
            'flex h-11 w-full shrink-0 items-center gap-2.5 px-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]',
            open
              ? 'border-b border-[var(--color-border)] bg-[var(--color-muted)]'
              : 'bg-[var(--color-background)] hover:bg-[var(--color-muted)]',
          )}
        >
          <span className="relative shrink-0">
            <MessageSquare className="h-4 w-4 text-[var(--color-foreground)]" aria-hidden="true" />
            {!open && totalUnread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </span>
          <span className="flex-1 text-left text-sm font-semibold text-[var(--color-foreground)]">
            Messaging
          </span>
          {open && !activeThread && (
            <Link
              href="/messages"
              title="Open full inbox"
              onClick={(e) => e.stopPropagation()}
              className="rounded-md p-1 text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-border)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
          {open ? (
            <ChevronDown
              className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]"
              aria-hidden="true"
            />
          ) : (
            <ChevronUp
              className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]"
              aria-hidden="true"
            />
          )}
        </button>

        {/* ── Panel content — below the header when open ─────────────────── */}
        {open && (
          <div className="flex flex-col" style={{ height: activeThread ? 420 : 380 }}>
            {/* ── Thread list ──────────────────────────────────────────── */}
            {!activeThread && (
              <>
                <div className="shrink-0 border-b border-[var(--color-border)] px-3 py-2">
                  <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-2.5 py-1.5">
                    <Search
                      className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]"
                      aria-hidden="true"
                    />
                    <input
                      ref={searchRef}
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search conversations…"
                      className="flex-1 bg-transparent text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {threadsLoading ? (
                  <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--color-muted-foreground)]" />
                  </div>
                ) : threadsError ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 p-5 text-center">
                    <p className="text-xs text-[var(--color-muted-foreground)]">{threadsError}</p>
                    <button
                      type="button"
                      onClick={() => void loadThreads()}
                      className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 text-xs font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)]"
                    >
                      Try again
                    </button>
                  </div>
                ) : threads.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 p-5 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-muted)]">
                      <MessageSquare className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-foreground)]">
                        No conversations yet
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                        Request contact on a listing to start chatting.
                      </p>
                    </div>
                    <Link
                      href="/properties"
                      className="flex h-9 w-full items-center justify-center rounded-xl bg-[var(--color-foreground)] text-sm font-semibold text-[var(--color-background)] transition hover:opacity-90"
                    >
                      Browse listings
                    </Link>
                  </div>
                ) : (
                  (() => {
                    const filtered = threads.filter((t) => {
                      if (!search.trim()) return true
                      const q = search.toLowerCase()
                      return (
                        (t.listingTitle ?? '').toLowerCase().includes(q) ||
                        (t.listingCity ?? '').toLowerCase().includes(q)
                      )
                    })
                    return filtered.length === 0 ? (
                      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center">
                        <p className="text-sm font-medium text-[var(--color-foreground)]">
                          No results
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          No conversations match &ldquo;{search}&rdquo;
                        </p>
                        <button
                          type="button"
                          onClick={() => setSearch('')}
                          className="mt-1 text-xs text-[var(--color-foreground)] underline underline-offset-2"
                        >
                          Clear search
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 divide-y divide-[var(--color-border)] overflow-y-auto">
                        {filtered.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => openThread(t)}
                            className="flex w-full items-start gap-2.5 px-3 py-3 text-left transition hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)] text-xs font-semibold text-[var(--color-foreground)] ring-1 ring-[var(--color-border)]">
                              {t.otherPartyInitials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-1">
                                <div className="flex min-w-0 items-center gap-1">
                                  <span className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                                    {t.otherPartyName ?? (t.role === 'buyer' ? 'Seller' : 'Buyer')}
                                  </span>
                                  {t.status === 'disabled' && t.role === 'seller' && (
                                    <span className="shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-semibold text-orange-800">
                                      Blocked
                                    </span>
                                  )}
                                </div>
                                <span className="shrink-0 text-[10px] text-[var(--color-muted-foreground)]">
                                  {formatRelative(t.lastMessageAt)}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-[var(--color-muted-foreground)]">
                                {t.listingTitle ?? 'Property'}
                                {t.listingCity ? ` · ${t.listingCity}` : ''}
                              </p>
                            </div>
                            {t.unreadCount > 0 && t.status !== 'disabled' && (
                              <span className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-foreground)] text-[9px] font-bold text-[var(--color-background)]">
                                {t.unreadCount > 9 ? '9+' : t.unreadCount}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )
                  })()
                )}
              </>
            )}

            {/* ── Inline chat ────────────────────────────────────────────── */}
            {activeThread && (
              <>
                <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--color-border)] px-3">
                  <button
                    type="button"
                    onClick={closeThread}
                    className="rounded-lg p-1 text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                      {activeThread.otherPartyName ??
                        (activeThread.role === 'buyer' ? 'Seller' : 'Buyer')}
                    </p>
                    <p className="truncate text-[10px] leading-none text-[var(--color-muted-foreground)]">
                      {activeThread.listingTitle ?? 'Property'}
                    </p>
                  </div>
                  {activeThread.role === 'seller' && (
                    <div className="relative" ref={menuRef}>
                      <button
                        type="button"
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-label="Thread options"
                        className="rounded-lg p-1 text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuOpen && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] shadow-lg">
                          {threadStatus === 'disabled' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpen(false)
                                void handleUnblock()
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                            >
                              <ShieldOff className="h-3.5 w-3.5 text-green-600" />
                              Unblock Buyer
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpen(false)
                                setBlockConfirming(true)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-red-700 hover:bg-red-50"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Block Buyer
                            </button>
                          )}
                          <div className="h-px bg-[var(--color-border)]" />
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpen(false)
                              setReportModalOpen(true)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                          >
                            <Flag className="h-3.5 w-3.5 text-amber-600" />
                            Report Buyer
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <Link
                    href={`/messages/${activeThread.interestId}`}
                    title="Open full chat"
                    className="rounded-lg p-1 text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Block confirm strip */}
                {blockConfirming && (
                  <div className="shrink-0 border-b border-orange-200 bg-orange-50 px-3 py-2.5">
                    <p className="text-[11px] font-semibold text-orange-900">Block this buyer?</p>
                    <p className="mt-0.5 text-[10px] text-orange-700">
                      They won&apos;t be able to send messages. You can unblock anytime.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={blockLoading}
                        onClick={() => void handleBlock()}
                        className="flex h-7 items-center gap-1 rounded-lg border border-red-400 bg-red-50 px-2.5 text-[10px] font-semibold text-red-800 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        {blockLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                        Yes, Block
                      </button>
                      <button
                        type="button"
                        onClick={() => setBlockConfirming(false)}
                        className="flex h-7 items-center rounded-lg border border-[var(--color-border)] px-2.5 text-[10px] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {msgsLoading ? (
                  <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--color-muted-foreground)]" />
                  </div>
                ) : msgsError ? (
                  <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-red-600">
                    {msgsError}
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto px-3 py-2">
                    {messages.filter((m) => !isPhoneWarning(m)).length === 0 && (
                      <div className="flex justify-center py-4">
                        <span className="rounded-full bg-[var(--color-muted)] px-3 py-1 text-[10px] text-[var(--color-muted-foreground)]">
                          Say hello!
                        </span>
                      </div>
                    )}
                    {groups.map(({ day, messages: dayMsgs }) => (
                      <div key={day}>
                        <div className="my-2 flex items-center gap-1.5">
                          <div className="h-px flex-1 bg-[var(--color-border)]" />
                          <span className="text-[9px] text-[var(--color-muted-foreground)]">
                            {day}
                          </span>
                          <div className="h-px flex-1 bg-[var(--color-border)]" />
                        </div>
                        <div className="space-y-0.5">
                          {dayMsgs.map((msg, idx) => {
                            // ── Phone-block inline warning card ──────────────
                            if (isPhoneWarning(msg)) {
                              const isFinal = msg.offenseNumber >= 3
                              return (
                                <div key={msg.id} className="my-2 flex justify-center">
                                  <div
                                    className={`flex w-full flex-col gap-1.5 rounded-xl border px-2.5 py-2 ${isFinal ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}
                                  >
                                    <div className="flex items-start gap-1.5">
                                      <AlertTriangle
                                        className={`mt-0.5 h-3 w-3 shrink-0 ${isFinal ? 'text-red-500' : 'text-amber-500'}`}
                                        aria-hidden="true"
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                          <p
                                            className={`text-[10px] font-semibold ${isFinal ? 'text-red-800' : 'text-amber-800'}`}
                                          >
                                            {isFinal ? 'Account Restricted' : 'Phone blocked'}
                                          </p>
                                          <span
                                            className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${isFinal ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'}`}
                                          >
                                            {msg.offenseNumber >= 3
                                              ? 'BLOCKED'
                                              : `${msg.offenseNumber}/3`}
                                          </span>
                                        </div>
                                        <p
                                          className={`mt-0.5 text-[10px] leading-snug ${isFinal ? 'text-red-700' : 'text-amber-700'}`}
                                        >
                                          {msg.warningText}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            }

                            // ── Regular chat bubble ───────────────────────────
                            const isOwn = msg.senderId === user.id
                            const nextMsg = dayMsgs[idx + 1]
                            const isLast =
                              idx === dayMsgs.length - 1 ||
                              isPhoneWarning(nextMsg!) ||
                              (nextMsg as ChatMessage | undefined)?.senderId !== msg.senderId
                            return (
                              <div key={msg.id}>
                                <div
                                  className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                                >
                                  <div
                                    className={cn(
                                      'max-w-[85%] rounded-2xl px-3 py-1.5 text-xs leading-relaxed',
                                      isOwn
                                        ? 'rounded-br-sm bg-[var(--color-foreground)] text-[var(--color-background)]'
                                        : 'rounded-bl-sm bg-[var(--color-muted)] text-[var(--color-foreground)]',
                                      msg.isDeleted && 'italic opacity-50',
                                    )}
                                  >
                                    {msg.content}
                                  </div>
                                </div>
                                {isLast && (
                                  <div
                                    className={cn(
                                      'mb-1 mt-0.5 text-[9px] text-[var(--color-muted-foreground)]',
                                      isOwn ? 'text-right' : 'text-left',
                                    )}
                                  >
                                    {formatTime(msg.createdAt)}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}

                {threadStatus === 'locked' && (
                  <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-1.5 text-center text-[10px] text-[var(--color-muted-foreground)]">
                    Listing inactive — no new messages.
                  </div>
                )}
                {threadStatus === 'disabled' && activeThread.role === 'seller' && (
                  <div className="shrink-0 border-t border-orange-200 bg-orange-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] text-orange-800">You have blocked this buyer.</p>
                      <button
                        type="button"
                        onClick={() => void handleUnblock()}
                        disabled={blockLoading}
                        className="text-[10px] font-semibold text-[var(--color-foreground)] underline underline-offset-2 disabled:opacity-50"
                      >
                        Unblock
                      </button>
                    </div>
                  </div>
                )}
                {threadStatus === 'disabled' && activeThread.role === 'buyer' && (
                  <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-1.5 text-center text-[10px] text-[var(--color-muted-foreground)]">
                    Chat unavailable.
                  </div>
                )}
                {sendError && !sessionBlocked && (
                  <div className="shrink-0 border-t border-red-200 bg-red-50 px-3 py-1.5">
                    <p className="text-[10px] text-red-700">{sendError}</p>
                  </div>
                )}

                {/* Input bar — session lock replaces textarea entirely */}
                {threadStatus === 'active' &&
                  (sessionBlocked ? (
                    <div
                      className={`shrink-0 border-t px-3 py-2 ${lastOffense >= 3 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${lastOffense >= 3 ? 'text-red-500' : 'text-amber-500'}`}
                          aria-hidden="true"
                        />
                        <div>
                          <p
                            className={`text-[10px] font-semibold ${lastOffense >= 3 ? 'text-red-800' : 'text-amber-800'}`}
                          >
                            {lastOffense >= 3 ? 'Account restricted' : 'Chat locked'}
                          </p>
                          <p
                            className={`mt-0.5 text-[10px] ${lastOffense >= 3 ? 'text-red-700' : 'text-amber-700'}`}
                          >
                            {lastOffense >= 3
                              ? 'Automatically restricted after 3 attempts. Contact support.'
                              : 'Phone number detected. Use the Call or WhatsApp buttons. Refresh to reset.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex shrink-0 items-end gap-2 border-t border-[var(--color-border)] px-3 py-2">
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Write a message…"
                        rows={1}
                        disabled={sending}
                        style={{ maxHeight: 72 }}
                        className="flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] px-2.5 py-1.5 text-xs placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSend()}
                        disabled={sending || !input.trim()}
                        className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-foreground)] text-[var(--color-background)] transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:opacity-40"
                        aria-label="Send"
                      >
                        {sending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Report buyer dialog */}
      <Dialog
        open={reportModalOpen}
        onOpenChange={(o) => {
          if (!o) {
            setReportModalOpen(false)
            setReportError(null)
            setReportSuccess(false)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Buyer</DialogTitle>
            <DialogDescription>
              This report will be reviewed by our team. The buyer will not be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 pb-2">
            {reportSuccess ? (
              <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                Report submitted. Our team will review it shortly.
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--color-foreground)]">
                    Reason
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                  >
                    <option value="">Select a reason…</option>
                    <option value="SPAM_REQUESTS">Spam requests</option>
                    <option value="BROKER_SUSPECTED">Suspected broker</option>
                    <option value="ABUSIVE_BEHAVIOR">Abusive behavior</option>
                    <option value="FAKE_DETAILS">Fake details</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--color-foreground)]">
                    Details{' '}
                    <span className="font-normal text-[var(--color-muted-foreground)]">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value.slice(0, 500))}
                    placeholder="Describe what happened…"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-sm placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                  />
                  <p className="text-right text-[10px] text-[var(--color-muted-foreground)]">
                    {reportDetails.length}/500
                  </p>
                </div>
                {reportError && <p className="text-xs text-red-600">{reportError}</p>}
              </>
            )}
          </div>
          {!reportSuccess && (
            <DialogFooter>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reportReason || reportSubmitting}
                onClick={() => void handleReportSubmit()}
                className="rounded-xl bg-[var(--color-foreground)] px-4 py-2 text-sm font-semibold text-[var(--color-background)] disabled:opacity-40"
              >
                {reportSubmitting ? 'Submitting…' : 'Submit Report'}
              </button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
