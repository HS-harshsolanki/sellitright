'use client'

import NextImage from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react'

import { useAdminAuth } from '@/components/admin/admin-auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatPrice, formatBHK } from '@/lib/format'
import type { MockListing, ListingStatus } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type TabValue = 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'DELETED'

interface StatusCounts {
  PENDING_REVIEW: number
  ACTIVE: number
  REJECTED: number
  DELETED: number
}

interface ListingsResponse {
  listings: MockListing[]
  total: number
  page: number
  totalPages: number
  counts: StatusCounts
  _mockFallback?: boolean
}

const STATUS_BADGE: Record<ListingStatus, string> = {
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  DELETED: 'bg-[var(--color-border)] text-[var(--color-muted-foreground)] line-through',
  DRAFT: 'bg-[var(--color-muted)] text-[var(--color-foreground)]',
  SOLD: 'bg-blue-100 text-blue-800',
  INACTIVE: 'bg-[var(--color-muted)] text-[var(--color-foreground)]',
}

const STATUS_LABEL: Record<ListingStatus, string> = {
  PENDING_REVIEW: 'Pending',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  DELETED: 'Deleted',
  DRAFT: 'Draft',
  SOLD: 'Sold',
  INACTIVE: 'Inactive',
}

const PROPERTY_TYPE_OPTIONS = [
  { label: 'All Types', value: '' },
  { label: 'Apartment', value: 'APARTMENT' },
  { label: 'Penthouse', value: 'PENTHOUSE' },
]

const CITY_OPTIONS = [
  { label: 'All Cities', value: '' },
  { label: 'Bengaluru', value: 'Bengaluru' },
  { label: 'Mumbai', value: 'Mumbai' },
  { label: 'Pune', value: 'Pune' },
  { label: 'Hyderabad', value: 'Hyderabad' },
  { label: 'Chennai', value: 'Chennai' },
  { label: 'Delhi', value: 'Delhi' },
]

const PAGE_SIZES = [10, 25, 50]

// ── Detail Modal ───────────────────────────────────────────────────────────────

interface DetailModalProps {
  listing: MockListing
  onClose: () => void
  onApproved: (updated: MockListing) => void
  onRejected: (updated: MockListing) => void
  onDeleted: (updated: MockListing) => void
  onVerifyToggled: (updated: MockListing) => void
}

function DetailModal({
  listing,
  onClose,
  onApproved,
  onRejected,
  onDeleted,
  onVerifyToggled,
}: DetailModalProps) {
  const { apiFetch } = useAdminAuth()
  const [note, setNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [loading, setLoading] = useState<
    'approve' | 'reject' | 'note' | 'delete' | 'verify' | null
  >(null)
  const [noteSaved, setNoteSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    noteRef.current?.focus()
  }, [])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleApprove() {
    setLoading('approve')
    setError(null)
    try {
      const res = await apiFetch(`/api/admin/listings/${listing.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ note: note.trim() || undefined }),
      })
      if (!res.ok) {
        setError('Failed to approve listing.')
        return
      }
      const updated = (await res.json()) as MockListing
      onApproved(updated)
    } catch {
      setError('Network error.')
    } finally {
      setLoading(null)
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return
    setLoading('reject')
    setError(null)
    try {
      const res = await apiFetch(`/api/admin/listings/${listing.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim(), note: note.trim() || undefined }),
      })
      if (!res.ok) {
        setError('Failed to reject listing.')
        return
      }
      const updated = (await res.json()) as MockListing
      onRejected(updated)
    } catch {
      setError('Network error.')
    } finally {
      setLoading(null)
    }
  }

  async function handleSaveNote() {
    if (!note.trim()) return
    setLoading('note')
    setError(null)
    try {
      const res = await apiFetch(`/api/admin/listings/${listing.id}/note`, {
        method: 'POST',
        body: JSON.stringify({ note: note.trim() }),
      })
      if (!res.ok) {
        setError('Failed to save note.')
        return
      }
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 3000)
    } catch {
      setError('Network error.')
    } finally {
      setLoading(null)
    }
  }

  async function handleVerify() {
    setLoading('verify')
    setError(null)
    try {
      const res = await apiFetch(`/api/admin/listings/${listing.id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verified: !listing.isVerified }),
      })
      if (!res.ok) {
        setError('Failed to update verification status.')
        return
      }
      const updated = (await res.json()) as MockListing
      onVerifyToggled(updated)
    } catch {
      setError('Network error.')
    } finally {
      setLoading(null)
    }
  }

  async function handleDelete() {
    setLoading('delete')
    setError(null)
    try {
      const res = await apiFetch(`/api/admin/listings/${listing.id}/delete`, {
        method: 'POST',
        body: JSON.stringify({ reason: deleteReason.trim() || undefined }),
      })
      if (!res.ok) {
        setError('Failed to delete listing.')
        return
      }
      const updated = (await res.json()) as MockListing
      onDeleted(updated)
    } catch {
      setError('Network error.')
    } finally {
      setLoading(null)
    }
  }

  const daysPending = Math.floor(
    (Date.now() - new Date(listing.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-foreground)]">
              {listing.title}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{listing.id}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-6 px-6 py-5">
          {/* Status + Age */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                STATUS_BADGE[listing.status],
              )}
            >
              {STATUS_LABEL[listing.status]}
            </span>
            {daysPending > 7 && listing.status === 'PENDING_REVIEW' && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                {daysPending}d pending — overdue
              </span>
            )}
            {listing.isVerified && (
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                Verified
              </span>
            )}
          </div>

          {/* Photos */}
          {listing.images.length > 0 && (
            <div className="overflow-x-auto">
              <div className="flex gap-2 pb-1">
                {listing.images.map((img) => (
                  <NextImage
                    key={img.id}
                    src={img.url}
                    alt={img.caption ?? 'Property photo'}
                    width={240}
                    height={160}
                    className="h-40 w-60 shrink-0 rounded-lg object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Key Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Price</p>
              <p className="font-semibold text-[var(--color-foreground)]">
                {formatPrice(listing.price)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Type</p>
              <p className="font-medium text-[var(--color-foreground)]">
                {formatBHK(listing.bhkType)} · {listing.propertyType.replace(/_/g, ' ')}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Location</p>
              <p className="font-medium text-[var(--color-foreground)]">
                {listing.locality}, {listing.city}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Area</p>
              <p className="font-medium text-[var(--color-foreground)]">
                {listing.builtUpArea.toLocaleString('en-IN')} sq ft
                {listing.carpetArea
                  ? ` (${listing.carpetArea.toLocaleString('en-IN')} carpet)`
                  : ''}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Furnishing</p>
              <p className="font-medium text-[var(--color-foreground)]">
                {listing.furnishing.replace(/_/g, ' ')}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Submitted</p>
              <p className="font-medium text-[var(--color-foreground)]">
                {new Date(listing.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Seller */}
          <div className="rounded-lg border border-[var(--color-border)] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Seller
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-foreground)]">{listing.seller.name}</p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {listing.seller.phone}
                </p>
              </div>
              {listing.seller.isVerified && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                  Verified Seller
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Description
            </p>
            <p className="text-sm leading-relaxed text-[var(--color-foreground)]">
              {listing.description}
            </p>
          </div>

          {/* Rejection reason */}
          {listing.status === 'REJECTED' && listing.rejectionReason && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                Rejection Reason
              </p>
              <p className="mt-1 text-sm text-red-800">{listing.rejectionReason}</p>
            </div>
          )}

          {/* Internal Note */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Internal Note{' '}
              <span className="font-normal normal-case">(optional — saved to audit log)</span>
            </label>
            <textarea
              ref={noteRef}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="E.g. verified via callback, photos look authentic..."
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-foreground)]"
            />
            {note.trim() && listing.status !== 'PENDING_REVIEW' && (
              <button
                onClick={() => void handleSaveNote()}
                disabled={loading === 'note'}
                className="mt-1.5 text-xs font-medium text-[var(--color-accent)] hover:underline disabled:opacity-50"
              >
                {loading === 'note'
                  ? 'Saving...'
                  : noteSaved
                    ? 'Saved ✓'
                    : 'Save note to audit log'}
              </button>
            )}
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        {/* Approve / Reject */}
        {listing.status === 'PENDING_REVIEW' && (
          <div className="border-t border-[var(--color-border)] px-6 py-4">
            {!showRejectForm ? (
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => void handleApprove()}
                  disabled={loading !== null}
                >
                  {loading === 'approve' ? 'Approving...' : 'Approve'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => setShowRejectForm(true)}
                  disabled={loading !== null}
                >
                  Reject
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-foreground)]">
                    Rejection reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  >
                    <option value="">Select a reason...</option>
                    <option value="Fake or misleading listing">Fake or misleading listing</option>
                    <option value="Low quality or missing photos">
                      Low quality or missing photos
                    </option>
                    <option value="Incorrect price or details">Incorrect price or details</option>
                    <option value="Duplicate listing">Duplicate listing</option>
                    <option value="Inaccurate location">Inaccurate location</option>
                    <option value="Broker listing (direct owners only)">
                      Broker listing (direct owners only)
                    </option>
                    <option value="Other — see verification note">
                      Other — see verification note
                    </option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => void handleReject()}
                    disabled={loading !== null || !rejectReason}
                  >
                    {loading === 'reject' ? 'Rejecting...' : 'Confirm Rejection'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectForm(false)
                      setRejectReason('')
                    }}
                    disabled={loading !== null}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Verify toggle */}
        <div className="border-t border-[var(--color-border)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">Verification</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {listing.isVerified
                  ? 'This listing is verified by your team.'
                  : 'Mark as verified once you have confirmed its legitimacy.'}
              </p>
            </div>
            {listing.isVerified ? (
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  ✓ Verified
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => void handleVerify()}
                  disabled={loading !== null}
                >
                  {loading === 'verify' ? '...' : 'Remove'}
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => void handleVerify()}
                disabled={loading !== null}
              >
                {loading === 'verify' ? 'Saving...' : 'Mark Verified'}
              </Button>
            )}
          </div>
        </div>

        {/* Delete */}
        {listing.status !== 'DELETED' && (
          <div
            className={cn(
              'px-6 py-4',
              listing.status === 'PENDING_REVIEW'
                ? 'border-t border-dashed border-[var(--color-border)]'
                : 'border-t border-[var(--color-border)]',
            )}
          >
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading !== null}
                className="text-xs font-medium text-red-500 hover:text-red-700 hover:underline disabled:opacity-40"
              >
                Delete listing
              </button>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                  You are about to permanently hide{' '}
                  <span className="font-semibold">{listing.title}</span>.
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-foreground)]">
                    Reason{' '}
                    <span className="font-normal text-[var(--color-muted-foreground)]">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="E.g. fraudulent listing..."
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => void handleDelete()}
                    disabled={loading !== null}
                  >
                    {loading === 'delete' ? 'Deleting...' : 'Confirm Delete'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteReason('')
                    }}
                    disabled={loading !== null}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths}mo ago`
  return `${Math.floor(diffMonths / 12)}y ago`
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ── Main Listings Page ─────────────────────────────────────────────────────────

function AdminListingsPageInner() {
  const { apiFetch } = useAdminAuth()
  const searchParamsHook = useSearchParams()
  const router = useRouter()
  const [listings, setListings] = useState<MockListing[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabValue>(() => {
    const t = searchParamsHook.get('tab') as TabValue | null
    const valid: TabValue[] = ['PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'DELETED']
    return valid.includes(t!) ? t! : 'PENDING_REVIEW'
  })
  const [counts, setCounts] = useState<StatusCounts>({
    PENDING_REVIEW: 0,
    ACTIVE: 0,
    REJECTED: 0,
    DELETED: 0,
  })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [isMockFallback, setIsMockFallback] = useState(false)
  const [query, setQuery] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('')
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedListing, setSelectedListing] = useState<MockListing | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchListings = useCallback(
    async (resetPage = false) => {
      setLoading(true)
      const p = resetPage ? 1 : page
      if (resetPage) setPage(1)
      try {
        const params = new URLSearchParams({
          status: activeTab,
          page: String(p),
          limit: String(pageSize),
          sortBy: 'oldest',
        })
        if (query) params.set('q', query)
        if (cityFilter) params.set('city', cityFilter)
        if (propertyTypeFilter) params.set('propertyType', propertyTypeFilter)

        const res = await apiFetch(`/api/admin/listings?${params.toString()}`)
        if (!res.ok) {
          setError(res.status === 401 ? 'Unauthorized' : 'Failed to load listings')
          return
        }
        const data = (await res.json()) as ListingsResponse
        setListings(data.listings)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        setCounts(data.counts)
        setIsMockFallback(data._mockFallback === true)
      } catch {
        setError('Network error.')
      } finally {
        setLoading(false)
      }
    },
    [apiFetch, activeTab, page, pageSize, query, cityFilter, propertyTypeFilter],
  )

  useEffect(() => {
    void fetchListings()
  }, [activeTab, page, pageSize]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleQueryChange(val: string) {
    setQuery(val)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => void fetchListings(true), 400)
  }

  function handleFilterChange(setter: (v: string) => void, val: string) {
    setter(val)
    setTimeout(() => void fetchListings(true), 0)
  }

  async function handleVerifyToggle(id: string, currentlyVerified: boolean) {
    try {
      const res = await apiFetch(`/api/admin/listings/${id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verified: !currentlyVerified }),
      })
      if (!res.ok) return
      const updated = (await res.json()) as MockListing
      setListings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
    } catch {
      // ignore
    }
  }

  if (error)
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-600">{error}</p>
        <Button
          variant="outline"
          onClick={() => {
            setError(null)
            void fetchListings()
          }}
        >
          Retry
        </Button>
      </div>
    )

  return (
    <>
      {selectedListing && (
        <DetailModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onApproved={(updated) => {
            setListings((p) => p.filter((l) => l.id !== updated.id))
            setCounts((p) => ({
              ...p,
              PENDING_REVIEW: Math.max(0, p.PENDING_REVIEW - 1),
              ACTIVE: p.ACTIVE + 1,
            }))
            setSelectedListing(null)
          }}
          onRejected={(updated) => {
            setListings((p) => p.filter((l) => l.id !== updated.id))
            setCounts((p) => ({
              ...p,
              PENDING_REVIEW: Math.max(0, p.PENDING_REVIEW - 1),
              REJECTED: p.REJECTED + 1,
            }))
            setSelectedListing(null)
          }}
          onDeleted={(updated) => {
            setListings((p) => p.filter((l) => l.id !== updated.id))
            setCounts((p) => ({
              ...p,
              [activeTab]: Math.max(0, (p[activeTab as keyof StatusCounts] ?? 0) - 1),
              DELETED: p.DELETED + 1,
            }))
            setSelectedListing(null)
          }}
          onVerifyToggled={(updated) => {
            setListings((p) => p.map((l) => (l.id === updated.id ? updated : l)))
            setSelectedListing(updated)
          }}
        />
      )}

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Listing Review</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Approve or reject property listings submitted by sellers.
          </p>
        </div>

        {isMockFallback && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Showing demo data — real listings not visible
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                <code className="rounded bg-amber-100 px-1 py-0.5">SUPABASE_SERVICE_ROLE_KEY</code>{' '}
                not set.
              </p>
            </div>
          </div>
        )}

        {/* Status nav tiles — clicking selects the view */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Pending */}
          <button
            onClick={() => {
              setActiveTab('PENDING_REVIEW')
              setPage(1)
              router.replace('/admin/listings?tab=PENDING_REVIEW')
            }}
            className={cn(
              'group rounded-xl border bg-white px-4 py-4 text-left transition-all',
              'border-l-[3px]',
              activeTab === 'PENDING_REVIEW'
                ? 'border-amber-300 border-l-amber-400 bg-amber-50/60 shadow-sm'
                : 'border-[var(--color-border)] border-l-amber-400 hover:shadow-sm',
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Pending
            </p>
            <p className="mt-1.5 text-2xl font-bold text-[var(--color-foreground)]">
              {counts.PENDING_REVIEW}
            </p>
          </button>

          {/* Active */}
          <button
            onClick={() => {
              setActiveTab('ACTIVE')
              setPage(1)
              router.replace('/admin/listings?tab=ACTIVE')
            }}
            className={cn(
              'group rounded-xl border bg-white px-4 py-4 text-left transition-all',
              'border-l-[3px]',
              activeTab === 'ACTIVE'
                ? 'border-green-300 border-l-green-500 bg-green-50/60 shadow-sm'
                : 'border-[var(--color-border)] border-l-green-500 hover:shadow-sm',
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Active
            </p>
            <p className="mt-1.5 text-2xl font-bold text-[var(--color-foreground)]">
              {counts.ACTIVE}
            </p>
          </button>

          {/* Rejected */}
          <button
            onClick={() => {
              setActiveTab('REJECTED')
              setPage(1)
              router.replace('/admin/listings?tab=REJECTED')
            }}
            className={cn(
              'group rounded-xl border bg-white px-4 py-4 text-left transition-all',
              'border-l-[3px]',
              activeTab === 'REJECTED'
                ? 'border-red-300 border-l-red-500 bg-red-50/60 shadow-sm'
                : 'border-[var(--color-border)] border-l-red-500 hover:shadow-sm',
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Rejected
            </p>
            <p className="mt-1.5 text-2xl font-bold text-[var(--color-foreground)]">
              {counts.REJECTED}
            </p>
          </button>

          {/* Deleted */}
          <button
            onClick={() => {
              setActiveTab('DELETED')
              setPage(1)
              router.replace('/admin/listings?tab=DELETED')
            }}
            className={cn(
              'group rounded-xl border bg-white px-4 py-4 text-left transition-all',
              'border-l-[3px]',
              activeTab === 'DELETED'
                ? 'bg-[var(--color-muted)]/60 border-[var(--color-border)] border-l-[var(--color-muted-foreground)] shadow-sm'
                : 'border-[var(--color-border)] border-l-[var(--color-muted-foreground)] hover:shadow-sm',
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Deleted
            </p>
            <p className="mt-1.5 text-2xl font-bold text-[var(--color-foreground)]">
              {counts.DELETED}
            </p>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search title, city, locality..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="max-w-xs"
          />
          <select
            value={cityFilter}
            onChange={(e) => handleFilterChange(setCityFilter, e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none"
          >
            {CITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={propertyTypeFilter}
            onChange={(e) => handleFilterChange(setPropertyTypeFilter, e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none"
          >
            {PROPERTY_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {(query || cityFilter || propertyTypeFilter) && (
            <button
              onClick={() => {
                setQuery('')
                setCityFilter('')
                setPropertyTypeFilter('')
                setTimeout(() => void fetchListings(true), 0)
              }}
              className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              Clear filters ×
            </button>
          )}
        </div>

        {/* Table */}
        {loading && listings.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">Loading listings...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white py-16 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">No listings found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
              {/* Desktop table */}
              <table className="hidden w-full text-sm md:table">
                <thead className="bg-[var(--color-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  <tr>
                    <th className="px-4 py-2.5">Listing</th>
                    <th className="px-4 py-2.5">Location</th>
                    <th className="px-4 py-2.5">Price</th>
                    <th className="px-4 py-2.5">Seller</th>
                    <th className="px-4 py-2.5">Submitted</th>
                    <th className="px-4 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {listings.map((listing) => (
                    <tr
                      key={listing.id}
                      className="cursor-pointer hover:bg-[var(--color-muted)]"
                      onClick={() => setSelectedListing(listing)}
                    >
                      <td className="max-w-[220px] px-4 py-2.5">
                        <p className="truncate font-medium text-[var(--color-foreground)]">
                          {listing.title}
                        </p>
                        <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                          {formatBHK(listing.bhkType)} · {listing.propertyType.replace(/_/g, ' ')}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[var(--color-muted-foreground)]">
                        {listing.locality}, {listing.city}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium text-[var(--color-foreground)]">
                        {formatPrice(listing.price)}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-sm text-[var(--color-foreground)]">
                          {listing.seller.name}
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {listing.seller.phone}
                        </p>
                      </td>
                      <td
                        className="whitespace-nowrap px-4 py-2.5 text-xs text-[var(--color-muted-foreground)]"
                        title={formatFullDate(listing.createdAt)}
                      >
                        {formatRelativeTime(listing.createdAt)}
                      </td>
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {listing.status === 'PENDING_REVIEW' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedListing(listing)}
                            >
                              Review →
                            </Button>
                          )}
                          {listing.status !== 'DELETED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className={
                                listing.isVerified
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              }
                              onClick={() =>
                                void handleVerifyToggle(listing.id, listing.isVerified)
                              }
                            >
                              {listing.isVerified ? '✓ Verified' : 'Verify'}
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
                {listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="cursor-pointer p-4 hover:bg-[var(--color-muted)]"
                    onClick={() => setSelectedListing(listing)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-[var(--color-foreground)]">
                          {listing.title}
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {listing.locality}, {listing.city}
                        </p>
                      </div>
                      <span
                        className="shrink-0 whitespace-nowrap text-xs text-[var(--color-muted-foreground)]"
                        title={formatFullDate(listing.createdAt)}
                      >
                        {formatRelativeTime(listing.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                      {formatPrice(listing.price)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--color-muted-foreground)]">{total} total</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  }}
                  className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-sm focus:outline-none"
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s} per page
                    </option>
                  ))}
                </select>
              </div>
              {totalPages > 1 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ← Prev
                  </Button>
                  <span className="flex items-center px-2 text-sm text-[var(--color-muted-foreground)]">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next →
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default function AdminListingsPage() {
  return (
    <Suspense>
      <AdminListingsPageInner />
    </Suspense>
  )
}
