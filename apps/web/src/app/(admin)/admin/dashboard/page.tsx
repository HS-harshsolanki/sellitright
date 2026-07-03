'use client'

import { Building2, AlertTriangle, Users, CreditCard, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { useAdminAuth } from '@/components/admin/admin-auth-context'
import type { AuditEntry } from '@/lib/audit-log'
import { cn } from '@/lib/utils'

interface Stats {
  listings: { pending: number; active: number; rejected: number }
  reports: { open: number }
  users: { total: number; suspended: number }
  payments: { total: number; totalRevenue: number }
}

interface AuditResponse {
  entries: AuditEntry[]
  total: number
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

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

export default function AdminDashboardPage() {
  const { apiFetch } = useAdminAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, auditRes] = await Promise.all([
        apiFetch('/api/admin/stats'),
        apiFetch('/api/admin/audit-log?limit=10&page=1'),
      ])
      if (statsRes.ok) setStats((await statsRes.json()) as Stats)
      if (auditRes.ok) setEntries(((await auditRes.json()) as AuditResponse).entries ?? [])
    } catch {
      // non-fatal
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const statCards = [
    {
      label: 'Pending Listings',
      value: stats?.listings.pending ?? '—',
      icon: Building2,
      color: 'border-yellow-200 bg-yellow-50 text-yellow-900',
      iconColor: 'text-yellow-600',
      href: '/admin/listings',
    },
    {
      label: 'Open Reports',
      value: stats?.reports.open ?? '—',
      icon: AlertTriangle,
      color: 'border-red-200 bg-red-50 text-red-900',
      iconColor: 'text-red-600',
      href: '/admin/reports',
    },
    {
      label: 'Total Users',
      value: stats?.users.total ?? '—',
      icon: Users,
      color: 'border-blue-200 bg-blue-50 text-blue-900',
      iconColor: 'text-blue-600',
      href: '/admin/users',
    },
    {
      label: 'Revenue (₹49 payments)',
      value: stats ? formatRupees(stats.payments.totalRevenue) : '—',
      icon: CreditCard,
      color: 'border-green-200 bg-green-50 text-green-900',
      iconColor: 'text-green-600',
      href: '/admin/payments',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Overview of the ChapterNew marketplace.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={cn(
              'group rounded-xl border p-4 transition-shadow hover:shadow-sm',
              card.color,
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                {card.label}
              </p>
              <card.icon className={cn('h-4 w-4', card.iconColor)} aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-bold">{loading ? '...' : card.value}</p>
            <p className="mt-1 flex items-center gap-1 text-xs opacity-60 group-hover:opacity-100">
              View <ArrowRight className="h-3 w-3" />
            </p>
          </Link>
        ))}
      </div>

      {/* Quick links row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Review Listings', href: '/admin/listings' },
          { label: 'Manage Reports', href: '/admin/reports' },
          { label: 'Search Payments', href: '/admin/payments' },
          { label: 'Manage Users', href: '/admin/users' },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
          >
            {link.label} →
          </Link>
        ))}
      </div>

      {/* Recent audit log */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            Recent Activity
          </h2>
          <Link
            href="/admin/audit-log"
            className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          >
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="h-40 animate-pulse rounded-xl bg-white" />
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white py-10 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">No activity yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-[var(--color-muted)]">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                      {new Date(e.created_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
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
                    <td className="max-w-[180px] truncate px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                      {e.listing_title ?? e.listing_id ?? '—'}
                    </td>
                    <td className="hidden max-w-[200px] truncate px-4 py-3 text-xs text-[var(--color-muted-foreground)] sm:table-cell">
                      {e.reason ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
