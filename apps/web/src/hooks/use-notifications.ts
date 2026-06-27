'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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

export function useNotifications(userId: string | undefined): UseNotificationsResult {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const fetchCountRef = useRef(0)

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
      // Discard stale responses if a newer fetch has started
      if (fetchId !== fetchCountRef.current) return
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      // Swallow — notification fetch must not break the UI
    } finally {
      if (fetchId === fetchCountRef.current) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void fetchNotifications()

    // Future Realtime extension point:
    // const supabase = createBrowserClient(...)
    // const channel = supabase.channel('notifications')
    //   .on('postgres_changes', {
    //     event: 'INSERT', schema: 'public', table: 'notifications',
    //     filter: `user_id=eq.${userId}`,
    //   }, (payload) => {
    //     const row = payload.new as NotificationItem
    //     setNotifications((prev) => [row, ...prev])
    //     setUnreadCount((n) => n + 1)
    //   })
    //   .subscribe()
    // return () => { void supabase.removeChannel(channel) }
  }, [fetchNotifications])

  const markRead = useCallback(
    async (id: string) => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id && !n.read ? { ...n, read: true } : n)),
      )
      setUnreadCount((c) => Math.max(0, c - 1))

      try {
        await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
      } catch {
        // Revert on failure
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
      await fetch('/api/notifications/read-all', { method: 'PATCH' })
    } catch {
      // Revert on failure
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
