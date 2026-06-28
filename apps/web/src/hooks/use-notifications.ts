'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { isSupabaseConfigured } from '@/lib/supabase/client'

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: string
  entityType: string | null
  entityId: string | null
  read: boolean
  createdAt: string
}

interface ApiResponse {
  notifications: NotificationItem[]
  total: number
  unreadCount: number
}

export interface UseNotificationsResult {
  notifications: NotificationItem[]
  unreadCount: number
  loading: boolean
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  refetch: () => void
}

// How often to poll when Realtime is unavailable or as a safety net
const POLL_INTERVAL_MS = 30_000

export function useNotifications(userId: string | undefined): UseNotificationsResult {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const fetchCountRef = useRef(0)
  const realtimeCleanupRef = useRef<(() => void) | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      return
    }
    const fetchId = ++fetchCountRef.current
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?limit=20')
      if (!res.ok) return
      const data = (await res.json()) as ApiResponse
      if (fetchId !== fetchCountRef.current) return
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      // Non-fatal — notification fetch must never break the UI
    } finally {
      if (fetchId === fetchCountRef.current) setLoading(false)
    }
  }, [userId])

  // ── Realtime subscription ────────────────────────────────────────────────────
  // Wires up a Supabase Realtime channel scoped to this user's notifications.
  // On INSERT: prepend the new notification and bump the unread counter.
  // On UPDATE: update the read flag in-place (handles remote mark-read).
  // Falls back to poll-only if Supabase is not configured (dev/demo mode).
  const setupRealtime = useCallback(() => {
    if (!userId || !isSupabaseConfigured()) return

    // Dynamic import so the browser client is never bundled in server components
    import('@/lib/supabase/client')
      .then(({ createClient }) => {
        let client: ReturnType<typeof createClient>
        try {
          client = createClient()
        } catch {
          return
        }

        const channel = client
          .channel(`notifications:${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              const row = payload.new as {
                id: string
                title: string
                message: string
                type: string
                entity_type: string | null
                entity_id: string | null
                read: boolean
                created_at: string
              }
              const item: NotificationItem = {
                id: row.id,
                title: row.title,
                message: row.message,
                type: row.type,
                entityType: row.entity_type,
                entityId: row.entity_id,
                read: row.read,
                createdAt: row.created_at,
              }
              setNotifications((prev) => [item, ...prev])
              if (!item.read) setUnreadCount((c) => c + 1)
            },
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              const row = payload.new as { id: string; read: boolean }
              setNotifications((prev) =>
                prev.map((n) => (n.id === row.id ? { ...n, read: row.read } : n)),
              )
              // Recount from fresh state when a read flag changes remotely
              setUnreadCount((c) => (row.read ? Math.max(0, c - 1) : c))
            },
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              // Successfully subscribed — clear the poll fallback timer so we
              // don't double-fetch while realtime is working
              if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current)
                pollTimerRef.current = null
              }
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              // Realtime degraded — start polling as fallback
              startPolling()
            }
          })

        realtimeCleanupRef.current = () => {
          void client.removeChannel(channel)
        }
      })
      .catch(() => {
        // Module import failed — fall back to polling
        startPolling()
      })
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return // Already polling
    pollTimerRef.current = setInterval(() => {
      void fetchNotifications()
    }, POLL_INTERVAL_MS)
  }, [fetchNotifications])

  // ── Page visibility refetch ─────────────────────────────────────────────────
  // When the user returns to the tab after being away, re-fetch immediately
  // so stale state doesn't linger even if realtime or polling missed something.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void fetchNotifications()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchNotifications])

  // ── Bootstrap on mount / userId change ─────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    void fetchNotifications()

    // Start polling immediately as a safety net; realtime subscription will
    // cancel it if it connects successfully
    startPolling()
    setupRealtime()

    return () => {
      // Tear down realtime channel
      if (realtimeCleanupRef.current) {
        realtimeCleanupRef.current()
        realtimeCleanupRef.current = null
      }
      // Stop polling timer
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [userId, fetchNotifications, startPolling, setupRealtime])

  // ── Mutations ───────────────────────────────────────────────────────────────

  const markRead = useCallback(
    async (id: string) => {
      // Optimistic update first
      setNotifications((prev) =>
        prev.map((n) => (n.id === id && !n.read ? { ...n, read: true } : n)),
      )
      setUnreadCount((c) => Math.max(0, c - 1))

      try {
        const res = await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
        if (!res.ok) {
          // Revert on failure
          void fetchNotifications()
        }
      } catch {
        void fetchNotifications()
      }
    },
    [fetchNotifications],
  )

  const markAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)

    try {
      const res = await fetch('/api/notifications/read-all', { method: 'PATCH' })
      if (!res.ok) {
        void fetchNotifications()
      }
    } catch {
      void fetchNotifications()
    }
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    refetch: fetchNotifications,
  }
}
