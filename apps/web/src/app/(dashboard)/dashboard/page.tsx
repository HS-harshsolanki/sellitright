'use client'

import {
  Eye,
  LayoutGrid,
  MapPin,
  Plus,
  TrendingUp,
  AlertCircle,
  Loader2,
  Users,
  Phone,
  Mail,
  PlayCircle,
  Undo2,
  ExternalLink,
  // IndianRupee, /* PAYMENT_DISABLED */
  ChevronRight,
  Pencil,
  BedDouble,
  Bath,
  Maximize2,
  MessageSquare,
  Share2,
  Trash2,
  ShieldCheck,
  MoreHorizontal,
  Home,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { useToast } from '@/components/ui/toast'
import { QualityScoreBadge } from '@/components/listing/quality-score-panel'
import { formatPrice } from '@/lib/format'
import { useMessaging } from '@/lib/messaging-context'
import type { MockListing, ListingStatus } from '@/lib/mock-data'
import { getImprovementActions, type QualityBreakdown } from '@/lib/quality-score'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type TabFilter = 'all' | 'active' | 'draft' | 'pending' | 'rejected' | 'sold' | 'buyers'

const TAB_VALUES: TabFilter[] = ['all', 'active', 'draft', 'pending', 'rejected', 'sold', 'buyers']

const TAB_LABELS: Record<TabFilter, string> = {
  all: 'All',
  active: 'Live',
  draft: 'Drafts',
  pending: 'Pending Review',
  rejected: 'Rejected',
  sold: 'Sold',
  buyers: 'Buyers',
}

const STATUS_CONFIG: Record<ListingStatus, { label: string; className: string; dot: string }> = {
  ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  DRAFT: { label: 'Draft', className: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  SOLD: { label: 'Sold', className: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  INACTIVE: {
    label: 'Inactive',
    className: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
    dot: 'bg-gray-400',
  },
  PENDING_REVIEW: {
    label: 'Under Review',
    className: 'bg-orange-100 text-orange-700',
    dot: 'bg-orange-400',
  },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  DELETED: {
    label: 'Deleted',
    className: 'bg-gray-200 text-gray-500 line-through',
    dot: 'bg-gray-400',
  },
}

const PURPOSE_LABEL: Record<string, string> = {
  SELF: 'Own use',
  INVESTMENT: 'Investment',
}

const TIMELINE_LABEL: Record<string, string> = {
  IMMEDIATELY: 'Immediately',
  WITHIN_30_DAYS: 'Within 30 days',
  ONE_TO_THREE_MONTHS: '1–3 months',
  EXPLORING: 'Just exploring',
}

const FUNDING_LABEL: Record<string, string> = {
  CASH_READY: 'Cash ready',
  LOAN_APPROVED: 'Loan approved',
  LOAN_IN_PROGRESS: 'Loan in progress',
}

const FUNDING_CLASS: Record<string, string> = {
  CASH_READY: 'bg-green-100 text-green-700',
  LOAN_APPROVED: 'bg-blue-100 text-blue-700',
  LOAN_IN_PROGRESS: 'bg-amber-100 text-amber-700',
}

const INTEREST_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
  ACCEPTED: { label: 'Accepted', className: 'bg-green-100 text-green-700' },
  DECLINED: { label: 'Declined', className: 'bg-red-100 text-red-700' },
  WITHDRAWN: { label: 'Withdrawn', className: 'bg-gray-100 text-gray-500' },
}

interface SellerInterestItem {
  id: string
  listingId: string
  listingTitle: string
  listingCity: string
  fullName: string
  purpose: 'SELF' | 'INVESTMENT'
  timeline: 'IMMEDIATELY' | 'WITHIN_30_DAYS' | 'ONE_TO_THREE_MONTHS' | 'EXPLORING'
  funding: 'CASH_READY' | 'LOAN_APPROVED' | 'LOAN_IN_PROGRESS'
  message: string | null
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN'
  createdAt: string
  updatedAt: string
  contactUnlocked?: boolean
  buyerPhone?: string | null
  buyerEmail?: string | null
}

interface DashboardListing {
  id: string
  title: string
  price: number
  property_type: string
  bhk_type: string | null
  built_up_area: number | null
  furnishing: string | null
  bathrooms: number | null
  balconies: number | null
  city: string
  locality: string
  image_urls: string[]
  status: ListingStatus
  is_verified: boolean
  view_count: number
  rejection_reason: string | null
  created_at: string
  updated_at: string
  interested_count: number
}

function toDisplayListing(l: DashboardListing): MockListing {
  return {
    id: l.id,
    title: l.title,
    price: l.price,
    propertyType: l.property_type as MockListing['propertyType'],
    bhkType: (l.bhk_type ?? 'TWO_BHK') as MockListing['bhkType'],
    builtUpArea: l.built_up_area ?? 0,
    carpetArea: null,
    floor: null,
    totalFloors: null,
    facing: null,
    furnishing: (l.furnishing ?? 'UNFURNISHED') as MockListing['furnishing'],
    ageOfProperty: null,
    bathrooms: l.bathrooms ?? 2,
    balconies: l.balconies ?? 0,
    parking: null,
    address: `${l.locality}, ${l.city}`,
    city: l.city,
    locality: l.locality,
    state: '',
    pincode: '',
    latitude: null,
    longitude: null,
    amenities: [],
    images: l.image_urls.map((url, i) => ({ id: `img-${i}`, url, caption: null, order: i })),
    status: l.status,
    isVerified: l.is_verified,
    viewCount: l.view_count,
    rejectionReason: l.rejection_reason,
    seller: { id: '', name: '', phone: '', avatarUrl: null, isVerified: false },
    description: '',
    createdAt: l.created_at,
  }
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: ReactNode
  iconBg: string
  trend?: string
  trendUp?: boolean
}

function StatCard({ label, value, sub, icon, iconBg, trend, trendUp }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconBg)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[var(--color-muted-foreground)]">{label}</p>
        <p className="mt-0.5 text-xl font-bold tracking-tight text-[var(--color-foreground)]">
          {value}
        </p>
        {sub && <p className="text-[11px] text-[var(--color-muted-foreground)]">{sub}</p>}
      </div>
      {trend && (
        <span
          className={cn(
            'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
            trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600',
          )}
        >
          {trendUp ? '↑' : '↓'}
          {trend}
        </span>
      )}
    </div>
  )
}

interface ListingCardProps {
  listing: MockListing
  interestedCount: number
  onDelete: (id: string) => void
  onStatusChange: (
    id: string,
    action: 'SOLD' | 'PAUSE' | 'REACTIVATE' | 'WITHDRAW_REVIEW',
  ) => Promise<void>
  isDeleting: boolean
  statusChangingId: string | null
}

function ListingCard({
  listing,
  interestedCount,
  onDelete,
  onStatusChange,
  isDeleting,
  statusChangingId,
}: ListingCardProps) {
  const statusConfig = STATUS_CONFIG[listing.status]
  const cover = listing.images[0]?.url
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmSold, setConfirmSold] = useState(false)
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const isBusy = isDeleting || statusChangingId === listing.id
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const overflowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!confirmDelete && !confirmSold) return
    timerRef.current = setTimeout(() => {
      setConfirmDelete(false)
      setConfirmSold(false)
    }, 5000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [confirmDelete, confirmSold])

  // Close overflow menu on outside click
  useEffect(() => {
    if (!overflowOpen) return
    function handleClick(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [overflowOpen])

  const updatedAgo = useMemo(() => {
    const diff = Date.now() - new Date(listing.createdAt).getTime()
    const days = Math.floor(diff / 86_400_000)
    if (days === 0) return 'Updated today'
    if (days === 1) return 'Updated 1 day ago'
    if (days < 7) return `Updated ${days} days ago`
    if (days < 30)
      return `Updated ${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`
    return `Updated ${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`
  }, [listing.createdAt])

  const absoluteUpdatedDate = new Date(listing.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const canEdit = ['ACTIVE', 'DRAFT', 'INACTIVE', 'REJECTED', 'PENDING_REVIEW'].includes(
    listing.status,
  )
  const editHref =
    listing.status === 'DRAFT'
      ? `/sell?draftId=${listing.id}`
      : `/dashboard/listings/${listing.id}/edit`

  return (
    <article className="group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-sm transition-all duration-200 hover:shadow-md">
      {/* ── Photo area ── */}
      <div className="relative aspect-video overflow-hidden bg-[var(--color-muted)]">
        {cover ? (
          <Image
            src={cover}
            alt={listing.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-[var(--color-muted-foreground)]">
            <Home className="h-10 w-10 opacity-20" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium opacity-50">No image added</p>
              <p className="mt-0.5 text-[11px] opacity-40">
                Add at least one photo to publish this listing.
              </p>
            </div>
          </div>
        )}
        {/* Status pill */}
        <span
          className={cn(
            'absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm',
            statusConfig.className,
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', statusConfig.dot)} aria-hidden="true" />
          {statusConfig.label === 'Active' ? 'Live' : statusConfig.label}
        </span>
        {/* View count */}
        <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
          <Eye className="h-2.5 w-2.5" aria-hidden="true" />
          {listing.viewCount}
        </span>
      </div>

      {/* ── Body ── */}
      <div className="p-4">
        {/* Title + price */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-semibold text-[var(--color-foreground)]">
            {listing.title}
          </h3>
          <p className="shrink-0 text-sm font-bold text-[var(--color-accent)]">
            {formatPrice(listing.price)}
          </p>
        </div>

        {/* Location */}
        <div className="mt-1 flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {listing.locality}, {listing.city}
          </span>
        </div>

        {/* Metadata row */}
        {(listing.bhkType ?? listing.builtUpArea) && (
          <div className="mt-2.5 flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
            {listing.bhkType && (
              <span className="flex items-center gap-1">
                <BedDouble className="h-3 w-3 shrink-0" aria-hidden="true" />
                {listing.bhkType.replace('_BHK', ' Beds').replace('ONE_Beds', '1 Bed')}
              </span>
            )}
            {listing.bathrooms !== null && listing.bathrooms > 0 && (
              <span className="flex items-center gap-1">
                <Bath className="h-3 w-3 shrink-0" aria-hidden="true" />
                {listing.bathrooms} Baths
              </span>
            )}
            {listing.builtUpArea ? (
              <span className="flex items-center gap-1">
                <Maximize2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                {listing.builtUpArea.toLocaleString('en-IN')} sqft
              </span>
            ) : null}
          </div>
        )}

        {/* Verification strip */}
        {listing.isVerified && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-700">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Owner Verified
            </span>
            <span className="h-3 w-px bg-green-200" aria-hidden="true" />
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-700">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Documents Verified
            </span>
          </div>
        )}

        {/* Quality score badge + top improvement actions */}
        {listing.qualityScore !== undefined && listing.status !== 'DELETED' && (
          <div className="mt-3">
            <QualityScoreBadge
              score={listing.qualityScore}
              breakdown={
                (listing.qualityBreakdown as unknown as QualityBreakdown) ?? {
                  photos: { score: 0, max: 25, count: 0 },
                  description: { score: 0, max: 20, wordCount: 0 },
                  details: { score: 0, max: 25, missing: [], filled: [] },
                  price: { score: 12, max: 15, benchmarkAvailable: false },
                  location: {
                    score: 0,
                    max: 10,
                    hasLocality: false,
                    hasPincode: false,
                    hasAddress: false,
                  },
                  trust: { score: 0, max: 5 },
                }
              }
              actions={getImprovementActions(
                (listing.qualityBreakdown as unknown as QualityBreakdown) ?? {
                  photos: { score: 0, max: 25, count: 0 },
                  description: { score: 0, max: 20, wordCount: 0 },
                  details: { score: 0, max: 25, missing: [], filled: [] },
                  price: { score: 12, max: 15, benchmarkAvailable: false },
                  location: {
                    score: 0,
                    max: 10,
                    hasLocality: false,
                    hasPincode: false,
                    hasAddress: false,
                  },
                  trust: { score: 0, max: 5 },
                },
                listing.id,
              )}
              listingId={listing.id}
            />
          </div>
        )}

        {/* "Views with 0 inquiries" insight */}
        {listing.status === 'ACTIVE' &&
          listing.viewCount > 20 &&
          interestedCount === 0 &&
          (listing.qualityScore ?? 100) < 70 && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {listing.viewCount} people viewed this with no inquiries. Improving your listing
                score can help.
              </span>
            </div>
          )}

        {/* Rejection banner — with inline CTA */}
        {listing.status === 'REJECTED' && (
          <div className="mt-3 flex items-start justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
            <div className="flex min-w-0 items-start gap-1.5">
              <AlertCircle
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500"
                aria-hidden="true"
              />
              <p className="text-[11px] leading-relaxed text-red-700">
                {listing.rejectionReason ??
                  "This listing couldn't be approved because some details couldn't be verified. Please review and update the highlighted information before resubmitting."}
              </p>
            </div>
            <Link
              href={`/dashboard/listings/${listing.id}/edit`}
              className="shrink-0 whitespace-nowrap rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Review &amp; Resubmit
            </Link>
          </div>
        )}

        {/* Updated timestamp */}
        <p className="mt-3 text-[11px] text-[var(--color-muted-foreground)]">
          {mounted ? updatedAgo : absoluteUpdatedDate}
        </p>

        {/* ── Action row ── */}
        {confirmDelete ? (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <span className="text-xs text-red-700">Delete this listing?</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  setConfirmDelete(false)
                  onDelete(listing.id)
                }}
                className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
              >
                {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-[var(--color-muted-foreground)] hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : confirmSold ? (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
            <span className="text-xs text-blue-700">Mark this as sold?</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  setConfirmSold(false)
                  void onStatusChange(listing.id, 'SOLD')
                }}
                className="text-xs font-semibold text-blue-700 hover:underline disabled:opacity-50"
              >
                {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmSold(false)}
                className="text-xs text-[var(--color-muted-foreground)] hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            {/* Preview button — all statuses */}
            <Link
              href={`/listing/${listing.id}`}
              className="flex h-9 flex-1 items-center justify-center rounded-lg border border-[var(--color-border)] text-xs font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
            >
              Preview
            </Link>

            {/* Edit Details — not for SOLD */}
            {canEdit && listing.status !== 'REJECTED' && (
              <Link
                href={editHref}
                className="flex h-9 flex-1 items-center justify-center rounded-lg bg-[var(--color-foreground)] text-xs font-semibold text-white transition-opacity hover:opacity-90"
              >
                Edit Details
              </Link>
            )}

            {/* INACTIVE: Resume is primary */}
            {listing.status === 'INACTIVE' && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void onStatusChange(listing.id, 'REACTIVATE')}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isBusy ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <PlayCircle className="h-3 w-3" />
                    Resume
                  </>
                )}
              </button>
            )}

            {/* PENDING_REVIEW: Withdraw is primary */}
            {listing.status === 'PENDING_REVIEW' && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void onStatusChange(listing.id, 'WITHDRAW_REVIEW')}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] disabled:opacity-50"
              >
                {isBusy ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Undo2 className="h-3 w-3" />
                    Withdraw
                  </>
                )}
              </button>
            )}

            {/* ⋯ overflow menu */}
            <div className="relative" ref={overflowRef}>
              <button
                type="button"
                onClick={() => setOverflowOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </button>
              {overflowOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-lg">
                  {listing.status === 'ACTIVE' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        setOverflowOpen(false)
                        void onStatusChange(listing.id, 'PAUSE')
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-[var(--color-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-50"
                    >
                      Pause listing
                    </button>
                  )}
                  {listing.status === 'ACTIVE' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        setOverflowOpen(false)
                        setConfirmSold(true)
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-[var(--color-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-50"
                    >
                      Mark as sold
                    </button>
                  )}
                  {listing.status === 'INACTIVE' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        setOverflowOpen(false)
                        setConfirmSold(true)
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-[var(--color-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-50"
                    >
                      Mark as sold
                    </button>
                  )}
                  {listing.status !== 'SOLD' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        setOverflowOpen(false)
                        setConfirmDelete(true)
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Delete listing
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Footer stats ── */}
        <div className="mt-3 flex items-center gap-4 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-muted-foreground)]">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3 shrink-0" aria-hidden="true" />
            {listing.viewCount} Views
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3 shrink-0" aria-hidden="true" />
            {interestedCount} Interested
          </span>
        </div>
      </div>
    </article>
  )
}

interface BuyerInterestCardProps {
  item: SellerInterestItem
  onAction: (id: string, action: 'ACCEPTED' | 'DECLINED') => Promise<void>
  actionLoading: boolean
  onShareContact: (id: string) => Promise<void>
  sharingContactId: string | null
  onChat: (interestId: string) => void
}

function BuyerInterestCard({
  item,
  onAction,
  actionLoading,
  onShareContact,
  sharingContactId,
  onChat,
}: BuyerInterestCardProps) {
  const [confirmDecline, setConfirmDecline] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  const statusCfg = INTEREST_STATUS_CONFIG[item.status] ?? {
    label: item.status,
    className: 'bg-gray-100 text-gray-600',
  }
  const relativeDate = useMemo(() => {
    const diff = Date.now() - new Date(item.createdAt).getTime()
    const days = Math.floor(diff / 86_400_000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }, [item.createdAt])
  const fullDate = new Date(item.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const isContactShared = item.contactUnlocked
  const statusLabel =
    isContactShared && item.status === 'ACCEPTED' ? 'Accepted · Contact shared' : statusCfg.label
  const statusClass =
    isContactShared && item.status === 'ACCEPTED'
      ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
      : statusCfg.className

  return (
    <article
      className={cn(
        'rounded-xl border bg-white p-4 transition-colors',
        isContactShared ? 'border-green-200 bg-green-50/30' : 'border-[var(--color-border)]',
      )}
    >
      {/* Header row: name + status pill + date */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
              {item.fullName}
            </h3>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', statusClass)}>
              {statusLabel}
            </span>
          </div>
          <Link
            href={`/listing/${item.listingId}`}
            className="mt-0.5 flex items-center gap-1 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:underline"
          >
            {item.listingTitle}
            {item.listingCity ? ` · ${item.listingCity}` : ''}
            <ExternalLink className="h-3 w-3 shrink-0 opacity-50" aria-hidden="true" />
          </Link>
        </div>
        <time
          dateTime={item.createdAt}
          title={fullDate}
          className="shrink-0 text-xs text-[var(--color-muted-foreground)]"
        >
          {mounted ? relativeDate : fullDate}
        </time>
      </div>

      {/* Buyer qualification chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-[var(--color-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">
          {PURPOSE_LABEL[item.purpose] ?? item.purpose}
        </span>
        <span className="rounded-full bg-[var(--color-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">
          {TIMELINE_LABEL[item.timeline] ?? item.timeline}
        </span>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-medium',
            FUNDING_CLASS[item.funding] ??
              'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
          )}
        >
          {FUNDING_LABEL[item.funding] ?? item.funding}
        </span>
      </div>

      {item.message && (
        <div className="mt-3 rounded-lg bg-[var(--color-muted)] px-3 py-2 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
          &ldquo;{item.message}&rdquo;
        </div>
      )}

      {/* ACCEPTED — contact not yet shared: Chat (secondary) + Share Contact (primary) */}
      {item.status === 'ACCEPTED' && !item.contactUnlocked && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Chat with the buyer first, or share your contact whenever you&apos;re ready.
          </p>
          <div className="flex gap-2">
            {/* Single logical button — desktop opens bubble, mobile navigates */}
            <button
              type="button"
              onClick={() => onChat(item.id)}
              aria-label={`Chat with ${item.fullName}`}
              className="hidden min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] py-2 text-xs font-semibold text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)] lg:flex"
            >
              <MessageSquare className="h-3 w-3" aria-hidden="true" /> Chat
            </button>
            <Link
              href={`/messages/${item.id}`}
              aria-label={`Chat with ${item.fullName}`}
              className="flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] py-2 text-xs font-semibold text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)] lg:hidden"
            >
              <MessageSquare className="h-3 w-3" aria-hidden="true" /> Chat
            </Link>
            <button
              type="button"
              disabled={sharingContactId === item.id}
              onClick={() => void onShareContact(item.id)}
              aria-label={`Share contact with ${item.fullName}`}
              className="flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-foreground)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {sharingContactId === item.id ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  <Share2 className="h-3 w-3" aria-hidden="true" /> Share Contact
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ACCEPTED — contact shared: green card with details + inline message link */}
      {item.contactUnlocked && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-green-800">Contact shared — buyer notified</p>
            {/* Message buyer — embedded so owner doesn't miss it */}
            <button
              type="button"
              onClick={() => onChat(item.id)}
              aria-label={`Message ${item.fullName}`}
              className="hidden shrink-0 items-center gap-1 rounded-md border border-green-300 bg-white px-2 py-1 text-xs font-medium text-green-700 transition hover:bg-green-100 lg:inline-flex"
            >
              <MessageSquare className="h-3 w-3" aria-hidden="true" /> Message
            </button>
            <Link
              href={`/messages/${item.id}`}
              aria-label={`Message ${item.fullName}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-green-300 bg-white px-2 py-1 text-xs font-medium text-green-700 transition hover:bg-green-100 lg:hidden"
            >
              <MessageSquare className="h-3 w-3" aria-hidden="true" /> Message
            </Link>
          </div>
          {(item.buyerPhone ?? item.buyerEmail) && (
            <div className="mt-1.5 space-y-1">
              {item.buyerPhone && (
                <a
                  href={`tel:${item.buyerPhone.replace(/\s/g, '')}`}
                  className="flex items-center gap-1.5 text-xs text-green-700 hover:underline"
                >
                  <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {item.buyerPhone}
                </a>
              )}
              {item.buyerEmail && (
                <a
                  href={`mailto:${item.buyerEmail}`}
                  className="flex items-center gap-1.5 text-xs text-green-700 hover:underline"
                >
                  <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {item.buyerEmail}
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* PENDING — Accept (primary filled) + Decline (secondary outline) */}
      {item.status === 'PENDING' && (
        <div className="mt-4">
          {confirmDecline ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="flex-1 text-xs text-red-700">Decline this buyer&apos;s request?</p>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  void onAction(item.id, 'DECLINED')
                  setConfirmDecline(false)
                }}
                className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Yes, decline'}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirmDecline(false)}
                className="shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-white disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void onAction(item.id, 'ACCEPTED')}
                className="flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  'Accept'
                )}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirmDecline(true)}
                className="flex min-h-[36px] flex-1 items-center justify-center rounded-lg border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

type InterestStatusFilter = 'ALL' | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN'

interface BuyersTabContentProps {
  interests: SellerInterestItem[]
  loading: boolean
  error: string | null
  statusFilter: InterestStatusFilter
  sort: 'newest' | 'oldest'
  actionLoadingId: string | null
  interestSuccess: string | null
  onStatusFilter: (s: InterestStatusFilter) => void
  onSort: (s: 'newest' | 'oldest') => void
  onAction: (id: string, action: 'ACCEPTED' | 'DECLINED') => Promise<void>
  onShareContact: (id: string) => Promise<void>
  sharingContactId: string | null
  onChat: (interestId: string) => void
  onDismissError: () => void
  onDismissSuccess: () => void
}

const STATUS_FILTERS: { value: InterestStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
]

const EMPTY_MESSAGES: Record<InterestStatusFilter, { title: string; sub: string }> = {
  ALL: {
    title: 'No buyer requests yet',
    sub: 'When buyers express interest in your listings, their requests will appear here.',
  },
  PENDING: {
    title: 'No new requests',
    sub: "When buyers show interest in your listings, they'll appear here for you to review.",
  },
  ACCEPTED: {
    title: 'No accepted requests yet',
    sub: "Accept a buyer's interest to start chatting or share your contact directly.",
  },
  DECLINED: {
    title: "You haven't declined any requests",
    sub: 'Declined requests will show here.',
  },
  WITHDRAWN: {
    title: 'No withdrawn requests',
    sub: 'Buyers who withdrew their interest will appear here.',
  },
}

function BuyersTabContent({
  interests,
  loading,
  error,
  statusFilter,
  sort,
  actionLoadingId,
  interestSuccess,
  onStatusFilter,
  onSort,
  onAction,
  onShareContact,
  sharingContactId,
  onChat,
  onDismissError,
  onDismissSuccess,
}: BuyersTabContentProps) {
  return (
    <div className="space-y-4">
      {/* Filter chips + sort */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filter by status"
        >
          <span className="text-xs font-medium text-[var(--color-muted-foreground)]">Filter:</span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={statusFilter === f.value}
              onClick={() => onStatusFilter(f.value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                statusFilter === f.value
                  ? 'border-[var(--color-foreground)] bg-[var(--color-foreground)] text-white'
                  : 'border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)] hover:border-[var(--color-foreground)] hover:text-[var(--color-foreground)]',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as 'newest' | 'oldest')}
          disabled={loading || interests.length === 0}
          className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-xs text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] disabled:opacity-50"
          aria-label="Sort order"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {interestSuccess && (
        <div
          className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          role="status"
        >
          <span className="flex-1">{interestSuccess}</span>
          <button
            type="button"
            onClick={onDismissSuccess}
            className="-m-1 shrink-0 p-1 text-xs text-green-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        /* Skeleton cards */
        <div className="space-y-3" aria-busy="true" aria-label="Loading buyer requests">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-[var(--color-border)] bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded-full bg-[var(--color-muted)]" />
                  <div className="h-3 w-48 rounded-full bg-[var(--color-muted)]" />
                </div>
                <div className="h-3 w-12 rounded-full bg-[var(--color-muted)]" />
              </div>
              <div className="mt-3 flex gap-2">
                <div className="h-6 w-20 rounded-full bg-[var(--color-muted)]" />
                <div className="h-6 w-20 rounded-full bg-[var(--color-muted)]" />
                <div className="h-6 w-24 rounded-full bg-[var(--color-muted)]" />
              </div>
              <div className="mt-3 flex gap-2">
                <div className="h-9 flex-1 rounded-lg bg-[var(--color-muted)]" />
                <div className="h-9 flex-1 rounded-lg bg-[var(--color-muted)]" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={onDismissError}
            className="-m-1 shrink-0 p-1 text-xs text-red-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : interests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-muted)]">
            <Users className="h-8 w-8 text-[var(--color-muted-foreground)]" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-[var(--color-foreground)]">
            {EMPTY_MESSAGES[statusFilter].title}
          </h3>
          <p className="mt-1 max-w-xs text-sm text-[var(--color-muted-foreground)]">
            {EMPTY_MESSAGES[statusFilter].sub}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {interests.map((item) => (
            <BuyerInterestCard
              key={item.id}
              item={item}
              onAction={onAction}
              actionLoading={actionLoadingId === item.id}
              onShareContact={onShareContact}
              sharingContactId={sharingContactId}
              onChat={onChat}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({
  tab,
  personaState,
  onShowAll,
}: {
  tab: Exclude<TabFilter, 'buyers'>
  personaState: 'loading' | 'buyer' | 'seller'
  onShowAll: () => void
}) {
  const isBuyerOnly = personaState === 'buyer'
  const messages: Record<Exclude<TabFilter, 'buyers'>, { title: string; sub: string }> = {
    all: {
      title: isBuyerOnly ? 'No listings to show' : 'No listings yet',
      sub: isBuyerOnly
        ? 'Browse properties to express interest in buying.'
        : 'Start selling by creating your first property listing.',
    },
    active: { title: 'No active listings', sub: 'Your published listings will appear here.' },
    draft: {
      title: 'No drafts',
      sub: "Listings you've saved but not yet published will appear here.",
    },
    pending: { title: 'No pending listings', sub: 'Listings awaiting review will appear here.' },
    rejected: {
      title: 'No rejected listings',
      sub: 'Listings rejected by our team will appear here.',
    },
    sold: { title: 'No sold listings', sub: "Properties you've marked as sold will appear here." },
  }
  const msg = messages[tab]
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-muted)]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-[var(--color-muted-foreground)] opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M3 9.75L12 3l9 6.75V21H3V9.75z"
          />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-[var(--color-foreground)]">{msg.title}</h3>
      <p className="mt-1 max-w-xs text-sm text-[var(--color-muted-foreground)]">{msg.sub}</p>
      {tab === 'all' ? (
        isBuyerOnly ? (
          <Link
            href="/properties"
            className={cn(
              'mt-6 flex items-center gap-2 rounded-xl bg-[var(--color-foreground)] px-5 py-2.5 text-sm font-semibold text-white',
              'transition-opacity hover:opacity-90',
            )}
          >
            Browse Properties
          </Link>
        ) : (
          <Link
            href="/sell"
            className={cn(
              'mt-6 flex items-center gap-2 rounded-xl bg-[var(--color-foreground)] px-5 py-2.5 text-sm font-semibold text-white',
              'transition-opacity hover:opacity-90',
            )}
          >
            <Plus className="h-4 w-4" />
            Start selling
          </Link>
        )
      ) : (
        <button
          type="button"
          onClick={onShowAll}
          className="mt-4 text-sm text-[var(--color-muted-foreground)] underline underline-offset-2 hover:text-[var(--color-foreground)]"
        >
          View all listings
        </button>
      )}
    </div>
  )
}

function DashboardPageInner() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const msgParam = searchParams.get('msg')
  const cantEditMsg =
    msgParam === 'cannot-edit-active'
      ? 'Active listings cannot be edited. To make changes, contact support.'
      : msgParam === 'cannot-edit-pending'
        ? 'Your listing is under review and cannot be edited until the review is complete.'
        : null

  const tabParam = searchParams.get('tab') as TabFilter | null
  const allTabValues: TabFilter[] = [
    'all',
    'active',
    'draft',
    'pending',
    'rejected',
    'sold',
    'buyers',
  ]
  const initialTab: TabFilter =
    tabParam && (allTabValues as string[]).includes(tabParam) ? tabParam : 'all'

  const [activeTab, setActiveTab] = useState<TabFilter>(initialTab)

  // Sync tab when URL ?tab= changes (e.g. sidebar link click while already on /dashboard)
  useEffect(() => {
    const t = tabParam && (allTabValues as string[]).includes(tabParam) ? tabParam : 'all'
    setActiveTab(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam])
  const [pendingBuyerCount, setPendingBuyerCount] = useState<number | null>(null)
  const [listings, setListings] = useState<MockListing[]>([])
  const [interestedCountMap, setInterestedCountMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [interests, setInterests] = useState<SellerInterestItem[]>([])
  const [interestLoading, setInterestLoading] = useState(false)
  const [interestError, setInterestError] = useState<string | null>(null)
  const [interestSuccess, setInterestSuccess] = useState<string | null>(null)
  const [interestStatusFilter, setInterestStatusFilter] = useState<InterestStatusFilter>('ALL')
  const [interestSort, setInterestSort] = useState<'newest' | 'oldest'>('newest')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [sharingContactId, setSharingContactId] = useState<string | null>(null)
  const { openChatForInterest } = useMessaging()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Auto-dismiss action errors after 5s
  useEffect(() => {
    if (!actionError) return
    const t = setTimeout(() => setActionError(null), 5000)
    return () => clearTimeout(t)
  }, [actionError])

  // Auto-dismiss actionSuccess after 4s
  useEffect(() => {
    if (!actionSuccess) return
    const t = setTimeout(() => setActionSuccess(null), 4000)
    return () => clearTimeout(t)
  }, [actionSuccess])

  // Auto-dismiss interestSuccess after 4s
  useEffect(() => {
    if (!interestSuccess) return
    const t = setTimeout(() => setInterestSuccess(null), 4000)
    return () => clearTimeout(t)
  }, [interestSuccess])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    fetch('/api/dashboard/interests?status=PENDING&page=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { total?: number } | null) => {
        if (json?.total !== undefined) setPendingBuyerCount(json.total)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setFetchError(null)
      try {
        if (isSupabaseConfigured()) {
          const res = await fetch('/api/dashboard/listings')
          if (res.ok) {
            const json = (await res.json()) as { listings: DashboardListing[] }
            setListings(json.listings.map(toDisplayListing))
            const countMap: Record<string, number> = {}
            for (const l of json.listings) countMap[l.id] = l.interested_count
            setInterestedCountMap(countMap)
          } else if (res.status === 401) {
            setFetchError('You need to be signed in to view your listings.')
            setListings([])
          } else {
            setFetchError('Failed to load listings. Please refresh.')
            setListings([])
          }
        } else {
          setListings([])
        }
      } catch {
        setFetchError('Network error — check your connection and refresh.')
        setListings([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  useEffect(() => {
    if (activeTab !== 'buyers') return
    async function fetchInterests() {
      setInterestLoading(true)
      setInterestError(null)
      try {
        const params = new URLSearchParams({ status: interestStatusFilter, sort: interestSort })
        const res = await fetch(`/api/dashboard/interests?${params.toString()}`)
        if (res.ok) {
          const json = (await res.json()) as { interests: SellerInterestItem[]; total?: number }
          setInterests(json.interests)
          // Sync pending badge from API when filter is PENDING
          if (interestStatusFilter === 'PENDING' && json.total !== undefined) {
            setPendingBuyerCount(json.total)
          }
        } else if (res.status === 401) {
          setInterestError('Sign in to view buyer requests.')
          setInterests([])
        } else {
          setInterestError('Failed to load buyer requests. Please refresh.')
          setInterests([])
        }
      } catch {
        setInterestError('Network error — check your connection and refresh.')
        setInterests([])
      } finally {
        setInterestLoading(false)
      }
    }
    void fetchInterests()
  }, [activeTab, interestStatusFilter, interestSort])

  async function handleInterestAction(id: string, action: 'ACCEPTED' | 'DECLINED') {
    setActionLoadingId(id)
    setInterestError(null)
    try {
      const res = await fetch(`/api/dashboard/interests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const json = (await res.json()) as { id: string; status: string; updatedAt: string }
        setInterests((prev) =>
          prev.map((item) =>
            item.id === json.id
              ? {
                  ...item,
                  status: json.status as SellerInterestItem['status'],
                  updatedAt: json.updatedAt,
                }
              : item,
          ),
        )
        setPendingBuyerCount((c) => (c !== null && c > 0 ? c - 1 : 0))
        const successMsg =
          action === 'ACCEPTED' ? 'Request accepted — buyer notified.' : 'Request declined.'
        setInterestSuccess(successMsg)
        toast(successMsg, 'success')
      } else {
        const err = (await res.json()) as { error?: string }
        const errMsg = err.error ?? 'Failed to update request.'
        setInterestError(errMsg)
        toast(errMsg, 'error')
      }
    } catch {
      setInterestError('Network error — try again.')
      toast('Network error — try again.', 'error')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleShareContact(id: string) {
    setSharingContactId(id)
    try {
      const res = await fetch(`/api/dashboard/interests/${id}/share-contact`, { method: 'POST' })
      if (res.ok) {
        const d = (await res.json()) as { buyerPhone?: string | null; buyerEmail?: string | null }
        setInterests((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                  ...i,
                  contactUnlocked: true,
                  buyerPhone: d.buyerPhone ?? i.buyerPhone,
                  buyerEmail: d.buyerEmail ?? i.buyerEmail,
                }
              : i,
          ),
        )
        setInterestSuccess('Contact shared — the buyer can now reach you directly.')
        toast('Contact shared — the buyer can now reach you directly.', 'success')
      } else {
        const d = (await res.json()) as { error?: string }
        const errMsg = d.error ?? 'Failed to share contact.'
        setInterestError(errMsg)
        toast(errMsg, 'error')
      }
    } catch {
      setInterestError('Network error — try again.')
      toast('Network error — try again.', 'error')
    } finally {
      setSharingContactId(null)
    }
  }

  function handleDeleteListing(listingId: string) {
    setDeletingId(listingId)
    setActionError(null)
    fetch(`/api/listings/${listingId}`, { method: 'DELETE' })
      .then(async (r) => {
        if (r.ok) {
          setListings((prev) => prev.filter((l) => l.id !== listingId))
          toast('Listing deleted.', 'success')
        } else {
          const d = (await r.json()) as { error?: string }
          const msg = d.error ?? 'Failed to delete listing'
          setActionError(msg)
          toast(msg, 'error')
        }
      })
      .catch(() => {
        setActionError('Failed to delete listing')
        toast('Failed to delete listing', 'error')
      })
      .finally(() => setDeletingId(null))
  }

  async function handleStatusChange(
    listingId: string,
    action: 'SOLD' | 'PAUSE' | 'REACTIVATE' | 'WITHDRAW_REVIEW',
  ) {
    setStatusChangingId(listingId)
    setActionError(null)
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const json = (await res.json()) as { id: string; status: string }
        setListings((prev) =>
          prev.map((l) => (l.id === json.id ? { ...l, status: json.status as ListingStatus } : l)),
        )
        if (action === 'WITHDRAW_REVIEW') {
          setActionSuccess('Review withdrawn — your listing is back in Drafts.')
          toast('Review withdrawn — your listing is back in Drafts.', 'success')
        } else if (action === 'PAUSE') {
          setActionSuccess('Listing paused — hidden from buyers.')
          toast('Listing paused — hidden from buyers.', 'success')
        } else if (action === 'REACTIVATE') {
          setActionSuccess('Listing reactivated and live.')
          toast('Listing reactivated and live.', 'success')
        } else if (action === 'SOLD') {
          setActionSuccess('Listing marked as sold.')
          toast('Listing marked as sold.', 'success')
        }
      } else {
        const d = (await res.json()) as { error?: string }
        const msg = d.error ?? 'Failed to update listing.'
        setActionError(msg)
        toast(msg, 'error')
      }
    } catch {
      setActionError('Network error — try again.')
      toast('Network error — try again.', 'error')
    } finally {
      setStatusChangingId(null)
    }
  }

  const visibleListings = listings.filter((l) => l.status !== 'DELETED')

  const filteredListings = visibleListings.filter((listing) => {
    if (activeTab === 'all') return true
    if (activeTab === 'pending') return listing.status === 'PENDING_REVIEW'
    if (activeTab === 'rejected') return listing.status === 'REJECTED'
    if (activeTab === 'buyers') return false
    return listing.status.toLowerCase() === activeTab
  })

  const tabCounts: Record<Exclude<TabFilter, 'buyers'>, number> = {
    all: visibleListings.length,
    active: visibleListings.filter((l) => l.status === 'ACTIVE').length,
    draft: visibleListings.filter((l) => l.status === 'DRAFT').length,
    pending: visibleListings.filter((l) => l.status === 'PENDING_REVIEW').length,
    rejected: visibleListings.filter((l) => l.status === 'REJECTED').length,
    sold: visibleListings.filter((l) => l.status === 'SOLD').length,
  }

  const personaState: 'loading' | 'buyer' | 'seller' = loading
    ? 'loading'
    : visibleListings.length === 0
      ? 'buyer'
      : 'seller'

  const stats = {
    total: visibleListings.length,
    active: visibleListings.filter((l) => l.status === 'ACTIVE').length,
    needsAttention: visibleListings.filter(
      (l) => l.status === 'REJECTED' || (l.images.length === 0 && l.status === 'DRAFT'),
    ).length,
  }

  const pageTitle = personaState === 'buyer' ? 'My Activity' : 'Your Listings'
  const pageSubtitle =
    personaState === 'buyer'
      ? 'Track your property interests and requests'
      : stats.needsAttention > 0
        ? `Manage your listings, track buyer interest, and keep everything up to date.`
        : 'Manage your listings, track buyer interest, and keep everything up to date.'

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          {personaState === 'loading' ? (
            <div className="h-7 w-40 animate-pulse rounded-lg bg-[var(--color-border)]" />
          ) : (
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-2xl">
              {pageTitle}
            </h1>
          )}
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">{pageSubtitle}</p>
        </div>
        {personaState === 'seller' && (
          <Link
            href="/sell"
            className={cn(
              'hidden shrink-0 items-center gap-2 rounded-full bg-[var(--color-foreground)] px-5 py-2.5 text-sm font-semibold text-white sm:flex',
              'transition-opacity hover:opacity-90',
            )}
          >
            <Plus className="h-4 w-4" /> New Listing
          </Link>
        )}
      </div>

      {cantEditMsg && (
        <div
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>{cantEditMsg}</span>
        </div>
      )}

      {fetchError && activeTab !== 'buyers' && (
        <div
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span>{fetchError}</span>
        </div>
      )}

      {actionError && (
        <div
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span className="flex-1">{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="shrink-0 text-xs text-red-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionSuccess && (
        <div
          className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          role="status"
        >
          <span className="flex-1">{actionSuccess}</span>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="shrink-0 text-xs text-green-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats grid */}
      {personaState === 'loading' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-[var(--color-border)] bg-white"
            />
          ))}
        </div>
      ) : personaState === 'seller' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Total Listings"
            value={stats.total}
            sub="All time"
            icon={<LayoutGrid className="h-4 w-4 text-violet-600" />}
            iconBg="bg-violet-100"
          />
          <StatCard
            label="Live Listings"
            value={stats.active}
            sub="Currently live"
            icon={<TrendingUp className="h-4 w-4 text-green-600" />}
            iconBg="bg-green-100"
            trend={stats.active > 0 ? 'Live' : undefined}
            trendUp
          />
          <StatCard
            label="Needs Attention"
            value={stats.needsAttention}
            sub="Action required"
            icon={<AlertCircle className="h-4 w-4 text-orange-500" />}
            iconBg="bg-orange-100"
          />
          {/* Awaiting Response — links to standalone /dashboard/buyers page */}
          <Link
            href="/dashboard/buyers"
            className={cn(
              'flex items-center gap-3 rounded-xl border p-4 text-left shadow-sm transition-shadow hover:shadow-md',
              pendingBuyerCount
                ? 'border-sky-200 bg-sky-50'
                : 'border-[var(--color-border)] bg-white',
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                pendingBuyerCount
                  ? 'bg-sky-100 text-sky-600'
                  : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
              )}
            >
              <Eye className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[var(--color-muted-foreground)]">
                Awaiting Response
              </p>
              {pendingBuyerCount === null ? (
                <div className="mt-0.5 h-5 w-8 animate-pulse rounded bg-[var(--color-border)]" />
              ) : (
                <p className="mt-0.5 text-xl font-bold tracking-tight text-[var(--color-foreground)]">
                  {pendingBuyerCount}
                </p>
              )}
              <p className="text-[11px] text-[var(--color-muted-foreground)]">From buyers</p>
            </div>
            {pendingBuyerCount ? (
              <ChevronRight className="h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
            ) : null}
          </Link>
        </div>
      ) : null}

      {/* Pill tab bar — listing status filters only (Buyers is in sidebar nav) */}
      {personaState === 'seller' && (
        <div role="tablist" aria-label="Filter listings by status" className="flex flex-wrap gap-2">
          {TAB_VALUES.filter((t) => t !== 'buyers').map((tabValue) => {
            const count = tabCounts[tabValue as Exclude<TabFilter, 'buyers'>]
            const isActive = activeTab === tabValue
            return (
              <button
                key={tabValue}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => setActiveTab(tabValue)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1',
                  isActive
                    ? 'border-[var(--color-foreground)] bg-[var(--color-foreground)] text-white'
                    : 'border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)] hover:border-[var(--color-foreground)] hover:text-[var(--color-foreground)]',
                )}
              >
                {TAB_LABELS[tabValue]}
                {(isActive ? true : count > 0) && (
                  <span
                    className={cn(
                      'flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
                    )}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {activeTab === 'buyers' ? (
        <BuyersTabContent
          interests={interests}
          loading={interestLoading}
          error={interestError}
          statusFilter={interestStatusFilter}
          sort={interestSort}
          actionLoadingId={actionLoadingId}
          interestSuccess={interestSuccess}
          onStatusFilter={setInterestStatusFilter}
          onSort={setInterestSort}
          onAction={handleInterestAction}
          onShareContact={handleShareContact}
          sharingContactId={sharingContactId}
          onChat={openChatForInterest}
          onDismissError={() => setInterestError(null)}
          onDismissSuccess={() => setInterestSuccess(null)}
        />
      ) : loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
        </div>
      ) : filteredListings.length === 0 ? (
        <EmptyState
          tab={activeTab as Exclude<TabFilter, 'buyers'>}
          personaState={personaState}
          onShowAll={() => setActiveTab('all')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              interestedCount={interestedCountMap[listing.id] ?? 0}
              onDelete={handleDeleteListing}
              onStatusChange={handleStatusChange}
              isDeleting={deletingId === listing.id}
              statusChangingId={statusChangingId}
            />
          ))}
        </div>
      )}

      {/* FAB for mobile — only for sellers */}
      {personaState === 'seller' && (
        <div
          className="fixed bottom-20 right-4 sm:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <Link
            href="/sell"
            aria-label="Create new listing"
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-foreground)] text-white shadow-lg',
              'transition-transform hover:scale-105 active:scale-95',
            )}
          >
            <Plus className="h-6 w-6" />
          </Link>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
        </div>
      }
    >
      <DashboardPageInner />
    </Suspense>
  )
}
