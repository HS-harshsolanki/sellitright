'use client'

import { useCallback, useEffect, useState } from 'react'

import { useAdminAuth } from '@/components/admin/admin-auth-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Violation {
  id: string
  threadId: string
  senderId: string
  senderName: string
  contentPreview: string
  offenseNumber: number
  reviewedAt: string | null
  createdAt: string
}

interface ViolationsResponse {
  violations: Violation[]
  total: number
  page: number
  totalPages: number
}

type Tab = 'unreviewed' | 'all'

export default function AdminPhoneViolationsPage() {
  const { apiFetch } = useAdminAuth()
  const [tab, setTab] = useState<Tab>('unreviewed')
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [suspendingId, setSuspendingId] = useState<string | null>(null)
  const [confirmSuspend, setConfirmSuspend] = useState<string | null>(null)
  const limit = 25

  const fetchViolations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ tab, page: String(page), limit: String(limit) })
      const res = await apiFetch(`/api/admin/phone-violations?${params.toString()}`)
      if (!res.ok) {
        setError('Failed to load violations.')
        return
      }
      const data = (await res.json()) as ViolationsResponse
      setViolations(data.violations)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }, [apiFetch, tab, page])

  useEffect(() => {
    void fetchViolations()
  }, [fetchViolations])

  async function markReviewed(id: string) {
    setReviewingId(id)
    try {
      const res = await apiFetch('/api/admin/phone-violations', {
        method: 'PATCH',
        body: JSON.stringify({ ids: [id] }),
      })
      if (res.ok) {
        if (tab === 'unreviewed') {
          setViolations((prev) => prev.filter((v) => v.id !== id))
          setTotal((t) => Math.max(0, t - 1))
        } else {
          setViolations((prev) =>
            prev.map((v) => (v.id === id ? { ...v, reviewedAt: new Date().toISOString() } : v)),
          )
        }
      }
    } catch {
      // non-fatal
    } finally {
      setReviewingId(null)
    }
  }

  async function suspendUser(userId: string) {
    setSuspendingId(userId)
    setConfirmSuspend(null)
    try {
      await apiFetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Suspended for repeated phone number sharing' }),
      })
    } catch {
      // non-fatal
    } finally {
      setSuspendingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Phone Violations</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Messages flagged for phone number sharing. Each row is one detected attempt.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
        {(['unreviewed', 'all'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t)
              setPage(1)
            }}
            className={cn(
              'flex-1 whitespace-nowrap px-6 py-3 text-sm font-medium capitalize transition-colors',
              tab === t
                ? 'border-b-2 border-[var(--color-foreground)] text-[var(--color-foreground)]'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
            )}
          >
            {t === 'unreviewed' ? 'Unreviewed' : 'All Violations'}
          </button>
        ))}
      </div>

      <p className="text-sm text-[var(--color-muted-foreground)]">{total} violations</p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && violations.length === 0 ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">Loading violations...</p>
        </div>
      ) : violations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white py-16 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No {tab === 'unreviewed' ? 'unreviewed' : ''} violations.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">Sender</th>
                  <th className="px-4 py-3">Attempted Message</th>
                  <th className="px-4 py-3">Offense</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {violations.map((v) => (
                  <tr key={v.id} className="align-top hover:bg-[var(--color-muted)]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--color-foreground)]">{v.senderName}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-[var(--color-muted-foreground)]">
                        {v.senderId.slice(0, 8)}…
                      </p>
                    </td>
                    <td className="max-w-[260px] px-4 py-3">
                      <code className="block break-all rounded bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                        {v.contentPreview}
                      </code>
                      <p className="mt-1 font-mono text-[10px] text-[var(--color-muted-foreground)]">
                        thread: {v.threadId.slice(0, 8)}…
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-bold',
                          v.offenseNumber >= 3
                            ? 'bg-red-100 text-red-800'
                            : v.offenseNumber === 2
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800',
                        )}
                      >
                        #{v.offenseNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {v.reviewedAt ? (
                        <span className="rounded-full bg-[var(--color-muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-muted-foreground)]">
                          Reviewed
                        </span>
                      ) : (
                        <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">
                          Unreviewed
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                      {new Date(v.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {!v.reviewedAt && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            disabled={reviewingId === v.id}
                            onClick={() => void markReviewed(v.id)}
                          >
                            {reviewingId === v.id ? 'Marking…' : 'Mark Reviewed'}
                          </Button>
                        )}
                        {confirmSuspend === v.senderId ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-xs text-red-700 hover:bg-red-50"
                              disabled={suspendingId === v.senderId}
                              onClick={() => void suspendUser(v.senderId)}
                            >
                              {suspendingId === v.senderId ? 'Suspending…' : 'Confirm Suspend?'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => setConfirmSuspend(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-xs text-red-700 hover:bg-red-50"
                            disabled={suspendingId === v.senderId}
                            onClick={() => setConfirmSuspend(v.senderId)}
                          >
                            Suspend User
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next →
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
