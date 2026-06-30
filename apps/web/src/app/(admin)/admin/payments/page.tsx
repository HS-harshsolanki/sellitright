'use client'

import { Check, X, Clock } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type { PaymentAdminItem } from '@/app/api/admin/payments/route'
import { useAdminAuth } from '@/components/admin/admin-auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface PaymentsResponse {
  payments: PaymentAdminItem[]
  total: number
  page: number
  totalPages: number
}

const STATUS_BADGE: Record<string, string> = {
  SUCCESS: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-purple-100 text-purple-800',
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'SUCCESS') return <Check className="h-3.5 w-3.5 text-green-600" />
  if (status === 'FAILED') return <X className="h-3.5 w-3.5 text-red-600" />
  return <Clock className="h-3.5 w-3.5 text-yellow-600" />
}

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

type StatusFilter = '' | 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED'

export default function AdminPaymentsPage() {
  const { apiFetch } = useAdminAuth()
  const [payments, setPayments] = useState<PaymentAdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [confirmRefundId, setConfirmRefundId] = useState<string | null>(null)
  const limit = 25

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (query) params.set('q', query)
      if (statusFilter) params.set('status', statusFilter)
      const res = await apiFetch(`/api/admin/payments?${params.toString()}`)
      if (!res.ok) {
        setError('Failed to load payments.')
        return
      }
      const data = (await res.json()) as PaymentsResponse
      setPayments(data.payments)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }, [apiFetch, page, query, statusFilter])

  useEffect(() => {
    void fetchPayments()
  }, [fetchPayments])

  function handleSearch(val: string) {
    setQuery(val)
    setPage(1)
  }

  async function handleRefund(paymentId: string) {
    setRefundingId(paymentId)
    try {
      const res = await apiFetch(`/api/admin/payments/${paymentId}/refund`, { method: 'POST' })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        setError(body.error ?? 'Refund failed.')
        return
      }
      // Update the row status in local state
      setPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, status: 'REFUNDED' } : p)),
      )
    } catch {
      setError('Network error during refund.')
    } finally {
      setRefundingId(null)
      setConfirmRefundId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Payments</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Search and review ₹49 contact-unlock payments.
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search order ID, payment ID, email…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-1">
          {(
            [
              ['', 'All'],
              ['SUCCESS', 'Success'],
              ['PENDING', 'Pending'],
              ['FAILED', 'Failed'],
              ['REFUNDED', 'Refunded'],
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
        <span className="text-sm text-[var(--color-muted-foreground)]">{total} payments</span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && payments.length === 0 ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">Loading payments...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white py-16 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">No payments found.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Connection</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {payments.map((p) => (
                  <>
                    <tr key={p.id} className="hover:bg-[var(--color-muted)]">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                        {new Date(p.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {p.paidAt && (
                          <p className="text-green-700">
                            {new Date(p.paidAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                      </td>
                      <td className="max-w-[160px] px-4 py-3">
                        <p className="truncate text-xs text-[var(--color-foreground)]">
                          {p.buyerEmail ?? '—'}
                        </p>
                        <p className="truncate font-mono text-[10px] text-[var(--color-muted-foreground)]">
                          {p.buyerId.slice(0, 8)}…
                        </p>
                      </td>
                      <td className="max-w-[160px] px-4 py-3">
                        <p className="truncate text-xs text-[var(--color-foreground)]">
                          {p.sellerEmail ?? '—'}
                        </p>
                        <p className="truncate font-mono text-[10px] text-[var(--color-muted-foreground)]">
                          {p.sellerId.slice(0, 8)}…
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--color-foreground)]">
                        {formatRupees(p.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            STATUS_BADGE[p.status],
                          )}
                        >
                          <StatusIcon status={p.status} />
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.contactUnlocked ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                            Unlocked
                          </span>
                        ) : (
                          <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs text-[var(--color-muted-foreground)]">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                          className="text-xs text-[var(--color-accent)] hover:underline"
                        >
                          {expandedId === p.id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === p.id && (
                      <tr key={`${p.id}-expanded`} className="bg-[var(--color-muted)]">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                            <div>
                              <p className="font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                                Payment ID
                              </p>
                              <p className="mt-0.5 font-mono text-[var(--color-foreground)]">
                                {p.razorpayPaymentId ?? '—'}
                              </p>
                            </div>
                            <div>
                              <p className="font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                                Order ID
                              </p>
                              <p className="mt-0.5 font-mono text-[var(--color-foreground)]">
                                {p.razorpayOrderId}
                              </p>
                            </div>
                            <div>
                              <p className="font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                                Listing ID
                              </p>
                              <p className="mt-0.5 font-mono text-[var(--color-foreground)]">
                                {p.listingId}
                              </p>
                            </div>
                            <div>
                              <p className="font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                                Interest ID
                              </p>
                              <p className="mt-0.5 font-mono text-[var(--color-foreground)]">
                                {p.interestId}
                              </p>
                            </div>
                            <div>
                              <p className="font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                                Record ID
                              </p>
                              <p className="mt-0.5 font-mono text-[var(--color-foreground)]">
                                {p.id}
                              </p>
                            </div>
                          </div>

                          {/* Refund action */}
                          {p.status === 'SUCCESS' && (
                            <div className="mt-4 flex items-center gap-2">
                              {confirmRefundId !== p.id ? (
                                <button
                                  onClick={() => setConfirmRefundId(p.id)}
                                  className="rounded border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                                >
                                  Refund ₹49
                                </button>
                              ) : (
                                <>
                                  <span className="text-xs text-[var(--color-muted-foreground)]">
                                    Confirm refund?
                                  </span>
                                  <button
                                    onClick={() => void handleRefund(p.id)}
                                    disabled={refundingId === p.id}
                                    className="rounded bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                                  >
                                    {refundingId === p.id ? 'Refunding…' : 'Yes, refund'}
                                  </button>
                                  <button
                                    onClick={() => setConfirmRefundId(null)}
                                    disabled={refundingId === p.id}
                                    className="rounded border border-[var(--color-border)] px-2.5 py-1 text-xs font-semibold text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] disabled:opacity-50"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
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
