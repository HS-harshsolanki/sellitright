'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import type { UserAdminItem } from '@/app/api/admin/users/route'
import { useAdminAuth } from '@/components/admin/admin-auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface UsersResponse {
  users: UserAdminItem[]
  total: number
  page: number
  totalPages: number
}

const RISK_BADGE: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-red-100 text-red-800',
}

const FLAG_BADGE: Record<string, string> = {
  SUSPENDED: 'bg-red-100 text-red-800',
  SPAM: 'bg-orange-100 text-orange-800',
  BROKER_SUSPECTED: 'bg-yellow-100 text-yellow-800',
  NEEDS_REVIEW: 'bg-blue-100 text-blue-800',
  CLEARED: 'bg-green-100 text-green-800',
}

type StatusFilter = '' | 'active' | 'suspended' | 'high-risk'

export default function AdminUsersPage() {
  const { apiFetch } = useAdminAuth()
  const [users, setUsers] = useState<UserAdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [confirmSuspend, setConfirmSuspend] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const limit = 25

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (query) params.set('q', query)
      if (statusFilter) params.set('status', statusFilter)
      const res = await apiFetch(`/api/admin/users?${params.toString()}`)
      if (!res.ok) {
        setError('Failed to load users.')
        return
      }
      const data = (await res.json()) as UsersResponse
      setUsers(data.users)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }, [apiFetch, page, query, statusFilter])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  async function handleSuspend(userId: string) {
    setActionLoading(userId)
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, currentFlag: 'SUSPENDED' } : u)),
        )
      }
    } catch {
      // non-fatal
    } finally {
      setActionLoading(null)
      setConfirmSuspend(null)
    }
  }

  async function handleActivate(userId: string) {
    setActionLoading(userId)
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/activate`, { method: 'POST' })
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, currentFlag: 'CLEARED' } : u)),
        )
      }
    } catch {
      // non-fatal
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Users</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          View and manage registered users.
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search name, email, phone…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />
        <div className="flex gap-1">
          {(
            [
              ['', 'All'],
              ['active', 'Active'],
              ['suspended', 'Suspended'],
              ['high-risk', 'High Risk'],
            ] as [StatusFilter, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => {
                setStatusFilter(val)
                setPage(1)
              }}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                statusFilter === val
                  ? 'bg-[var(--color-foreground)] text-white'
                  : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-sm text-[var(--color-muted-foreground)]">{total} users</span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && users.length === 0 ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white py-16 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">No users found.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
            {/* Desktop table */}
            <table className="hidden w-full text-sm md:table">
              <thead className="bg-[var(--color-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Listings</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Flag</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--color-muted)]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="hover:underline">
                        <p className="font-medium text-[var(--color-foreground)]">
                          {u.name ?? '—'}
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {u.email ?? u.phone ?? '—'}
                        </p>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                      {new Date(u.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--color-foreground)]">
                      {u.listingCount}
                    </td>
                    <td className="px-4 py-3">
                      {u.riskLevel ? (
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            RISK_BADGE[u.riskLevel],
                          )}
                        >
                          {u.riskLevel}
                          {u.riskScore != null && ` (${u.riskScore})`}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.currentFlag ? (
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            FLAG_BADGE[u.currentFlag] ??
                              'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
                          )}
                        >
                          {u.currentFlag.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Link href={`/admin/users/${u.id}`}>
                          <Button size="sm" variant="outline" className="text-xs">
                            View
                          </Button>
                        </Link>
                        {u.currentFlag !== 'SUSPENDED' ? (
                          confirmSuspend === u.id ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="text-xs"
                                disabled={actionLoading === u.id}
                                onClick={() => void handleSuspend(u.id)}
                              >
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => setConfirmSuspend(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-xs text-red-700 hover:bg-red-50"
                              onClick={() => setConfirmSuspend(u.id)}
                            >
                              Suspend
                            </Button>
                          )
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-200 text-xs text-green-700 hover:bg-green-50"
                            disabled={actionLoading === u.id}
                            onClick={() => void handleActivate(u.id)}
                          >
                            {actionLoading === u.id ? '...' : 'Activate'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="divide-y divide-[var(--color-border)] md:hidden">
              {users.map((u) => (
                <Link
                  key={u.id}
                  href={`/admin/users/${u.id}`}
                  className="block p-4 hover:bg-[var(--color-muted)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-[var(--color-foreground)]">{u.name ?? '—'}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {u.email ?? u.phone ?? '—'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {u.riskLevel && (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-semibold',
                            RISK_BADGE[u.riskLevel],
                          )}
                        >
                          {u.riskLevel}
                        </span>
                      )}
                      {u.currentFlag === 'SUSPENDED' && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                          Suspended
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                    {u.listingCount} listing{u.listingCount !== 1 ? 's' : ''}
                  </p>
                </Link>
              ))}
            </div>
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
