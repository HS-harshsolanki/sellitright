'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAdminAuth } from '@/components/admin/admin-auth-context'
import type { AuditEntry } from '@/lib/audit-log'

interface AuditResponse {
  entries: AuditEntry[]
  total: number
  page: number
  totalPages: number
}

const AUDIT_BADGE: Record<string, string> = {
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  note_added: 'bg-blue-100 text-blue-800',
  deleted: 'bg-[var(--color-border)] text-[var(--color-muted-foreground)]',
  user_suspended: 'bg-orange-100 text-orange-800',
  user_activated: 'bg-green-100 text-green-800',
  status_changed: 'bg-[var(--color-muted)] text-[var(--color-foreground)]',
}

const ACTION_OPTIONS = [
  { label: 'All Actions', value: '' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Note Added', value: 'note_added' },
  { label: 'Deleted', value: 'deleted' },
  { label: 'User Suspended', value: 'user_suspended' },
  { label: 'User Activated', value: 'user_activated' },
]

export default function AdminAuditLogPage() {
  const { apiFetch } = useAdminAuth()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const limit = 25

  const fetchLog = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (actionFilter) params.set('action', actionFilter)
      const res = await apiFetch(`/api/admin/audit-log?${params.toString()}`)
      if (!res.ok) {
        setError('Failed to load audit log.')
        return
      }
      const data = (await res.json()) as AuditResponse
      setEntries(data.entries)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }, [apiFetch, page, actionFilter])

  useEffect(() => {
    void fetchLog()
  }, [fetchLog])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Audit Log</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          All admin actions recorded with before/after values.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none"
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-[var(--color-muted-foreground)]">{total} entries</span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && entries.length === 0 ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">Loading audit log...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white py-16 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">No audit log entries yet.</p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            Actions will appear here after approving, rejecting, or managing users.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Status Change</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Reason / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {entries.map((e) => (
                  <tr key={e.id} className="align-top hover:bg-[var(--color-muted)]">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                      {new Date(e.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      <br />
                      {new Date(e.created_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          AUDIT_BADGE[e.action] ??
                            'bg-[var(--color-muted)] text-[var(--color-foreground)]',
                        )}
                      >
                        {e.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="max-w-[200px] px-4 py-3">
                      <p className="truncate font-medium text-[var(--color-foreground)]">
                        {e.listing_title ?? '—'}
                      </p>
                      <p className="truncate font-mono text-[10px] text-[var(--color-muted-foreground)]">
                        {e.listing_id}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                      {e.previous_status && e.new_status
                        ? `${e.previous_status} → ${e.new_status}`
                        : '—'}
                    </td>
                    <td className="hidden max-w-[240px] px-4 py-3 text-xs text-[var(--color-muted-foreground)] lg:table-cell">
                      {e.reason ? <span className="line-clamp-2">{e.reason}</span> : '—'}
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
