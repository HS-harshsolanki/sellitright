'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatPrice, formatBHK } from '@/lib/format'
import type { MockListing, ListingStatus } from '@/lib/mock-data'

type TabStatus = 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED'

interface StatusCounts {
  PENDING_REVIEW: number
  ACTIVE: number
  REJECTED: number
}

const STATUS_TABS: { label: string; value: TabStatus }[] = [
  { label: 'Pending Review', value: 'PENDING_REVIEW' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Rejected', value: 'REJECTED' },
]

const STATUS_BADGE: Record<ListingStatus, string> = {
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  DRAFT: 'bg-gray-100 text-gray-700',
  SOLD: 'bg-blue-100 text-blue-800',
  INACTIVE: 'bg-gray-100 text-gray-700',
}

const STATUS_LABEL: Record<ListingStatus, string> = {
  PENDING_REVIEW: 'Pending',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  DRAFT: 'Draft',
  SOLD: 'Sold',
  INACTIVE: 'Inactive',
}

function AdminPageContent() {
  const searchParams = useSearchParams()
  const adminKey = searchParams.get('key')

  const [listings, setListings] = useState<MockListing[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabStatus>('PENDING_REVIEW')

  // Per-listing reject state: id -> reason string (undefined = form closed)
  const [rejectForms, setRejectForms] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchListings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/listings?key=${adminKey}`)
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? 'Failed to load listings')
        return
      }
      const data = (await res.json()) as { listings: MockListing[] }
      setListings(data.listings)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [adminKey])

  useEffect(() => {
    if (adminKey === 'admin123') {
      void fetchListings()
    } else {
      setLoading(false)
    }
  }, [adminKey, fetchListings])

  async function handleApprove(id: string) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/listings/${id}/approve?key=${adminKey}`, {
        method: 'POST',
      })
      if (!res.ok) return
      const updated = (await res.json()) as MockListing
      setListings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(id: string) {
    const reason = rejectForms[id]?.trim()
    if (!reason) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/listings/${id}/reject?key=${adminKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) return
      const updated = (await res.json()) as MockListing
      setListings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
      setRejectForms((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } finally {
      setActionLoading(null)
    }
  }

  function toggleRejectForm(id: string) {
    setRejectForms((prev) => {
      if (id in prev) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: '' }
    })
  }

  if (adminKey !== 'admin123') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="text-2xl font-semibold text-gray-900">Unauthorized</p>
        <p className="mt-2 text-sm text-gray-500">
          Append <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">?key=admin123</code> to the URL to access this panel.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-500">Loading listings...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => void fetchListings()}>
          Retry
        </Button>
      </div>
    )
  }

  const counts: StatusCounts = {
    PENDING_REVIEW: listings.filter((l) => l.status === 'PENDING_REVIEW').length,
    ACTIVE: listings.filter((l) => l.status === 'ACTIVE').length,
    REJECTED: listings.filter((l) => l.status === 'REJECTED').length,
  }

  const visible = listings.filter((l) => l.status === activeTab)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Listing Review</h1>
        <p className="mt-1 text-sm text-gray-500">
          Approve or reject property listings submitted by sellers.
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-yellow-700">Pending</p>
          <p className="mt-1 text-2xl font-bold text-yellow-900">{counts.PENDING_REVIEW}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-green-700">Active</p>
          <p className="mt-1 text-2xl font-bold text-green-900">{counts.ACTIVE}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-red-700">Rejected</p>
          <p className="mt-1 text-2xl font-bold text-red-900">{counts.REJECTED}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.value
                ? 'border-b-2 border-gray-900 text-gray-900'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'ml-2 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                activeTab === tab.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600',
              )}
            >
              {counts[tab.value]}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white py-16 text-center">
          <p className="text-sm text-gray-500">No listings in this category.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Listing</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">BHK</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Status</th>
                  {activeTab === 'PENDING_REVIEW' && (
                    <th className="px-4 py-3 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((listing) => (
                  <>
                    <tr key={listing.id} className="align-top hover:bg-gray-50">
                      <td className="max-w-[220px] px-4 py-3">
                        <p className="truncate font-medium text-gray-900">{listing.title}</p>
                        <p className="truncate text-xs text-gray-400">{listing.id}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {listing.locality}, {listing.city}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatBHK(listing.bhkType)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatPrice(listing.price)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{listing.seller.name}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(listing.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            STATUS_BADGE[listing.status],
                          )}
                        >
                          {STATUS_LABEL[listing.status]}
                        </span>
                      </td>
                      {activeTab === 'PENDING_REVIEW' && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => void handleApprove(listing.id)}
                              disabled={actionLoading === listing.id}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleRejectForm(listing.id)}
                              disabled={actionLoading === listing.id}
                            >
                              {listing.id in rejectForms ? 'Cancel' : 'Reject'}
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                    {/* Reject reason inline row */}
                    {activeTab === 'PENDING_REVIEW' && listing.id in rejectForms && (
                      <tr key={`${listing.id}-reject`}>
                        <td colSpan={8} className="bg-red-50 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Input
                              placeholder="Reason for rejection..."
                              value={rejectForms[listing.id]}
                              onChange={(e) =>
                                setRejectForms((prev) => ({
                                  ...prev,
                                  [listing.id]: e.target.value,
                                }))
                              }
                              className="max-w-md text-sm"
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => void handleReject(listing.id)}
                              disabled={
                                actionLoading === listing.id ||
                                !rejectForms[listing.id]?.trim()
                              }
                            >
                              Confirm Rejection
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {/* Show rejection reason for rejected listings */}
                    {activeTab === 'REJECTED' && listing.rejectionReason && (
                      <tr key={`${listing.id}-reason`}>
                        <td colSpan={7} className="bg-red-50 px-4 pb-3 pt-0">
                          <p className="text-xs text-red-700">
                            <span className="font-semibold">Reason: </span>
                            {listing.rejectionReason}
                          </p>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {visible.map((listing) => (
              <div key={listing.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{listing.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {listing.locality}, {listing.city} &middot; {formatBHK(listing.bhkType)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      STATUS_BADGE[listing.status],
                    )}
                  >
                    {STATUS_LABEL[listing.status]}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-900">{formatPrice(listing.price)}</span>
                  <span className="text-gray-500">{listing.seller.name}</span>
                </div>

                <p className="mt-1 text-xs text-gray-400">
                  {new Date(listing.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>

                {activeTab === 'REJECTED' && listing.rejectionReason && (
                  <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">
                    <span className="font-semibold">Reason: </span>
                    {listing.rejectionReason}
                  </p>
                )}

                {activeTab === 'PENDING_REVIEW' && (
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => void handleApprove(listing.id)}
                        disabled={actionLoading === listing.id}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => toggleRejectForm(listing.id)}
                        disabled={actionLoading === listing.id}
                      >
                        {listing.id in rejectForms ? 'Cancel' : 'Reject'}
                      </Button>
                    </div>
                    {listing.id in rejectForms && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Reason for rejection..."
                          value={rejectForms[listing.id]}
                          onChange={(e) =>
                            setRejectForms((prev) => ({
                              ...prev,
                              [listing.id]: e.target.value,
                            }))
                          }
                          className="text-sm"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void handleReject(listing.id)}
                          disabled={
                            actionLoading === listing.id || !rejectForms[listing.id]?.trim()
                          }
                        >
                          Confirm
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      }
    >
      <AdminPageContent />
    </Suspense>
  )
}
