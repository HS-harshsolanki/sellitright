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
  CheckCircle,
  PauseCircle,
  PlayCircle,
  Undo2,
  ExternalLink,
  IndianRupee,
  ChevronRight,
  Pencil,
  BedDouble,
  Bath,
  Maximize2,
  MessageSquare,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'

import { formatPrice } from '@/lib/format'
import type { MockListing, ListingStatus } from '@/lib/mock-data'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type TabFilter = 'all' | 'active' | 'draft' | 'pending' | 'rejected' | 'sold' | 'buyers'

const TAB_VALUES: TabFilter[] = ['all', 'active', 'draft', 'pending', 'rejected', 'sold', 'buyers']

const TAB_LABELS: Record<TabFilter, string> = {
  all: 'All',
  active: 'Active',
  draft: 'Draft',
  pending: 'Pending',
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
  icon: React.ReactNode
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
  onDelete,
  onStatusChange,
  isDeleting,
  statusChangingId,
}: ListingCardProps) {
  const statusConfig = STATUS_CONFIG[listing.status]
  const cover = listing.images[0]?.url
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmSold, setConfirmSold] = useState(false)
  const isBusy = isDeleting || statusChangingId === listing.id
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  return (
    <article className="group overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-sm transition-all duration-200 hover:shadow-md">
      {/* ── Image — 16:9 ratio matching Deli-Prop ── */}
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
          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-[var(--color-muted-foreground)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 opacity-25"
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
            <span className="text-[11px] opacity-30">No image</span>
          </div>
        )}
        {/* Status pill */}
        <span
          className={cn(
            'absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur-sm',
            statusConfig.className,
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', statusConfig.dot)} aria-hidden="true" />
          {statusConfig.label}
        </span>
        {/* View count */}
        <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
          <Eye className="h-2.5 w-2.5" aria-hidden="true" />
          {listing.viewCount}
        </span>
      </div>

      {/* ── Body — tight padding ── */}
      <div className="p-3">
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
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--color-muted-foreground)]">
          <MapPin className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {listing.locality}, {listing.city}
          </span>
        </div>

        {/* Rejection reason */}
        {listing.status === 'REJECTED' && listing.rejectionReason && (
          <div className="mt-2 flex items-start gap-1 rounded-lg bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{listing.rejectionReason}</span>
          </div>
        )}

        {/* Metadata strip — Deli-Prop style with Lucide icons */}
        {(listing.bhkType ?? listing.builtUpArea) && (
          <div className="mt-2.5 flex items-center gap-3 border-t border-[var(--color-border)] pt-2.5 text-[11px] text-[var(--color-muted-foreground)]">
            {listing.bhkType && (
              <span className="flex items-center gap-1">
                <BedDouble className="h-3 w-3 shrink-0" aria-hidden="true" />
                {listing.bhkType.replace('_BHK', ' BHK').replace('_RK', ' RK')}
              </span>
            )}
            {listing.bathrooms !== null && listing.bathrooms > 0 && (
              <span className="flex items-center gap-1">
                <Bath className="h-3 w-3 shrink-0" aria-hidden="true" />
                {listing.bathrooms}
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

        {/* ── Primary action row ── */}
        <div className="mt-3 flex gap-1.5">
          {listing.status === 'ACTIVE' && (
            <>
              <Link
                href={`/listing/${listing.id}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-foreground)] hover:text-[var(--color-foreground)]"
                title="View public listing"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link
                href={`/dashboard/listings/${listing.id}/edit`}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--color-border)] py-1.5 text-xs font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
              >
                <Pencil className="h-3 w-3" aria-hidden="true" />
                Edit
              </Link>
            </>
          )}

          {listing.status === 'DRAFT' && (
            <Link
              href={`/sell?draftId=${listing.id}`}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--color-border)] py-1.5 text-xs font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
            >
              Resume Draft
            </Link>
          )}

          {listing.status === 'INACTIVE' && (
            <>
              <Link
                href={`/listing/${listing.id}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-foreground)] hover:text-[var(--color-foreground)]"
                title="View listing"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void onStatusChange(listing.id, 'REACTIVATE')}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-green-400 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
              >
                {isBusy ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <PlayCircle className="h-3 w-3" aria-hidden="true" />
                )}
                Reactivate
              </button>
            </>
          )}

          {listing.status === 'REJECTED' && (
            <>
              <Link
                href={`/listing/${listing.id}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-foreground)] hover:text-[var(--color-foreground)]"
                title="View listing"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link
                href={`/sell?draftId=${listing.id}`}
                className="flex flex-1 items-center justify-center rounded-lg bg-[var(--color-foreground)] py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              >
                Edit &amp; Resubmit
              </Link>
            </>
          )}

          {listing.status === 'PENDING_REVIEW' && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void onStatusChange(listing.id, 'WITHDRAW_REVIEW')}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--color-border)] py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] disabled:opacity-50"
            >
              {isBusy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Undo2 className="h-3 w-3" aria-hidden="true" />
              )}
              Withdraw
            </button>
          )}

          {listing.status === 'SOLD' && (
            <Link
              href={`/listing/${listing.id}`}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--color-border)] py-1.5 text-xs font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
              View listing
            </Link>
          )}
        </div>

        {/* ── Secondary row ── */}
        {(listing.status === 'ACTIVE' ||
          listing.status === 'INACTIVE' ||
          listing.status === 'DRAFT' ||
          listing.status === 'REJECTED') && (
          <div className="mt-2.5 flex items-center gap-3 border-t border-[var(--color-border)] pt-2.5">
            {listing.status === 'ACTIVE' &&
              (confirmSold ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    Mark as sold?
                  </span>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setConfirmSold(false)
                      void onStatusChange(listing.id, 'SOLD')
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
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
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setConfirmSold(true)}
                    className="text-xs text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] disabled:opacity-50"
                  >
                    Mark sold
                  </button>
                  <span className="text-[var(--color-border)]" aria-hidden="true">
                    ·
                  </span>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void onStatusChange(listing.id, 'PAUSE')}
                    className="text-xs text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] disabled:opacity-50"
                  >
                    Pause
                  </button>
                </>
              ))}

            {listing.status === 'INACTIVE' &&
              (confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-muted-foreground)]">Delete?</span>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setConfirmDelete(false)
                      onDelete(listing.id)
                    }}
                    className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                  >
                    {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-[var(--color-muted-foreground)] hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : confirmSold ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    Mark as sold?
                  </span>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setConfirmSold(false)
                      void onStatusChange(listing.id, 'SOLD')
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
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
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setConfirmSold(true)}
                    className="text-xs text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] disabled:opacity-50"
                  >
                    Mark sold
                  </button>
                  <span className="text-[var(--color-border)]" aria-hidden="true">
                    ·
                  </span>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setConfirmDelete(true)}
                    className="text-xs text-red-400 transition-colors hover:text-red-600 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </>
              ))}

            {listing.status === 'DRAFT' &&
              (confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    Delete draft?
                  </span>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setConfirmDelete(false)
                      onDelete(listing.id)
                    }}
                    className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                  >
                    {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-[var(--color-muted-foreground)] hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs text-red-400 transition-colors hover:text-red-600 disabled:opacity-50"
                >
                  Delete draft
                </button>
              ))}

            {listing.status === 'REJECTED' &&
              (confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-muted-foreground)]">Delete?</span>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setConfirmDelete(false)
                      onDelete(listing.id)
                    }}
                    className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                  >
                    {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-[var(--color-muted-foreground)] hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  {listing.rejectionReason && (
                    <span className="flex-1 text-xs text-[var(--color-muted-foreground)]">
                      Address the reason before resubmitting.
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setConfirmDelete(true)}
                    className="ml-auto text-xs text-red-400 transition-colors hover:text-red-600 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </>
              ))}
          </div>
        )}
      </div>
    </article>
  )
}

interface BuyerInterestCardProps {
  item: SellerInterestItem
  onAction: (id: string, action: 'ACCEPTED' | 'DECLINED') => Promise<void>
  actionLoading: boolean
}

function BuyerInterestCard({ item, onAction, actionLoading }: BuyerInterestCardProps) {
  const [confirmDecline, setConfirmDecline] = useState(false)
  const statusCfg = INTEREST_STATUS_CONFIG[item.status] ?? {
    label: item.status,
    className: 'bg-gray-100 text-gray-600',
  }
  const dateStr = new Date(item.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const awaitingPayment = item.status === 'ACCEPTED' && !item.contactUnlocked

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[var(--color-foreground)]">{item.fullName}</p>
            <span
              className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', statusCfg.className)}
            >
              {statusCfg.label}
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
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-[var(--color-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">
          {PURPOSE_LABEL[item.purpose] ?? item.purpose}
        </span>
        <span className="rounded-full bg-[var(--color-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">
          {TIMELINE_LABEL[item.timeline] ?? item.timeline}
        </span>
        <span className="rounded-full bg-[var(--color-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">
          {FUNDING_LABEL[item.funding] ?? item.funding}
        </span>
      </div>

      {item.message && (
        <div className="mt-3 rounded-lg bg-[var(--color-muted)] px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
          &ldquo;{item.message}&rdquo;
        </div>
      )}

      {/* Accepted but buyer hasn't paid yet */}
      {awaitingPayment && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <IndianRupee className="h-3.5 w-3.5 shrink-0 text-blue-500" aria-hidden="true" />
          <p className="text-xs font-medium text-blue-700">
            Awaiting buyer payment — contact details visible once they pay ₹49
          </p>
        </div>
      )}

      {/* Contact unlocked */}
      {item.contactUnlocked && (item.buyerPhone ?? item.buyerEmail) && (
        <div className="mt-3 space-y-1 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          <p className="text-xs font-semibold text-green-800">Buyer contact unlocked</p>
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

      {/* Message button — available once interest is accepted */}
      {item.status === 'ACCEPTED' && (
        <div className="mt-3">
          <Link
            href={`/messages/${item.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            Message buyer
          </Link>
        </div>
      )}

      <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">Requested on {dateStr}</p>

      {item.status === 'PENDING' && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {confirmDecline ? (
            <>
              <p className="mr-1 text-xs text-[var(--color-muted-foreground)]">
                Decline this request?
              </p>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  void onAction(item.id, 'DECLINED')
                  setConfirmDecline(false)
                }}
                className={cn(
                  'rounded-lg border border-red-400 px-3 py-1.5 text-xs font-semibold text-red-600',
                  'transition-colors hover:bg-red-50 disabled:opacity-50',
                )}
              >
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Yes, decline'}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirmDecline(false)}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void onAction(item.id, 'ACCEPTED')}
                className={cn(
                  'rounded-lg border border-green-500 px-3 py-1.5 text-xs font-semibold text-green-700',
                  'transition-colors hover:bg-green-50 disabled:opacity-50',
                )}
              >
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Accept'}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirmDecline(true)}
                className={cn(
                  'rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600',
                  'transition-colors hover:bg-red-50 disabled:opacity-50',
                )}
              >
                Decline
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

type InterestStatusFilter = 'ALL' | 'PENDING' | 'ACCEPTED' | 'DECLINED'

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
  onDismissError: () => void
  onDismissSuccess: () => void
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
  onDismissError,
  onDismissSuccess,
}: BuyersTabContentProps) {
  const STATUS_FILTERS: { value: InterestStatusFilter; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'ACCEPTED', label: 'Accepted' },
    { value: 'DECLINED', label: 'Declined' },
  ]

  return (
    <div className="space-y-4">
      {/* Section header with filter chips — distinct from the top tab bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)]">Filter:</span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onStatusFilter(f.value)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all',
                statusFilter === f.value
                  ? 'border-[var(--color-foreground)] bg-[var(--color-foreground)] text-white'
                  : 'border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)] hover:border-[var(--color-foreground)] hover:text-[var(--color-foreground)]',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {!loading && interests.length > 0 && (
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as 'newest' | 'oldest')}
            className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        )}
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
            className="shrink-0 text-xs text-green-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
        </div>
      ) : error ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={onDismissError}
            className="shrink-0 text-xs text-red-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : interests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-muted)]">
            <Users className="h-8 w-8 text-[var(--color-muted-foreground)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--color-foreground)]">
            {statusFilter === 'ALL'
              ? 'No buyer requests yet'
              : `No ${statusFilter.toLowerCase()} requests`}
          </h3>
          <p className="mt-1 max-w-xs text-sm text-[var(--color-muted-foreground)]">
            {statusFilter === 'ALL'
              ? 'When buyers express interest in your listings, their requests will appear here.'
              : `No requests with ${statusFilter.toLowerCase()} status.`}
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
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [interests, setInterests] = useState<SellerInterestItem[]>([])
  const [interestLoading, setInterestLoading] = useState(false)
  const [interestError, setInterestError] = useState<string | null>(null)
  const [interestSuccess, setInterestSuccess] = useState<string | null>(null)
  const [interestStatusFilter, setInterestStatusFilter] = useState<InterestStatusFilter>('ALL')
  const [interestSort, setInterestSort] = useState<'newest' | 'oldest'>('newest')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
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
        setInterestSuccess(
          action === 'ACCEPTED' ? 'Request accepted — buyer notified.' : 'Request declined.',
        )
      } else {
        const err = (await res.json()) as { error?: string }
        setInterestError(err.error ?? 'Failed to update request.')
      }
    } catch {
      setInterestError('Network error — try again.')
    } finally {
      setActionLoadingId(null)
    }
  }

  function handleDeleteListing(listingId: string) {
    setDeletingId(listingId)
    setActionError(null)
    fetch(`/api/listings/${listingId}`, { method: 'DELETE' })
      .then(async (r) => {
        if (r.ok) {
          setListings((prev) => prev.filter((l) => l.id !== listingId))
        } else {
          const d = (await r.json()) as { error?: string }
          setActionError(d.error ?? 'Failed to delete listing')
        }
      })
      .catch(() => setActionError('Failed to delete listing'))
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
        } else if (action === 'PAUSE') {
          setActionSuccess('Listing paused — hidden from buyers.')
        } else if (action === 'REACTIVATE') {
          setActionSuccess('Listing reactivated and live.')
        } else if (action === 'SOLD') {
          setActionSuccess('Listing marked as sold.')
        }
      } else {
        const d = (await res.json()) as { error?: string }
        setActionError(d.error ?? 'Failed to update listing.')
      }
    } catch {
      setActionError('Network error — try again.')
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
    views: visibleListings.reduce((sum, l) => sum + l.viewCount, 0),
  }

  const pageTitle = personaState === 'buyer' ? 'My Activity' : 'My Listings'
  const pageSubtitle =
    personaState === 'buyer'
      ? 'Track your property interests and requests'
      : 'Manage and track your property listings'

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
              'hidden shrink-0 items-center gap-2 rounded-xl bg-[var(--color-foreground)] px-4 py-2 text-sm font-semibold text-white sm:flex',
              'transition-opacity hover:opacity-90',
            )}
          >
            <Plus className="h-4 w-4" /> New listing
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
            label="Active"
            value={stats.active}
            sub="Currently live"
            icon={<TrendingUp className="h-4 w-4 text-green-600" />}
            iconBg="bg-green-100"
            trend={stats.active > 0 ? 'Live' : undefined}
            trendUp
          />
          <StatCard
            label="Total Views"
            value={stats.views.toLocaleString('en-IN')}
            sub="Across all listings"
            icon={<Eye className="h-4 w-4 text-sky-600" />}
            iconBg="bg-sky-100"
          />
          {/* Buyer requests — compact interactive card matching StatCard height */}
          <button
            type="button"
            onClick={() => setActiveTab('buyers')}
            className={cn(
              'flex items-center gap-3 rounded-xl border p-4 text-left shadow-sm transition-shadow hover:shadow-md',
              pendingBuyerCount
                ? 'border-indigo-200 bg-indigo-50'
                : 'border-[var(--color-border)] bg-white',
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                pendingBuyerCount
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
              )}
            >
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[var(--color-muted-foreground)]">
                Buyer Requests
              </p>
              {pendingBuyerCount === null ? (
                <div className="mt-0.5 h-5 w-8 animate-pulse rounded bg-[var(--color-border)]" />
              ) : (
                <p className="mt-0.5 text-xl font-bold tracking-tight text-[var(--color-foreground)]">
                  {pendingBuyerCount}
                </p>
              )}
              <p className="text-[11px] text-[var(--color-muted-foreground)]">Pending</p>
            </div>
            {pendingBuyerCount ? (
              <ChevronRight className="h-4 w-4 shrink-0 text-indigo-400" aria-hidden="true" />
            ) : null}
          </button>
        </div>
      ) : null}

      {/* Single unified tab bar — listing filters + Buyers in one row */}
      {personaState === 'seller' && (
        <div
          role="tablist"
          aria-label="Dashboard sections"
          className="flex gap-0.5 overflow-x-auto border-b border-[var(--color-border)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TAB_VALUES.filter((tabValue) => {
            if (tabValue === 'all' || tabValue === 'buyers') return true
            return tabCounts[tabValue as Exclude<TabFilter, 'buyers'>] > 0 || activeTab === tabValue
          }).map((tabValue) => {
            const isBuyers = tabValue === 'buyers'
            const count = isBuyers
              ? (pendingBuyerCount ?? 0)
              : tabCounts[tabValue as Exclude<TabFilter, 'buyers'>]
            const isActive = activeTab === tabValue
            return (
              <button
                key={tabValue}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => setActiveTab(tabValue)}
                className={cn(
                  'relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1',
                  isActive
                    ? 'text-[var(--color-foreground)]'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                  isBuyers && 'ml-auto',
                )}
              >
                {isBuyers && <Users className="h-3.5 w-3.5" aria-hidden="true" />}
                {TAB_LABELS[tabValue]}
                {count > 0 && (
                  <span
                    className={cn(
                      'flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold',
                      isActive
                        ? isBuyers
                          ? 'bg-indigo-500 text-white'
                          : 'bg-[var(--color-foreground)] text-white'
                        : isBuyers
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
                    )}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[var(--color-foreground)]"
                    aria-hidden="true"
                  />
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
