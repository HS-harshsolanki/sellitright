'use client'

import { ArrowLeft, Loader2, Send } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import type { ChatMessage } from '@/app/api/chat/threads/[threadId]/messages/route'
import { containsPhoneNumber } from '@/lib/phone-filter'
import { useAuth } from '@/lib/supabase/auth-context'
import { cn } from '@/lib/utils'

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

function groupByDay(messages: ChatMessage[]): Array<{ day: string; messages: ChatMessage[] }> {
  const groups: Array<{ day: string; messages: ChatMessage[] }> = []
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

export default function ChatThreadPage() {
  const params = useParams()
  const interestId = params.interestId as string
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [threadId, setThreadId] = useState<string | null>(null)
  const [threadStatus, setThreadStatus] = useState<'active' | 'locked' | 'disabled'>('active')
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer')
  const [otherPartyName, setOtherPartyName] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [clientPhoneWarning, setClientPhoneWarning] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [authLoading, user, router])

  // Step 1: resolve interest → thread
  useEffect(() => {
    if (!user || !interestId) return
    fetch(`/api/chat/by-interest/${interestId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((json: { threadId: string }) => setThreadId(json.threadId))
      .catch(() => setFetchError('Conversation not available.'))
  }, [user, interestId])

  // Step 2: load messages once threadId is known
  useEffect(() => {
    if (!threadId) return
    setLoading(true)
    fetch(`/api/chat/threads/${threadId}/messages`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(
        (json: {
          messages: ChatMessage[]
          threadStatus: string
          role: string
          otherPartyName?: string
        }) => {
          setMessages(json.messages)
          setThreadStatus(json.threadStatus as 'active' | 'locked' | 'disabled')
          setRole(json.role as 'buyer' | 'seller')
          if (json.otherPartyName) setOtherPartyName(json.otherPartyName)
        },
      )
      .catch(() => setFetchError('Failed to load messages.'))
      .finally(() => setLoading(false))
  }, [threadId])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Client-side phone detection on input change
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setInput(val)
    setClientPhoneWarning(val.trim().length > 3 && containsPhoneNumber(val))
    setSendError(null)

    // Auto-resize textarea
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 96) + 'px'
    }
  }

  async function handleSend() {
    if (!threadId || !input.trim() || clientPhoneWarning || sending) return
    setSending(true)
    setSendError(null)

    try {
      const res = await fetch(`/api/chat/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input.trim() }),
      })

      const json = (await res.json()) as {
        message?: ChatMessage
        error?: string
        code?: string
        chatCleared?: boolean
      }

      if (!res.ok) {
        setSendError(json.error ?? 'Failed to send message.')
        // Server wiped the chat on phone detection — clear local messages immediately
        if (json.chatCleared) {
          setMessages([])
          setInput('')
          if (textareaRef.current) textareaRef.current.style.height = 'auto'
        }
        return
      }

      if (json.message) {
        setMessages((prev) => [...prev, json.message!])
      }
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch {
      setSendError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const canSend = threadStatus === 'active'
  const groups = groupByDay(messages)

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
    <div className="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white">
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
          <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
            {otherPartyName ?? (role === 'buyer' ? 'Seller' : 'Buyer')}
          </p>
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">
            {threadStatus === 'locked'
              ? 'Conversation closed'
              : threadStatus === 'disabled'
                ? 'Conversation disabled'
                : 'Active conversation'}
          </p>
        </div>
      </div>

      {/* Messages scroll area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex justify-center">
            <span className="rounded-full bg-[var(--color-muted)] px-3 py-1.5 text-center text-xs text-[var(--color-muted-foreground)]">
              Conversation started · Phone numbers cannot be shared here.
            </span>
          </div>
        )}

        {groups.map(({ day, messages: dayMsgs }) => (
          <div key={day}>
            {/* Day divider */}
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--color-border)]" />
              <span className="text-xs text-[var(--color-muted-foreground)]">{day}</span>
              <div className="h-px flex-1 bg-[var(--color-border)]" />
            </div>

            {/* Messages in this day */}
            <div className="space-y-1">
              {dayMsgs.map((msg, idx) => {
                const isOwn = msg.senderId === user?.id
                const isLast =
                  idx === dayMsgs.length - 1 || dayMsgs[idx + 1]?.senderId !== msg.senderId
                return (
                  <div key={msg.id} className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
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
                          'mt-0.5 w-full text-[10px] text-[var(--color-muted-foreground)]',
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
      {canSend && (
        <div className="pb-safe-0 shrink-0 border-t border-[var(--color-border)] bg-white/95 px-4 pt-3 backdrop-blur-sm">
          {/* Client-side phone number warning */}
          {clientPhoneWarning && (
            <p className="mb-2 text-xs text-amber-700">
              Phone numbers can&apos;t be shared here — use the Call or WhatsApp buttons to connect
              after unlocking contact.
            </p>
          )}
          {/* Server-side send error */}
          {sendError && !clientPhoneWarning && (
            <p className="mb-2 text-xs text-red-600">{sendError}</p>
          )}

          <div className="flex items-end gap-2 pb-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              rows={1}
              className={cn(
                'flex-1 resize-none rounded-xl border px-3 py-2.5 text-sm leading-snug outline-none transition-colors',
                'focus:border-[var(--color-foreground)]',
                clientPhoneWarning
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-[var(--color-border)] bg-[var(--color-muted)]',
              )}
              style={{ maxHeight: 96 }}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || clientPhoneWarning || sending}
              aria-label="Send message"
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-opacity',
                'bg-[var(--color-foreground)] text-white',
                (!input.trim() || clientPhoneWarning || sending) && 'opacity-40',
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
      )}
    </div>
  )
}
