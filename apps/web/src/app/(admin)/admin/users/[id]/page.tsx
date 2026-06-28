'use client'

import { ArrowLeft, Phone, Mail, Shield, AlertTriangle } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { useAdminAuth } from '@/components/admin/admin-auth-context'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

interface UserDetail {
  id: string
  email: string | null
  phone: string | null
  name: string | null
  createdAt: string
  listings: Array<{
    id: string
    title: string
    status: string
    price: number
    city: string
    created_at: string
  }>
  interests: Array<{
    id: string
    listing_id: string
    status: string
    contact_unlocked: boolean | null
    created_at: string
  }>
  payments: Array<{
    id: string
    status: string
    amount: number
    razorpay_order_id: string
    paid_at: string | null
    created_at: string
  }>
  risk: {
    score: number
    level: string
    signals: Record<string, unknown> | null
    last_computed_at: string
  } | null
  flagHistory: Array<{
    id: string
    flag: string
    reason: string | null
    flagged_by: string
    created_at: string
  }>
}

const RISK_COLOR: Record<string, string> = {
  LOW: 'text-green-700 bg-green-50 border-green-200',
  MEDIUM: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  HIGH: 'text-red-700 bg-red-50 border-red-200',
}

const FLAG_BADGE: Record<string, string> = {
  SUSPENDED: 'bg-red-100 text-red-800',
  SPAM: 'bg-orange-100 text-orange-800',
  BROKER_SUSPECTED: 'bg-yellow-100 text-yellow-800',
  NEEDS_REVIEW: 'bg-blue-100 text-blue-800',
  CLEARED: 'bg-green-100 text-green-800',
}

const LISTING_STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  REJECTED: 'bg-red-100 text-red-800',
  DELETED: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
  DRAFT: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
}

type Tab = 'listings' | 'interests' | 'payments'

export default function AdminUserDetailPage() {
  const { apiFetch } = useAdminAuth()
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const userId = params.id

  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('listings')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmSuspend, setConfirmSuspend] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/admin/users/${userId}`)
      if (!res.ok) {
        setError('User not found.')
        return
      }
      setUser((await res.json()) as UserDetail)
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }, [apiFetch, userId])

  useEffect(() => {
    void fetchUser()
  }, [fetchUser])

  async function handleSuspend() {
    setActionLoading('suspend')
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      if (res.ok && user) {
        setUser({
          ...user,
          flagHistory: [
            {
              id: 'new',
              flag: 'SUSPENDED',
              reason: null,
              flagged_by: 'api_key',
              created_at: new Date().toISOString(),
            },
            ...user.flagHistory,
          ],
        })
      }
    } catch {
      // non-fatal
    } finally {
      setActionLoading(null)
      setConfirmSuspend(false)
    }
  }

  async function handleActivate() {
    setActionLoading('activate')
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/activate`, { method: 'POST' })
      if (res.ok && user) {
        setUser({
          ...user,
          flagHistory: [
            {
              id: 'new',
              flag: 'CLEARED',
              reason: null,
              flagged_by: 'api_key',
              created_at: new Date().toISOString(),
            },
            ...user.flagHistory,
          ],
        })
      }
    } catch {
      // non-fatal
    } finally {
      setActionLoading(null)
    }
  }

  if (loading)
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-[var(--color-muted-foreground)]">Loading user...</p>
      </div>
    )

  if (error || !user)
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-600">{error ?? 'User not found.'}</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    )

  const currentFlag = user.flagHistory[0]?.flag
  const isSuspended = currentFlag === 'SUSPENDED'

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to users
      </button>

      {/* Profile card */}
      <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-foreground)]">
              {user.name ?? 'Unknown User'}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
              {user.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </span>
              )}
              {user.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {user.phone}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              Joined{' '}
              {new Date(user.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p className="mt-0.5 font-mono text-xs text-[var(--color-muted-foreground)]">
              {user.id}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {isSuspended ? (
              <Button
                variant="outline"
                className="border-green-200 text-green-700 hover:bg-green-50"
                disabled={actionLoading === 'activate'}
                onClick={() => void handleActivate()}
              >
                {actionLoading === 'activate' ? '...' : 'Activate User'}
              </Button>
            ) : confirmSuspend ? (
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  disabled={actionLoading === 'suspend'}
                  onClick={() => void handleSuspend()}
                >
                  {actionLoading === 'suspend' ? '...' : 'Confirm Suspend'}
                </Button>
                <Button variant="outline" onClick={() => setConfirmSuspend(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => setConfirmSuspend(true)}
              >
                Suspend User
              </Button>
            )}
          </div>
        </div>

        {/* Risk + current flag row */}
        <div className="mt-4 flex flex-wrap gap-3">
          {user.risk && (
            <div
              className={cn(
                'rounded-lg border px-4 py-2',
                RISK_COLOR[user.risk.level] ??
                  'border-[var(--color-border)] bg-white text-[var(--color-foreground)]',
              )}
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" aria-hidden="true" />
                <span className="text-sm font-semibold">
                  Risk: {user.risk.level} ({user.risk.score})
                </span>
              </div>
              {user.risk.signals && Object.keys(user.risk.signals).length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {Object.keys(user.risk.signals).map((sig) => (
                    <span
                      key={sig}
                      className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold"
                    >
                      {sig.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {currentFlag && (
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold',
                FLAG_BADGE[currentFlag] ??
                  'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
              )}
            >
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {currentFlag.replace(/_/g, ' ')}
            </div>
          )}
        </div>
      </div>

      {/* Flag history */}
      {user.flagHistory.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-foreground)]">
            Flag History
          </h2>
          <div className="space-y-2">
            {user.flagHistory.map((f) => (
              <div key={f.id} className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      FLAG_BADGE[f.flag] ??
                        'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
                    )}
                  >
                    {f.flag.replace(/_/g, ' ')}
                  </span>
                  {f.reason && (
                    <span className="text-xs text-[var(--color-muted-foreground)]">{f.reason}</span>
                  )}
                </div>
                <span className="whitespace-nowrap text-xs text-[var(--color-muted-foreground)]">
                  {new Date(f.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
        {(['listings', 'interests', 'payments'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={cn(
              'flex-1 whitespace-nowrap px-4 py-3 text-sm font-medium capitalize transition-colors',
              activeTab === t
                ? 'border-b-2 border-[var(--color-foreground)] text-[var(--color-foreground)]'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
            )}
          >
            {t} (
            {activeTab === t
              ? t === 'listings'
                ? user.listings.length
                : t === 'interests'
                  ? user.interests.length
                  : user.payments.length
              : '…'}
            )
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'listings' &&
        (user.listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white py-12 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">No listings.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {user.listings.map((l) => (
                  <tr key={l.id} className="hover:bg-[var(--color-muted)]">
                    <td className="max-w-[220px] truncate px-4 py-3 font-medium text-[var(--color-foreground)]">
                      {l.title}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          LISTING_STATUS_BADGE[l.status] ??
                            'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
                        )}
                      >
                        {l.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--color-foreground)]">
                      {formatPrice(l.price)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                      {l.city}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                      {new Date(l.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {activeTab === 'interests' &&
        (user.interests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white py-12 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">No interests submitted.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">Interest ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Contact Unlocked</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {user.interests.map((i) => (
                  <tr key={i.id} className="hover:bg-[var(--color-muted)]">
                    <td className="px-4 py-3 font-mono text-xs text-[var(--color-muted-foreground)]">
                      {i.id.slice(0, 12)}…
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          i.status === 'ACCEPTED'
                            ? 'bg-green-100 text-green-800'
                            : i.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800',
                        )}
                      >
                        {i.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {i.contact_unlocked ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                          Yes
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--color-muted-foreground)]">No</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                      {new Date(i.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {activeTab === 'payments' &&
        (user.payments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white py-12 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">No payments.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {user.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--color-muted)]">
                    <td className="px-4 py-3 font-mono text-xs text-[var(--color-muted-foreground)]">
                      {p.razorpay_order_id}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          p.status === 'SUCCESS'
                            ? 'bg-green-100 text-green-800'
                            : p.status === 'FAILED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800',
                        )}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--color-foreground)]">
                      ₹{((p.amount ?? 0) / 100).toLocaleString('en-IN')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                      {new Date(p.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  )
}
