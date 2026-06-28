'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { useAdminAuth } from '@/components/admin/admin-auth-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Report {
  id: string
  reporter_id: string
  reporter_role: 'buyer' | 'seller'
  target_user_id: string | null
  target_listing_id: string | null
  reason: string
  details: string | null
  status: 'OPEN' | 'REVIEWED' | 'ACTIONED' | 'DISMISSED'
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

interface ReportsResponse {
  reports: Report[]
  total: number
  page: number
  totalPages: number
}

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-800',
  REVIEWED: 'bg-blue-100 text-blue-800',
  ACTIONED: 'bg-green-100 text-green-800',
  DISMISSED: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
}

const REASON_LABELS: Record<string, string> = {
  SPAM: 'Spam',
  FRAUD: 'Fraud',
  FAKE_LISTING: 'Fake Listing',
  MISLEADING: 'Misleading',
  INAPPROPRIATE: 'Inappropriate',
  HARASSMENT: 'Harassment',
  BROKER_SUSPECTED: 'Suspected Broker',
  OTHER: 'Other',
}

type Tab = 'buyer' | 'seller'
type StatusFilter = 'OPEN' | 'REVIEWED' | 'ACTIONED' | 'DISMISSED' | 'ALL'

export default function AdminReportsPage() {
  const { apiFetch } = useAdminAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('buyer')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('OPEN')
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const limit = 25

  const fetchReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        reporter_role: tab,
        status: statusFilter,
        page: String(page),
        limit: String(limit),
      })
      const res = await apiFetch(`/api/admin/reports?${params.toString()}`)
      if (!res.ok) {
        setError('Failed to load reports.')
        return
      }
      const data = (await res.json()) as ReportsResponse
      setReports(data.reports)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }, [apiFetch, tab, statusFilter, page])

  useEffect(() => {
    void fetchReports()
  }, [fetchReports])

  async function updateStatus(ids: string[], status: 'REVIEWED' | 'ACTIONED' | 'DISMISSED') {
    setActionLoading(ids[0] ?? null)
    try {
      const res = await apiFetch('/api/admin/reports', {
        method: 'PATCH',
        body: JSON.stringify({ ids, status }),
      })
      if (res.ok) {
        setReports((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, status } : r)))
      }
    } catch {
      // non-fatal
    } finally {
      setActionLoading(null)
    }
  }

  async function suspendUser(userId: string) {
    setActionLoading(`suspend-${userId}`)
    try {
      await apiFetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Suspended via report resolution' }),
      })
    } catch {
      // non-fatal
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Reports</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Manage abuse reports from buyers and sellers.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
        {(['buyer', 'seller'] as Tab[]).map((t) => (
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
            {t === 'buyer' ? 'Buyer Reports' : 'Seller Reports'}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap items-center gap-2">
        {(['OPEN', 'REVIEWED', 'ACTIONED', 'DISMISSED', 'ALL'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s)
              setPage(1)
            }}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              statusFilter === s
                ? 'bg-[var(--color-foreground)] text-white'
                : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
            )}
          >
            {s}
          </button>
        ))}
        <span className="ml-2 text-sm text-[var(--color-muted-foreground)]">{total} reports</span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && reports.length === 0 ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white py-16 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} {tab} reports.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">Reporter</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {reports.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-[var(--color-muted)]">
                    <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                      <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-[10px] font-semibold capitalize">
                        {r.reporter_role}
                      </span>
                      <p className="mt-1 font-mono text-[10px]">{r.reporter_id.slice(0, 8)}…</p>
                    </td>
                    <td className="px-4 py-3">
                      {r.target_user_id && (
                        <button
                          onClick={() => router.push(`/admin/users/${r.target_user_id}`)}
                          className="truncate font-mono text-xs text-[var(--color-accent)] hover:underline"
                        >
                          user: {r.target_user_id.slice(0, 8)}…
                        </button>
                      )}
                      {r.target_listing_id && (
                        <p className="truncate font-mono text-xs text-[var(--color-muted-foreground)]">
                          listing: {r.target_listing_id.slice(0, 8)}…
                        </p>
                      )}
                    </td>
                    <td className="max-w-[180px] px-4 py-3">
                      <p className="font-medium text-[var(--color-foreground)]">
                        {REASON_LABELS[r.reason] ?? r.reason}
                      </p>
                      {r.details && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-muted-foreground)]">
                          {r.details}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          STATUS_BADGE[r.status],
                        )}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                      {new Date(r.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'OPEN' && (
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            disabled={actionLoading === r.id}
                            onClick={() => void updateStatus([r.id], 'ACTIONED')}
                          >
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-[var(--color-muted-foreground)]"
                            disabled={actionLoading === r.id}
                            onClick={() => void updateStatus([r.id], 'DISMISSED')}
                          >
                            Dismiss
                          </Button>
                          {r.target_user_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-xs text-red-700 hover:bg-red-50"
                              disabled={actionLoading === `suspend-${r.target_user_id}`}
                              onClick={() => void suspendUser(r.target_user_id!)}
                            >
                              Suspend User
                            </Button>
                          )}
                        </div>
                      )}
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
