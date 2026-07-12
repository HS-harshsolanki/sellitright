'use client'

import { AlertTriangle, ArrowLeft, Loader2, Send } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { WarningBadge } from '@/components/ui/warning-badge'
import type { ChatMessage, DisplayMessage } from '@/lib/chat-types'
import { isPhoneWarning } from '@/lib/chat-types'
import { containsPhoneNumber, containsPhoneNumberInWindow } from '@/lib/phone-filter'
import { useAuth } from '@/lib/supabase/auth-context'
import { cn } from '@/lib/utils'

function phoneBlockText(offenseNumber: number): string {
  if (offenseNumber >= 3)
    return 'Your account has been automatically restricted after 3 phone-sharing attempts. Only an admin can restore access.'
  if (offenseNumber === 2)
    return `Warning ${offenseNumber}/3: Sharing phone numbers violates our Terms. One more attempt will automatically block your account.`
  return `Warning ${offenseNumber}/3: Phone numbers can't be shared here. Use the Call or WhatsApp buttons after unlocking contact.`
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

export default function ChatThreadPage() {
  const params = useParams()
  const interestId = params.interestId as string
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [threadId, setThreadId] = useState<string | null>(null)
  const [threadStatus, setThreadStatus] = useState<'active' | 'locked' | 'disabled'>('active')
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer')
  const [otherPartyName, setOtherPartyName] = useState<string | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [myOffenseCount, setMyOffenseCount] = useState(0)
  const [otherPartyOffenseCount, setOtherPartyOffenseCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sessionBlocked, setSessionBlocked] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const priorOffenseRef = useRef<number>(0)
  const recentSentRef = useRef<string[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user || !interestId) return
    fetch(`/api/chat/by-interest/${interestId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((json: { threadId: string }) => setThreadId(json.threadId))
      .catch(() => setFetchError('Conversation not available.'))
  }, [user, interestId])

  const fetchMessages = useCallback(
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
        const json = (await res.json()) as {
          messages: ChatMessage[]
          threadStatus: string
          role: string
          otherPartyName: string | null
          priorOffenseCount: number
          isPhoneBlocked: boolean
          otherPartyOffenseCount: number
          otherPartyIsPhoneBlocked: boolean
        }
        setMessages((prev) => {
          const warnings = prev.filter(isPhoneWarning)
          return [...warnings, ...json.messages]
        })
        setThreadStatus((json.threadStatus as 'active' | 'locked' | 'disabled') ?? 'active')
        setRole(json.role as 'buyer' | 'seller')
        setOtherPartyName(json.otherPartyName)

        // Always refresh DB-backed counts on every fetch — initial AND every poll tick
        const serverCount = json.priorOffenseCount ?? 0
        priorOffenseRef.current = serverCount
        setMyOffenseCount(serverCount)
        setOtherPartyOffenseCount(json.otherPartyOffenseCount ?? 0)

        if (!opts?.silent && user) {
          recentSentRef.current = json.messages
            .filter((m) => m.senderId === user.id && !m.isDeleted)
            .slice(-8)
            .map((m) => m.content)
          if (json.isPhoneBlocked) setSessionBlocked(true)
        }
      } catch {
        if (!opts?.silent) setFetchError('Could not connect.')
      } finally {
        if (!opts?.silent) setLoading(false)
      }
    },
    [threadId, user],
  )

  useEffect(() => {
    if (!threadId) return
    void fetchMessages()
    pollRef.current = setInterval(() => void fetchMessages({ silent: true }), 10_000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [threadId, fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function checkPhoneInWindow(val: string): boolean {
    return containsPhoneNumber(val) || containsPhoneNumberInWindow(recentSentRef.current, val)
  }

  function pushPhoneWarning(serverWarningText: string, offenseNumber: number) {
    const warning = {
      id: `warn-${Date.now()}`,
      isPhoneWarning: true as const,
      warningText: serverWarningText,
      offenseNumber,
      createdAt: new Date().toISOString(),
    }
    const shouldLock = offenseNumber >= 3
    setMessages((prev) =>
      shouldLock ? [warning] : [...prev.filter((m) => !isPhoneWarning(m)), warning],
    )
    if (shouldLock) setSessionBlocked(true)
    priorOffenseRef.current = offenseNumber
    setMyOffenseCount(offenseNumber)
    setInput('')
    setSendError(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (sessionBlocked) return
    const val = e.target.value
    setInput(val)
    setSendError(null)
    // On typing: clear input + soft notice only — no DB write, no count change
    if (checkPhoneInWindow(val)) {
      setInput('')
      setSendError("Phone numbers can't be shared here. Send the message to record a violation.")
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      return
    }
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 96) + 'px'
    }
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
      const json = (await res.json()) as {
        message?: ChatMessage
        error?: string
        code?: string
        offenseNumber?: number
        chatCleared?: boolean
      }
      if (!res.ok) {
        if (json.code === 'PHONE_NUMBER_BLOCKED' || json.code === 'PHONE_SEND_BLOCKED') {
          pushPhoneWarning(
            json.error ?? phoneBlockText(json.offenseNumber ?? 1),
            json.offenseNumber ?? 1,
          )
        } else {
          setSendError(json.error ?? 'Failed to send message.')
          if (json.chatCleared) {
            setMessages([])
            setInput('')
            if (textareaRef.current) textareaRef.current.style.height = 'auto'
          }
        }
        return
      }
      if (json.message) {
        setMessages((prev) => [...prev, json.message!])
        recentSentRef.current = [...recentSentRef.current, trimmed].slice(-8)
      }
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch {
      setSendError('Network error. Please try again.')
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

  const groups = groupByDay(messages)
  const displayName = otherPartyName ?? (role === 'buyer' ? 'Seller' : 'Buyer')

  if (authLoading || (loading && !fetchError)) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="space-y-4">
        <Link
          href="/messages"
          className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to messages
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {fetchError}
        </div>
      </div>
    )
  }

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-white sm:mx-0 sm:my-0 sm:h-[calc(100dvh-8rem)] sm:rounded-2xl sm:border sm:border-[var(--color-border)]">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-white/95 px-4 py-3 backdrop-blur-sm">
        <Link
          href="/messages"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          aria-label="Back to messages"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
              {displayName}
            </p>
            {role === 'seller' && otherPartyOffenseCount > 0 && (
              <WarningBadge
                count={otherPartyOffenseCount}
                tooltip="This buyer has phone-sharing violations"
              />
            )}
          </div>
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">
            {threadStatus === 'locked'
              ? 'Conversation closed'
              : threadStatus === 'disabled'
                ? 'Conversation disabled'
                : 'Active conversation'}
          </p>
        </div>
        {myOffenseCount > 0 && role === 'buyer' && (
          <WarningBadge count={myOffenseCount} tooltip={phoneBlockText(myOffenseCount)} size="md" />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.filter((m) => !isPhoneWarning(m)).length === 0 && (
          <div className="flex justify-center">
            <span className="rounded-full bg-[var(--color-muted)] px-3 py-1.5 text-center text-xs text-[var(--color-muted-foreground)]">
              Conversation started · Phone numbers cannot be shared here.
            </span>
          </div>
        )}

        {groups.map(({ day, messages: dayMsgs }) => (
          <div key={day}>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--color-border)]" />
              <span className="text-xs text-[var(--color-muted-foreground)]">{day}</span>
              <div className="h-px flex-1 bg-[var(--color-border)]" />
            </div>

            <div className="space-y-1">
              {dayMsgs.map((msg, idx) => {
                if (isPhoneWarning(msg)) {
                  const isFinal = msg.offenseNumber >= 3
                  return (
                    <div key={msg.id} className="my-3 flex justify-center">
                      <div
                        className={`flex w-full flex-col gap-1.5 rounded-xl border px-3 py-2.5 ${isFinal ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle
                            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isFinal ? 'text-red-500' : 'text-amber-500'}`}
                            aria-hidden="true"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`text-xs font-semibold ${isFinal ? 'text-red-800' : 'text-amber-800'}`}
                              >
                                {isFinal ? 'Account Restricted' : 'Phone number blocked'}
                              </p>
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isFinal ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'}`}
                              >
                                {msg.offenseNumber >= 3 ? 'BLOCKED' : `${msg.offenseNumber}/3`}
                              </span>
                            </div>
                            <p
                              className={`mt-0.5 text-xs leading-snug ${isFinal ? 'text-red-700' : 'text-amber-700'}`}
                            >
                              {msg.warningText}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }

                const isOwn = msg.senderId === user?.id
                const nextMsg = dayMsgs[idx + 1]
                const isLast =
                  idx === dayMsgs.length - 1 ||
                  isPhoneWarning(nextMsg!) ||
                  (nextMsg as ChatMessage | undefined)?.senderId !== msg.senderId
                return (
                  <div key={msg.id} className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                    <div>
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                          isOwn
                            ? 'rounded-br-sm bg-[var(--color-foreground)] text-white'
                            : 'rounded-bl-sm bg-[var(--color-muted)] text-[var(--color-foreground)]',
                          msg.isDeleted && 'italic opacity-50',
                        )}
                      >
                        {msg.content}
                      </div>
                      {isLast && (
                        <div
                          className={cn(
                            'mt-0.5 text-[10px] text-[var(--color-muted-foreground)]',
                            isOwn ? 'text-right' : 'text-left',
                          )}
                        >
                          {formatTime(msg.createdAt)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Status banners */}
      {threadStatus === 'locked' && (
        <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-2.5 text-center text-xs text-[var(--color-muted-foreground)]">
          This listing is no longer active. No new messages can be sent.
        </div>
      )}
      {threadStatus === 'disabled' && (
        <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-2.5 text-center text-xs text-[var(--color-muted-foreground)]">
          Chat unavailable.
        </div>
      )}

      {/* Input bar */}
      {threadStatus === 'active' &&
        (sessionBlocked ? (
          <div
            className={`shrink-0 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${myOffenseCount >= 3 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle
                className={`mt-0.5 h-4 w-4 shrink-0 ${myOffenseCount >= 3 ? 'text-red-500' : 'text-amber-500'}`}
                aria-hidden="true"
              />
              <div>
                <p
                  className={`text-xs font-semibold ${myOffenseCount >= 3 ? 'text-red-800' : 'text-amber-800'}`}
                >
                  {myOffenseCount >= 3 ? 'Account restricted' : 'Chat locked for this session'}
                </p>
                <p
                  className={`mt-0.5 text-xs ${myOffenseCount >= 3 ? 'text-red-700' : 'text-amber-700'}`}
                >
                  {myOffenseCount >= 3
                    ? 'Automatically restricted after 3 attempts. Contact support.'
                    : 'Phone number detected. Use the Call or WhatsApp buttons. Refresh to reset.'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="shrink-0 border-t border-[var(--color-border)] bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm">
            {sendError && <p className="mb-2 text-xs text-amber-700">{sendError}</p>}
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message…"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2.5 text-sm leading-snug outline-none transition-colors focus:border-[var(--color-foreground)]"
                style={{ maxHeight: 96 }}
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!input.trim() || sending}
                aria-label="Send message"
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-opacity',
                  'bg-[var(--color-foreground)] text-white',
                  (!input.trim() || sending) && 'opacity-40',
                )}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        ))}
    </div>
  )
}
