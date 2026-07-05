'use client'

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Loader2,
  MessageSquare,
  Send,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { ChatMessage, DisplayMessage } from '@/lib/chat-types'
import { isPhoneWarning } from '@/lib/chat-types'
import { RequestContactModal } from '@/components/listing/request-contact-modal'
import { containsPhoneNumber, containsPhoneNumberInWindow } from '@/lib/phone-filter'
import { useAuth } from '@/lib/supabase/auth-context'
import { cn } from '@/lib/utils'

// ── Date/time helpers (mirrors messages/[interestId]/page.tsx) ──────────────

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
    if (last && last.day === day) {
      last.messages.push(msg)
    } else {
      groups.push({ day, messages: [msg] })
    }
  }
  return groups
}

// ── Sub-components (defined outside ChatBubble for stable identity) ─────────

interface ChatInputBarProps {
  value: string
  sending: boolean
  phoneWarning: string | null
  sendError: string | null
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  onDismissWarning: () => void
}

function ChatInputBar({
  value,
  sending,
  phoneWarning,
  sendError,
  textareaRef,
  onChange,
  onKeyDown,
  onSend,
  onDismissWarning,
}: ChatInputBarProps) {
  return (
    <div className="shrink-0 border-t border-[var(--color-border)]">
      {phoneWarning && (
        <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-800">{phoneWarning}</p>
          <button
            type="button"
            onClick={onDismissWarning}
            className="ml-2 text-amber-600 hover:text-amber-800"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {sendError && !phoneWarning && (
        <div className="border-b border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs text-red-700">{sendError}</p>
        </div>
      )}
      <div className="flex items-end gap-2 px-3 py-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Type a message…"
          rows={1}
          disabled={sending}
          style={{ maxHeight: 96 }}
          className="flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={sending || !value.trim() || !!phoneWarning}
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-foreground)] text-[var(--color-background)] transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:opacity-40"
          aria-label="Send message"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  )
}

interface MessageListProps {
  messages: DisplayMessage[]
  authLoading: boolean
  resolving: boolean
  loading: boolean
  fetchError: string | null
  myUserId: string | null
  threadStatus: 'active' | 'locked' | 'disabled'
  messagesEndRef: React.RefObject<HTMLDivElement | null>
}

function MessageList({
  messages,
  authLoading,
  resolving,
  loading,
  fetchError,
  myUserId,
  threadStatus,
  messagesEndRef,
}: MessageListProps) {
  // Wait until auth resolves and thread + messages are loaded — prevents isMe race
  if (authLoading || resolving || loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-muted-foreground)]" />
      </div>
    )
  }
  if (fetchError) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-red-600">
        {fetchError}
      </div>
    )
  }

  const groups = groupByDay(messages)
  const hasRealMessages = messages.some((m) => !isPhoneWarning(m))

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3">
      {!hasRealMessages && (
        <div className="flex justify-center py-6">
          <span className="rounded-full bg-[var(--color-muted)] px-3 py-1.5 text-center text-xs text-[var(--color-muted-foreground)]">
            <CheckCircle2 className="mr-1 inline h-3 w-3 text-emerald-500" />
            Owner accepted · Say hello!
          </span>
        </div>
      )}

      {groups.map(({ day, messages: dayMsgs }) => (
        <div key={day}>
          <div className="my-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-[var(--color-border)]" />
            <span className="text-[10px] text-[var(--color-muted-foreground)]">{day}</span>
            <div className="h-px flex-1 bg-[var(--color-border)]" />
          </div>

          <div className="space-y-0.5">
            {dayMsgs.map((msg, idx) => {
              // ── Phone-block inline warning card ──────────────────────────
              if (isPhoneWarning(msg)) {
                return (
                  <div key={msg.id} className="my-2 flex justify-center">
                    <div className="flex max-w-[85%] items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                      <AlertTriangle
                        className="h-3.5 w-3.5 shrink-0 text-amber-500"
                        aria-hidden="true"
                      />
                      <p className="text-xs text-amber-800">{msg.warningText}</p>
                    </div>
                  </div>
                )
              }

              // ── Regular chat bubble ───────────────────────────────────────
              const isOwn = myUserId ? msg.senderId === myUserId : false
              const nextMsg = dayMsgs[idx + 1]
              const isLast =
                idx === dayMsgs.length - 1 ||
                isPhoneWarning(nextMsg!) ||
                (nextMsg as ChatMessage | undefined)?.senderId !== msg.senderId
              return (
                <div key={msg.id}>
                  <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[78%] rounded-2xl px-3 py-2 text-sm',
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
                        'mb-1 mt-0.5 text-[10px] text-[var(--color-muted-foreground)]',
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

      {threadStatus === 'locked' && (
        <div className="mt-3 rounded-lg bg-[var(--color-muted)] px-3 py-2 text-center text-xs text-[var(--color-muted-foreground)]">
          This listing is no longer active. No new messages can be sent.
        </div>
      )}
      {threadStatus === 'disabled' && (
        <div className="mt-3 rounded-lg bg-[var(--color-muted)] px-3 py-2 text-center text-xs text-[var(--color-muted-foreground)]">
          Chat unavailable.
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}

// ── Props ────────────────────────────────────────────────────────────────────

interface ChatBubbleProps {
  listingId: string
  listingTitle: string
  interestId: string | null
  interestStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED' | null
  isOwner: boolean
  isAuthenticated: boolean
}

// ── Main component ───────────────────────────────────────────────────────────

export function ChatBubble({
  listingId,
  listingTitle,
  interestId,
  interestStatus,
  isOwner,
  isAuthenticated,
}: ChatBubbleProps) {
  const [open, setOpen] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [threadStatus, setThreadStatus] = useState<'active' | 'locked' | 'disabled'>('active')
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  // resolving = threadId fetch in-flight; loading = messages fetch in-flight
  const [resolving, setResolving] = useState(interestStatus === 'ACCEPTED')
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [phoneWarning, setPhoneWarning] = useState<string | null>(null)
  // Once a phone block fires the input is locked for the rest of this browser session
  const [sessionBlocked, setSessionBlocked] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [localInterestStatus, setLocalInterestStatus] = useState(interestStatus)

  // authLoading is critical — don't compute isMe until user is resolved
  const { user, loading: authLoading } = useAuth()
  const myUserId = user?.id ?? null

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevMessageCountRef = useRef(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Tracks last 8 messages sent by this user — used for cross-message window detection
  const recentSentRef = useRef<string[]>([])

  // Resolve threadId when interest is accepted
  useEffect(() => {
    if (localInterestStatus !== 'ACCEPTED' || !interestId) {
      setResolving(false)
      return
    }
    let cancelled = false
    async function resolveThread() {
      try {
        const res = await fetch(`/api/chat/by-interest/${interestId}`)
        if (cancelled || !res.ok) {
          if (!cancelled) setResolving(false)
          return
        }
        const data = (await res.json()) as { threadId?: string }
        if (cancelled) return
        if (data.threadId) setThreadId(data.threadId)
      } catch {
        // non-critical
      } finally {
        if (!cancelled) setResolving(false)
      }
    }
    void resolveThread()
    return () => {
      cancelled = true
    }
  }, [interestId, localInterestStatus])

  const loadMessages = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!threadId) return
      if (!opts?.silent) setLoading(true)
      setFetchError(null)
      try {
        const res = await fetch(`/api/chat/threads/${threadId}/messages`)
        if (!res.ok) {
          const body = (await res.json()) as { error?: string }
          if (!opts?.silent) setFetchError(body.error ?? 'Failed to load messages.')
          return
        }
        const data = (await res.json()) as {
          messages: ChatMessage[]
          role: string
          threadStatus: string
        }
        // On poll: preserve existing LocalPhoneWarning entries, replace server messages
        setMessages((prev) => {
          const warnings = prev.filter(isPhoneWarning)
          return [...warnings, ...data.messages]
        })
        setThreadStatus((data.threadStatus as 'active' | 'locked' | 'disabled') ?? 'active')
        prevMessageCountRef.current = data.messages.length
        setUnreadCount(0)
        // Seed recentSentRef from history — only real ChatMessages, never warnings
        if (myUserId) {
          recentSentRef.current = data.messages
            .filter((m) => m.senderId === myUserId && !m.isDeleted)
            .slice(-8)
            .map((m) => m.content)
        }
      } catch {
        if (!opts?.silent) setFetchError('Could not connect.')
      } finally {
        if (!opts?.silent) setLoading(false)
      }
    },
    [threadId],
  )

  // Initial load + poll every 10s while open
  useEffect(() => {
    if (!open || !threadId) return
    void loadMessages()

    pollRef.current = setInterval(() => {
      void loadMessages({ silent: true })
    }, 10_000)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [open, threadId, loadMessages])

  // Auto-focus textarea once everything is ready
  useEffect(() => {
    if (!open || localInterestStatus !== 'ACCEPTED' || authLoading || resolving || loading) return
    const t = setTimeout(() => textareaRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [open, localInterestStatus, authLoading, resolving, loading])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Track unread while closed — count only real ChatMessages, not local warning cards
  useEffect(() => {
    if (!open) {
      const realCount = messages.filter((m) => !isPhoneWarning(m)).length
      const newCount = realCount - prevMessageCountRef.current
      if (newCount > 0) {
        setUnreadCount((c) => c + newCount)
        prevMessageCountRef.current = realCount
      }
    }
  }, [messages, open])

  function checkPhoneInWindow(val: string): boolean {
    return containsPhoneNumber(val) || containsPhoneNumberInWindow(recentSentRef.current, val)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (sessionBlocked) return
    const val = e.target.value
    setInput(val)
    setSendError(null)
    // On typing: if phone detected, clear input + show soft notice — no count change, no API call
    if (checkPhoneInWindow(val)) {
      setInput('')
      setSendError("Phone numbers can't be shared here. Send the message to record a violation.")
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      return
    }
    setPhoneWarning(null)

    // Auto-resize up to 3 lines
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 96) + 'px'
    }
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
    setMessages((prev) => [...prev, warning])
    if (offenseNumber >= 3) setSessionBlocked(true)
    setInput('')
    setPhoneWarning(null)
    setSendError(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    // recentSentRef is intentionally NOT cleared — preserves cross-message context
  }

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || !threadId || sending || sessionBlocked) return
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch(`/api/chat/threads/${threadId}/messages`, {
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
          pushPhoneWarning(
            data.error ?? `Warning ${data.offenseNumber ?? 1}/3: Phone number detected.`,
            data.offenseNumber ?? 1,
          )
        } else {
          setSendError(data.error ?? 'Failed to send.')
        }
        return
      }
      if (data.message) {
        setMessages((prev) => [...prev, data.message!])
        prevMessageCountRef.current += 1
        recentSentRef.current = [...recentSentRef.current, trimmed].slice(-8)
      }
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch {
      setSendError('Network error. Try again.')
    } finally {
      setSending(false)
      if (!sessionBlocked) textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  // ── Contextual tab label ─────────────────────────────────────────────────
  const tabLabel = isOwner
    ? 'View buyer messages'
    : localInterestStatus === 'ACCEPTED'
      ? 'Chat with owner'
      : localInterestStatus === 'PENDING'
        ? 'Request sent · Waiting'
        : localInterestStatus === 'DECLINED'
          ? 'Request declined'
          : 'Message owner'

  const panelTitle = isOwner
    ? 'Buyer messages'
    : localInterestStatus === 'ACCEPTED'
      ? 'Chat with owner'
      : 'Messaging'

  // ── Panel body content ────────────────────────────────────────────────────
  let panelBody: React.ReactNode

  if (isOwner) {
    panelBody = (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-muted)]">
          <MessageSquare className="h-6 w-6 text-[var(--color-muted-foreground)]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">Your listing</p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            View messages from interested buyers in your dashboard.
          </p>
        </div>
        <Link
          href="/messages"
          className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-foreground)] text-sm font-semibold text-[var(--color-background)] transition hover:opacity-90"
        >
          View messages
        </Link>
      </div>
    )
  } else if (!isAuthenticated) {
    panelBody = (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-muted)]">
          <MessageSquare className="h-6 w-6 text-[var(--color-muted-foreground)]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">Sign in to message</p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            Sign in to send a contact request and chat directly with the owner.
          </p>
        </div>
        <Link
          href={`/login?next=/listing/${listingId}`}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-foreground)] text-sm font-semibold text-[var(--color-background)] transition hover:opacity-90"
        >
          Sign in
        </Link>
      </div>
    )
  } else if (!localInterestStatus) {
    panelBody = (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-muted)]">
          <MessageSquare className="h-6 w-6 text-[var(--color-muted-foreground)]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            Request contact to chat
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            Send a free contact request. Once the owner accepts, you can message them here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-foreground)] text-sm font-semibold text-[var(--color-background)] transition hover:opacity-90"
        >
          Request Contact — Free
        </button>
      </div>
    )
  } else if (localInterestStatus === 'PENDING') {
    panelBody = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <Clock className="h-6 w-6 text-amber-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">Waiting for owner</p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            Your request has been sent. You&apos;ll be notified when the owner accepts — then you
            can chat here.
          </p>
        </div>
      </div>
    )
  } else if (localInterestStatus === 'DECLINED') {
    panelBody = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-muted)]">
          <MessageSquare className="h-6 w-6 text-[var(--color-muted-foreground)]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">Request declined</p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            The owner chose not to accept this request.
          </p>
        </div>
      </div>
    )
  } else {
    // ACCEPTED — full chat
    panelBody = (
      <>
        <MessageList
          messages={messages}
          authLoading={authLoading}
          resolving={resolving}
          loading={loading}
          fetchError={fetchError}
          myUserId={myUserId}
          threadStatus={threadStatus}
          messagesEndRef={messagesEndRef}
        />
        {!authLoading &&
          !resolving &&
          !loading &&
          threadStatus === 'active' &&
          (sessionBlocked ? (
            // ── Session-locked state — input removed from DOM entirely ──
            <div className="shrink-0 border-t border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs font-semibold text-amber-800">
                    Chat locked for this session
                  </p>
                  <p className="mt-0.5 text-xs text-amber-700">
                    Phone number detected. Use the Call or WhatsApp buttons to connect after
                    unlocking contact. Refresh the page to reset.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <ChatInputBar
              value={input}
              sending={sending}
              phoneWarning={phoneWarning}
              sendError={sendError}
              textareaRef={textareaRef}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onSend={() => void handleSend()}
              onDismissWarning={() => setPhoneWarning(null)}
            />
          ))}
      </>
    )
  }

  return (
    <div className="hidden lg:block">
      {/* ── Expanded panel — sits directly above the tab ───────────────── */}
      {open && (
        <div
          className="fixed bottom-11 right-6 z-50 flex h-[480px] w-[360px] flex-col overflow-hidden rounded-tl-2xl rounded-tr-2xl border border-b-0 border-[var(--color-border)] bg-[var(--color-background)] shadow-2xl"
          role="dialog"
          aria-label={panelTitle}
        >
          {/* Panel header */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
            <span className="text-sm font-semibold text-[var(--color-foreground)]">
              {panelTitle}
            </span>
            <div className="flex items-center gap-1">
              {localInterestStatus === 'ACCEPTED' && interestId && (
                <Link
                  href={`/messages/${interestId}`}
                  title="Open full conversation"
                  className="rounded-lg p-1.5 text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>

          {panelBody}
        </div>
      )}

      {/* ── LinkedIn-style pill tab trigger ────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close messaging' : tabLabel}
        aria-expanded={open}
        className={`fixed bottom-0 right-6 z-50 flex h-11 w-64 items-center gap-2.5 rounded-tl-2xl rounded-tr-2xl border border-b-0 px-4 shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 ${
          open
            ? 'border-[var(--color-border)] bg-[var(--color-muted)]'
            : 'border-[var(--color-border)] bg-[var(--color-background)] hover:bg-[var(--color-muted)]'
        }`}
      >
        <span className="relative shrink-0">
          <MessageSquare className="h-4 w-4 text-[var(--color-foreground)]" aria-hidden="true" />
          {!open && unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>

        <span className="flex-1 truncate text-left text-sm font-semibold text-[var(--color-foreground)]">
          {tabLabel}
        </span>

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

      {/* Request contact modal */}
      {isAuthenticated && !isOwner && (
        <RequestContactModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={() => {
            setLocalInterestStatus('PENDING')
            setModalOpen(false)
          }}
          onWithdraw={() => {
            setLocalInterestStatus(null)
            setModalOpen(false)
          }}
          viewExisting={localInterestStatus === 'PENDING'}
          listingId={listingId}
          listingTitle={listingTitle}
        />
      )}
    </div>
  )
}
