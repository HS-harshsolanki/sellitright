'use client'

import React, { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatPrice, formatBHK } from '@/lib/format'
import type { MockListing, ListingStatus } from '@/lib/mock-data'
import type { AuditEntry } from '@/lib/audit-log'

// ── Types ────────────────────────────────────────────────────────────────────

type TabValue = 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'DELETED' | 'AUDIT_LOG'

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
}

interface AuditResponse {
  entries: AuditEntry[]
  total: number
  page: number
  totalPages: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_TABS: { label: string; value: TabValue }[] = [
  { label: 'Pending Review', value: 'PENDING_REVIEW' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Deleted', value: 'DELETED' },
  { label: 'Audit Log', value: 'AUDIT_LOG' },
]

const STATUS_BADGE: Record<ListingStatus, string> = {
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  DELETED: 'bg-gray-200 text-gray-500 line-through',
  DRAFT: 'bg-gray-100 text-gray-700',
  SOLD: 'bg-blue-100 text-blue-800',
  INACTIVE: 'bg-gray-100 text-gray-700',
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
  { label: 'Villa', value: 'VILLA' },
  { label: 'Independent House', value: 'INDEPENDENT_HOUSE' },
  { label: 'Plot', value: 'PLOT' },
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

const AUDIT_ACTION_LABELS: Record<string, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  note_added: 'Note Added',
  status_changed: 'Status Changed',
  deleted: 'Deleted',
}

const AUDIT_ACTION_BADGE: Record<string, string> = {
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  note_added: 'bg-blue-100 text-blue-800',
  status_changed: 'bg-gray-100 text-gray-700',
  deleted: 'bg-gray-200 text-gray-600',
}

const PAGE_SIZES = [10, 25, 50]

// ── Detail Modal ──────────────────────────────────────────────────────────────

interface DetailModalProps {
  listing: MockListing
  adminKey: string
  onClose: () => void
  onApproved: (updated: MockListing) => void
  onRejected: (updated: MockListing) => void
  onDeleted: (updated: MockListing) => void
}

function DetailModal({ listing, adminKey, onClose, onApproved, onRejected, onDeleted }: DetailModalProps) {
  const [note, setNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [loading, setLoading] = useState<'approve' | 'reject' | 'note' | 'delete' | null>(null)
  const [noteSaved, setNoteSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    noteRef.current?.focus()
  }, [])

  // Close on Escape
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
      const res = await fetch(`/api/admin/listings/${listing.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ note: note.trim() || undefined }),
      })
      if (!res.ok) { setError('Failed to approve listing.'); return }
      const updated = (await res.json()) as MockListing
      onApproved(updated)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return
    setLoading('reject')
    setError(null)
    try {
      const res = await fetch(`/api/admin/listings/${listing.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ reason: rejectReason.trim(), note: note.trim() || undefined }),
      })
      if (!res.ok) { setError('Failed to reject listing.'); return }
      const updated = (await res.json()) as MockListing
      onRejected(updated)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  async function handleSaveNote() {
    if (!note.trim()) return
    setLoading('note')
    setError(null)
    try {
      const res = await fetch(`/api/admin/listings/${listing.id}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ note: note.trim() }),
      })
      if (!res.ok) { setError('Failed to save note.'); return }
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 3000)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  async function handleDelete() {
    setLoading('delete')
    setError(null)
    try {
      const res = await fetch(`/api/admin/listings/${listing.id}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ reason: deleteReason.trim() || undefined }),
      })
      if (!res.ok) { setError('Failed to delete listing.'); return }
      const updated = (await res.json()) as MockListing
      onDeleted(updated)
    } catch {
      setError('Network error. Please try again.')
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{listing.title}</h2>
            <p className="mt-0.5 text-xs text-gray-500">{listing.id}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-6 px-6 py-5">
          {/* Status + Age */}
          <div className="flex items-center gap-3">
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS_BADGE[listing.status])}>
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
                  <img
                    key={img.id}
                    src={img.url}
                    alt={img.caption ?? 'Property photo'}
                    className="h-40 w-60 shrink-0 rounded-lg object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Key Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Price</p>
              <p className="font-semibold text-gray-900">{formatPrice(listing.price)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Type</p>
              <p className="font-medium text-gray-900">{formatBHK(listing.bhkType)} · {listing.propertyType.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className="font-medium text-gray-900">{listing.locality}, {listing.city}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Area</p>
              <p className="font-medium text-gray-900">
                {listing.builtUpArea.toLocaleString('en-IN')} sq ft
                {listing.carpetArea ? ` (${listing.carpetArea.toLocaleString('en-IN')} carpet)` : ''}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Furnishing</p>
              <p className="font-medium text-gray-900">{listing.furnishing.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Submitted</p>
              <p className="font-medium text-gray-900">
                {new Date(listing.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Seller */}
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Seller</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{listing.seller.name}</p>
                <p className="text-sm text-gray-500">{listing.seller.phone}</p>
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
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Description</p>
            <p className="text-sm text-gray-700 leading-relaxed">{listing.description}</p>
          </div>

          {/* Rejection reason (if already rejected) */}
          {listing.status === 'REJECTED' && listing.rejectionReason && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Rejection Reason</p>
              <p className="mt-1 text-sm text-red-800">{listing.rejectionReason}</p>
            </div>
          )}

          {/* Verification Note */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Internal Verification Note <span className="font-normal normal-case text-gray-400">(optional — saved to audit log)</span>
            </label>
            <textarea
              ref={noteRef}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="E.g. verified via callback, photos look authentic, price matches locality..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            {note.trim() && listing.status !== 'PENDING_REVIEW' && (
              <button
                onClick={() => void handleSaveNote()}
                disabled={loading === 'note'}
                className="mt-1.5 text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
              >
                {loading === 'note' ? 'Saving...' : noteSaved ? 'Saved ✓' : 'Save note to audit log'}
              </button>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>

        {/* Actions — only for pending */}
        {listing.status === 'PENDING_REVIEW' && (
          <div className="border-t border-gray-200 px-6 py-4">
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
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Rejection reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  >
                    <option value="">Select a reason...</option>
                    <option value="Fake or misleading listing">Fake or misleading listing</option>
                    <option value="Low quality or missing photos">Low quality or missing photos</option>
                    <option value="Incorrect price or details">Incorrect price or details</option>
                    <option value="Duplicate listing">Duplicate listing</option>
                    <option value="Inaccurate location">Inaccurate location</option>
                    <option value="Broker listing (direct owners only)">Broker listing (direct owners only)</option>
                    <option value="Other — see verification note">Other — see verification note</option>
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
                    onClick={() => { setShowRejectForm(false); setRejectReason('') }}
                    disabled={loading !== null}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Delete — available for all statuses except already-deleted */}
        {listing.status !== 'DELETED' && (
          <div className={cn('px-6 py-4', listing.status === 'PENDING_REVIEW' ? 'border-t border-dashed border-gray-200' : 'border-t border-gray-200')}>
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
                  You are about to permanently hide <span className="font-semibold">{listing.title}</span>. This listing will no longer be visible to sellers or buyers.
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Reason <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="E.g. fraudulent listing, reported by multiple users..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
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
                    onClick={() => { setShowDeleteConfirm(false); setDeleteReason('') }}
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

// ── Audit Log Tab ─────────────────────────────────────────────────────────────

interface AuditLogTabProps {
  adminKey: string
}

function AuditLogTab({ adminKey }: AuditLogTabProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const limit = 25

  const fetchAuditLog = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (actionFilter) params.set('action', actionFilter)
      const res = await fetch(`/api/admin/audit-log?${params.toString()}`, {
        headers: { 'x-admin-key': adminKey },
      })
      if (!res.ok) { setError('Failed to load audit log.'); return }
      const data = (await res.json()) as AuditResponse
      setEntries(data.entries)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [adminKey, page, actionFilter])

  useEffect(() => { void fetchAuditLog() }, [fetchAuditLog])

  if (loading) return <p className="py-10 text-center text-sm text-gray-500">Loading audit log...</p>
  if (error) return <p className="py-10 text-center text-sm text-red-600">{error}</p>

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">All Actions</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="note_added">Note Added</option>
          <option value="deleted">Deleted</option>
        </select>
        <span className="text-sm text-gray-500">{total} entries</span>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-500">No audit log entries yet.</p>
          <p className="mt-1 text-xs text-gray-400">Actions will appear here after you approve or reject listings.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Listing</th>
                  <th className="px-4 py-3">Status Change</th>
                  <th className="px-4 py-3">Reason / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className="align-top hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                      {new Date(entry.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                      <br />
                      <span className="text-gray-400">
                        {new Date(entry.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', AUDIT_ACTION_BADGE[entry.action] ?? 'bg-gray-100 text-gray-700')}>
                        {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                      </span>
                    </td>
                    <td className="max-w-[200px] px-4 py-3">
                      <p className="truncate font-medium text-gray-900">{entry.listing_title}</p>
                      <p className="truncate text-xs text-gray-400">{entry.listing_id}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {entry.previous_status && entry.new_status ? (
                        <span>{entry.previous_status} → {entry.new_status}</span>
                      ) : '—'}
                    </td>
                    <td className="max-w-[240px] px-4 py-3 text-xs text-gray-600">
                      {entry.reason ? (
                        <span className="line-clamp-2">{entry.reason}</span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main Admin Page ───────────────────────────────────────────────────────────

const STORAGE_KEY = 'sir-admin-key'

function AdminPageContent() {
  const [adminKey, setAdminKey] = useState('')
  const [keyInput, setKeyInput] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setAdminKey(stored)
  }, [])

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    const key = keyInput.trim()
    if (!key) return
    setLoginLoading(true)
    setLoginError(null)
    try {
      const res = await fetch('/api/admin/listings?limit=10', {
        headers: { 'x-admin-key': key },
      })
      if (res.ok) {
        localStorage.setItem(STORAGE_KEY, key)
        setAdminKey(key)
      } else {
        setLoginError(res.status === 401 ? 'Invalid admin key.' : 'Unable to verify key. Try again.')
      }
    } catch {
      setLoginError('Network error. Please try again.')
    } finally {
      setLoginLoading(false)
    }
  }

  function handleLock() {
    localStorage.removeItem(STORAGE_KEY)
    setAdminKey('')
    setKeyInput('')
    setLoginError(null)
  }

  const [listings, setListings] = useState<MockListing[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabValue>('PENDING_REVIEW')
  const [counts, setCounts] = useState<StatusCounts>({ PENDING_REVIEW: 0, ACTIVE: 0, REJECTED: 0, DELETED: 0 })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [isMockFallback, setIsMockFallback] = useState(false)

  // Search + filters (persist across tabs)
  const [query, setQuery] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('')
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Detail modal
  const [selectedListing, setSelectedListing] = useState<MockListing | null>(null)

  // Per-listing inline reject
  const [rejectForms, setRejectForms] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasFilters = query || cityFilter || propertyTypeFilter

  const fetchListings = useCallback(async (resetPage = false) => {
    if (activeTab === 'AUDIT_LOG') return
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

      const res = await fetch(`/api/admin/listings?${params.toString()}`, {
        headers: { 'x-admin-key': adminKey },
      })
      if (!res.ok) {
        setError(res.status === 401 ? 'Unauthorized' : 'Failed to load listings')
        return
      }
      const data = (await res.json()) as ListingsResponse & { _mockFallback?: boolean }
      setListings(data.listings)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      setCounts(data.counts)
      setIsMockFallback(data._mockFallback === true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [adminKey, activeTab, page, pageSize, query, cityFilter, propertyTypeFilter])

  useEffect(() => {
    if (adminKey && activeTab !== 'AUDIT_LOG') {
      void fetchListings()
    } else if (!adminKey) {
      setLoading(false)
    }
  }, [adminKey, activeTab, page, pageSize]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  function handleQueryChange(val: string) {
    setQuery(val)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => {
      void fetchListings(true)
    }, 400)
  }

  function handleFilterChange(setter: (v: string) => void, val: string) {
    setter(val)
    setTimeout(() => void fetchListings(true), 0)
  }

  function clearFilters() {
    setQuery('')
    setCityFilter('')
    setPropertyTypeFilter('')
    setTimeout(() => void fetchListings(true), 0)
  }

  async function handleApprove(id: string) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/listings/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({}),
      })
      if (!res.ok) return
      const updated = (await res.json()) as MockListing
      // Optimistic: remove from pending list
      setListings((prev) => prev.filter((l) => l.id !== updated.id))
      setCounts((prev) => ({
        ...prev,
        PENDING_REVIEW: Math.max(0, prev.PENDING_REVIEW - 1),
        ACTIVE: prev.ACTIVE + 1,
      }))
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(id: string) {
    const reason = rejectForms[id]?.trim()
    if (!reason) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/listings/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) return
      const updated = (await res.json()) as MockListing
      setListings((prev) => prev.filter((l) => l.id !== updated.id))
      setCounts((prev) => ({
        ...prev,
        PENDING_REVIEW: Math.max(0, prev.PENDING_REVIEW - 1),
        REJECTED: prev.REJECTED + 1,
      }))
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

  // ── Login form ────────────────────────────────────────────────────────────
  if (!adminKey) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <form
          onSubmit={(e) => void handleUnlock(e)}
          className="w-full max-w-sm space-y-4"
        >
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin Access</h1>
            <p className="mt-1 text-sm text-gray-500">Enter your admin key to continue.</p>
          </div>
          <Input
            type="password"
            placeholder="Admin key"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            autoFocus
            autoComplete="current-password"
          />
          {loginError && (
            <p className="text-sm text-red-600">{loginError}</p>
          )}
          <Button type="submit" className="w-full" disabled={loginLoading || !keyInput.trim()}>
            {loginLoading ? 'Verifying...' : 'Unlock'}
          </Button>
        </form>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading && listings.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-500">Loading listings...</p>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
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

  return (
    <>
      {/* Detail Modal */}
      {selectedListing && (
        <DetailModal
          listing={selectedListing}
          adminKey={adminKey}
          onClose={() => setSelectedListing(null)}
          onApproved={(updated) => {
            setListings((prev) => prev.filter((l) => l.id !== updated.id))
            setCounts((prev) => ({ ...prev, PENDING_REVIEW: Math.max(0, prev.PENDING_REVIEW - 1), ACTIVE: prev.ACTIVE + 1 }))
            setSelectedListing(null)
          }}
          onRejected={(updated) => {
            setListings((prev) => prev.filter((l) => l.id !== updated.id))
            setCounts((prev) => ({ ...prev, PENDING_REVIEW: Math.max(0, prev.PENDING_REVIEW - 1), REJECTED: prev.REJECTED + 1 }))
            setSelectedListing(null)
          }}
          onDeleted={(updated) => {
            setListings((prev) => prev.filter((l) => l.id !== updated.id))
            setCounts((prev) => ({
              ...prev,
              [activeTab]: Math.max(0, (prev[activeTab as keyof StatusCounts] ?? 0) - 1),
              DELETED: prev.DELETED + 1,
            }))
            setSelectedListing(null)
          }}
        />
      )}

      <div>
        {/* Mock fallback warning — shown when SUPABASE_SERVICE_ROLE_KEY is missing */}
        {isMockFallback && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">Showing demo data — real listings not visible</p>
              <p className="mt-0.5 text-xs text-amber-700">
                <code className="rounded bg-amber-100 px-1 py-0.5">SUPABASE_SERVICE_ROLE_KEY</code> is not set in <code className="rounded bg-amber-100 px-1 py-0.5">.env.local</code>.
                Add it from Supabase Dashboard → Settings → API → service_role key, then restart the server.
              </p>
            </div>
          </div>
        )}

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Listing Review</h1>
            <p className="mt-1 text-sm text-gray-500">
              Approve or reject property listings submitted by sellers.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLock} className="shrink-0">
            Lock
          </Button>
        </div>

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
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
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Deleted</p>
            <p className="mt-1 text-2xl font-bold text-gray-700">{counts.DELETED}</p>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            type="search"
            placeholder="Search title, city, seller name or phone..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="max-w-xs text-sm"
          />
          <select
            value={cityFilter}
            onChange={(e) => handleFilterChange(setCityFilter, e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
          >
            {CITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={propertyTypeFilter}
            onChange={(e) => handleFilterChange(setPropertyTypeFilter, e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
          >
            {PROPERTY_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs font-medium text-gray-500 hover:text-gray-900 underline">
              Clear filters
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 border-b border-gray-200">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setActiveTab(tab.value); setPage(1) }}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.value
                  ? 'border-b-2 border-gray-900 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {tab.label}
              {tab.value !== 'AUDIT_LOG' && (
                <span className={cn(
                  'ml-2 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                  activeTab === tab.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600',
                )}>
                  {counts[tab.value as keyof StatusCounts]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Audit Log Tab */}
        {activeTab === 'AUDIT_LOG' ? (
          <AuditLogTab adminKey={adminKey} />
        ) : listings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white py-16 text-center">
            <p className="text-sm text-gray-500">
              {hasFilters ? 'No listings match your search.' : 'No listings in this category.'}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-2 text-xs font-medium text-blue-600 hover:underline">
                Clear filters
              </button>
            )}
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
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {listings.map((listing) => {
                    const daysPending = Math.floor(
                      (Date.now() - new Date(listing.createdAt).getTime()) / (1000 * 60 * 60 * 24),
                    )
                    return (
                      <React.Fragment key={listing.id}>
                        <tr
                          className="cursor-pointer align-top hover:bg-gray-50"
                          onClick={() => setSelectedListing(listing)}
                        >
                          <td className="max-w-[220px] px-4 py-3">
                            <p className="truncate font-medium text-gray-900">{listing.title}</p>
                            <p className="truncate text-xs text-gray-400">{listing.id}</p>
                            {daysPending > 7 && listing.status === 'PENDING_REVIEW' && (
                              <span className="mt-0.5 inline-block rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                                {daysPending}d overdue
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {listing.locality}, {listing.city}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{formatBHK(listing.bhkType)}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {formatPrice(listing.price)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <p>{listing.seller.name}</p>
                            <p className="text-xs text-gray-400">{listing.seller.phone}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {new Date(listing.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS_BADGE[listing.status])}>
                              {STATUS_LABEL[listing.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => setSelectedListing(listing)}>
                                Review
                              </Button>
                              {activeTab === 'PENDING_REVIEW' && (
                                <>
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
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {/* Inline reject row */}
                        {activeTab === 'PENDING_REVIEW' && listing.id in rejectForms && (
                          <tr key={`${listing.id}-reject`}>
                            <td colSpan={8} className="bg-red-50 px-4 py-3">
                              <div className="flex items-center gap-3">
                                <select
                                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                                  value={rejectForms[listing.id]}
                                  onChange={(e) => setRejectForms((prev) => ({ ...prev, [listing.id]: e.target.value }))}
                                >
                                  <option value="">Select a reason...</option>
                                  <option value="Fake or misleading listing">Fake or misleading listing</option>
                                  <option value="Low quality or missing photos">Low quality or missing photos</option>
                                  <option value="Incorrect price or details">Incorrect price or details</option>
                                  <option value="Duplicate listing">Duplicate listing</option>
                                  <option value="Inaccurate location">Inaccurate location</option>
                                  <option value="Broker listing (direct owners only)">Broker listing (direct owners only)</option>
                                  <option value="Other — see verification note">Other</option>
                                </select>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => void handleReject(listing.id)}
                                  disabled={actionLoading === listing.id || !rejectForms[listing.id]?.trim()}
                                >
                                  Confirm Rejection
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )}
                        {/* Rejection reason for rejected tab */}
                        {activeTab === 'REJECTED' && listing.rejectionReason && (
                          <tr key={`${listing.id}-reason`}>
                            <td colSpan={8} className="bg-red-50 px-4 pb-3 pt-0">
                              <p className="text-xs text-red-700">
                                <span className="font-semibold">Reason: </span>
                                {listing.rejectionReason}
                              </p>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                  onClick={() => setSelectedListing(listing)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{listing.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {listing.locality}, {listing.city} · {formatBHK(listing.bhkType)}
                      </p>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS_BADGE[listing.status])}>
                      {STATUS_LABEL[listing.status]}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-900">{formatPrice(listing.price)}</span>
                    <span className="text-gray-500">{listing.seller.name}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(listing.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  {activeTab === 'REJECTED' && listing.rejectionReason && (
                    <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">
                      <span className="font-semibold">Reason: </span>{listing.rejectionReason}
                    </p>
                  )}
                  {activeTab === 'PENDING_REVIEW' && (
                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" className="w-full" onClick={() => setSelectedListing(listing)}>
                        Review & Act
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                  className="rounded border border-gray-200 px-2 py-1 text-sm"
                >
                  {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <span>per page · {total} total</span>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    ← Prev
                  </Button>
                  <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
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
