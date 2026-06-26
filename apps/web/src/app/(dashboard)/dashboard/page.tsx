'use client'

import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/format'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import type { MockListing, ListingStatus } from '@/lib/mock-data'
import { MOCK_LISTINGS } from '@/lib/mock-data'

type TabFilter = 'all' | 'active' | 'draft' | 'pending' | 'rejected' | 'sold' | 'buyers'

const TAB_OPTIONS: { value: TabFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'sold', label: 'Sold' },
  { value: 'buyers', label: 'Interested Buyers' },
]

const STATUS_CONFIG: Record<ListingStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-700' },
  DRAFT: { label: 'Draft', className: 'bg-yellow-100 text-yellow-700' },
  SOLD: { label: 'Sold', className: 'bg-blue-100 text-blue-700' },
  INACTIVE: {
    label: 'Inactive',
    className: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
  },
  PENDING_REVIEW: { label: 'Pending Review', className: 'bg-orange-100 text-orange-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
  DELETED: { label: 'Deleted', className: 'bg-gray-200 text-gray-500 line-through' },
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

// Shape returned by /api/dashboard/listings
interface DashboardListing {
  id: string
  title: string
  price: number
  property_type: string
  bhk_type: string | null
  built_up_area: number | null
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
    furnishing: 'UNFURNISHED',
    ageOfProperty: null,
    bathrooms: 2,
    balconies: 0,
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
  accent?: boolean
}

function StatCard({ label, value, sub, icon, accent = false }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-xl border border-[var(--color-border)] bg-white p-4',
        accent && 'border-[var(--color-border)] bg-[var(--color-muted)]',
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          accent
            ? 'bg-[var(--color-muted)] text-[var(--color-foreground)]'
            : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-[var(--color-muted-foreground)]">{label}</p>
        <p className={cn('text-2xl font-bold', accent && 'text-[var(--color-foreground)]')}>
          {value}
        </p>
        {sub && <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{sub}</p>}
      </div>
    </div>
  )
}

interface ListingCardProps {
  listing: MockListing
}

function ListingCard({ listing }: ListingCardProps) {
  const statusConfig = STATUS_CONFIG[listing.status]
  const cover = listing.images[0]?.url

  return (
    <article className="group overflow-hidden rounded-xl border border-[var(--color-border)] bg-white transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--color-muted)]">
        {cover ? (
          <Image
            src={cover}
            alt={listing.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--color-muted-foreground)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 9.75L12 3l9 6.75V21H3V9.75z"
              />
            </svg>
          </div>
        )}
        <span
          className={cn(
            'absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold',
            statusConfig.className,
          )}
        >
          {statusConfig.label}
        </span>
      </div>

      <div className="p-4">
        <h3 className="line-clamp-1 font-semibold text-[var(--color-foreground)]">
          {listing.title}
        </h3>
        <div className="mt-1 flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {listing.locality}, {listing.city}
          </span>
        </div>

        {listing.status === 'REJECTED' && listing.rejectionReason && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{listing.rejectionReason}</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <p className="text-base font-bold text-[var(--color-foreground)]">
            {formatPrice(listing.price)}
          </p>
          <div className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
            <Eye className="h-3.5 w-3.5" />
            <span>{listing.viewCount}</span>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {listing.status === 'DRAFT' ? (
            <Link
              href="/sell"
              className={cn(
                'flex-1 rounded-lg border border-[var(--color-border)] py-2 text-center text-xs font-medium text-[var(--color-foreground)]',
                'transition-colors hover:bg-[var(--color-muted)]',
              )}
            >
              Resume Draft
            </Link>
          ) : (
            <Link
              href={`/listings/${listing.id}/edit`}
              className={cn(
                'flex-1 rounded-lg border border-[var(--color-border)] py-2 text-center text-xs font-medium text-[var(--color-foreground)]',
                'transition-colors hover:bg-[var(--color-muted)]',
              )}
            >
              Edit
            </Link>
          )}
          <Link
            href={`/listing/${listing.id}`}
            className={cn(
              'flex-1 rounded-lg border border-[var(--color-border)] py-2 text-center text-xs font-medium text-[var(--color-foreground)]',
              'transition-colors hover:bg-[var(--color-muted)]',
            )}
          >
            View
          </Link>
        </div>
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

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
      {/* Row 1: Name + status badge + listing */}
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
          <p className="mt-0.5 truncate text-xs text-[var(--color-muted-foreground)]">
            {item.listingTitle}
            {item.listingCity ? ` · ${item.listingCity}` : ''}
          </p>
        </div>
      </div>

      {/* Row 2: Metadata chips */}
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

      {/* Row 3: Message */}
      {item.message && (
        <div className="mt-3 rounded-lg bg-[var(--color-muted)] px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
          &ldquo;{item.message}&rdquo;
        </div>
      )}

      {/* Row 4: Buyer contact (visible to seller after payment) */}
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

      {/* Row 5: Date */}
      <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">Requested on {dateStr}</p>

      {/* Row 5: Actions (PENDING only) */}
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
              <button
                type="button"
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] disabled:opacity-50"
              >
                Later
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
  onStatusFilter: (s: InterestStatusFilter) => void
  onSort: (s: 'newest' | 'oldest') => void
  onAction: (id: string, action: 'ACCEPTED' | 'DECLINED') => Promise<void>
}

function BuyersTabContent({
  interests,
  loading,
  error,
  statusFilter,
  sort,
  actionLoadingId,
  onStatusFilter,
  onSort,
  onAction,
}: BuyersTabContentProps) {
  const STATUS_FILTERS: { value: InterestStatusFilter; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'ACCEPTED', label: 'Accepted' },
    { value: 'DECLINED', label: 'Declined' },
  ]

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-[var(--color-muted)] p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onStatusFilter(f.value)}
              className={cn(
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                statusFilter === f.value
                  ? 'bg-white text-[var(--color-foreground)] shadow-sm'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as 'newest' | 'oldest')}
          className="focus:ring-ring rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
        </div>
      ) : error ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>{error}</span>
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

function EmptyState({ tab }: { tab: Exclude<TabFilter, 'buyers'> }) {
  const messages: Record<Exclude<TabFilter, 'buyers'>, { title: string; sub: string }> = {
    all: {
      title: 'No listings yet',
      sub: 'Start selling by creating your first property listing.',
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
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-muted)]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-[var(--color-muted-foreground)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 9.75L12 3l9 6.75V21H3V9.75z"
          />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-[var(--color-foreground)]">{msg.title}</h3>
      <p className="mt-1 max-w-xs text-sm text-[var(--color-muted-foreground)]">{msg.sub}</p>
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
    </div>
  )
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [listings, setListings] = useState<MockListing[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Interested Buyers state
  const [interests, setInterests] = useState<SellerInterestItem[]>([])
  const [interestLoading, setInterestLoading] = useState(false)
  const [interestError, setInterestError] = useState<string | null>(null)
  const [interestStatusFilter, setInterestStatusFilter] = useState<InterestStatusFilter>('PENDING')
  const [interestSort, setInterestSort] = useState<'newest' | 'oldest'>('newest')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

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
            console.error('[dashboard] listings fetch failed, status:', res.status)
            setFetchError('Failed to load listings. Please refresh.')
            setListings(MOCK_LISTINGS)
          }
        } else {
          setListings(MOCK_LISTINGS)
        }
      } catch {
        setFetchError('Network error — check your connection and refresh.')
        setListings(MOCK_LISTINGS)
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
          const json = (await res.json()) as { interests: SellerInterestItem[] }
          setInterests(json.interests)
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

  const filteredListings = listings.filter((listing) => {
    if (activeTab === 'all') return true
    if (activeTab === 'pending') return listing.status === 'PENDING_REVIEW'
    if (activeTab === 'rejected') return listing.status === 'REJECTED'
    if (activeTab === 'buyers') return false
    return listing.status.toLowerCase() === activeTab
  })

  const stats = {
    total: listings.length,
    active: listings.filter((l) => l.status === 'ACTIVE').length,
    views: listings.reduce((sum, l) => sum + l.viewCount, 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-foreground)] sm:text-2xl">
            My Listings
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            Manage and track your property listings
          </p>
        </div>
        <Link
          href="/sell"
          className={cn(
            'hidden items-center gap-2 rounded-xl bg-[var(--color-foreground)] px-4 py-2.5 text-sm font-semibold text-white sm:flex',
            'transition-opacity hover:opacity-90',
          )}
        >
          <Plus className="h-4 w-4" />
          New listing
        </Link>
      </div>

      {fetchError && activeTab !== 'buyers' && (
        <div
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>{fetchError}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Listings"
          value={stats.total}
          icon={<LayoutGrid className="h-5 w-5" />}
        />
        <StatCard
          label="Active"
          value={stats.active}
          sub="Currently live"
          icon={<TrendingUp className="h-5 w-5" />}
          accent
        />
        <div className="col-span-2 sm:col-span-1">
          <StatCard
            label="Views This Month"
            value={stats.views.toLocaleString('en-IN')}
            sub="Across all listings"
            icon={<Eye className="h-5 w-5" />}
          />
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Filter listings"
        className="flex gap-1 overflow-x-auto rounded-xl bg-[var(--color-muted)] p-1"
      >
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={activeTab === tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all',
              'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
              activeTab === tab.value
                ? 'bg-white text-[var(--color-foreground)] shadow-sm'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'buyers' ? (
        <BuyersTabContent
          interests={interests}
          loading={interestLoading}
          error={interestError}
          statusFilter={interestStatusFilter}
          sort={interestSort}
          actionLoadingId={actionLoadingId}
          onStatusFilter={setInterestStatusFilter}
          onSort={setInterestSort}
          onAction={handleInterestAction}
        />
      ) : loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
        </div>
      ) : filteredListings.length === 0 ? (
        <EmptyState tab={activeTab as Exclude<TabFilter, 'buyers'>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      <div className="fixed bottom-24 right-4 sm:hidden">
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
    </div>
  )
}
