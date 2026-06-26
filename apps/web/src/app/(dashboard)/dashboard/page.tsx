'use client'

import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/format'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Eye, LayoutGrid, MapPin, Plus, TrendingUp, AlertCircle, Loader2 } from 'lucide-react'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import type { MockListing, ListingStatus } from '@/lib/mock-data'
import { MOCK_LISTINGS } from '@/lib/mock-data'

type TabFilter = 'all' | 'active' | 'draft' | 'pending' | 'rejected' | 'sold'

const TAB_OPTIONS: { value: TabFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'sold', label: 'Sold' },
]

const STATUS_CONFIG: Record<ListingStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-700' },
  DRAFT: { label: 'Draft', className: 'bg-yellow-100 text-yellow-700' },
  SOLD: { label: 'Sold', className: 'bg-blue-100 text-blue-700' },
  INACTIVE: { label: 'Inactive', className: 'bg-muted text-muted-foreground' },
  PENDING_REVIEW: { label: 'Pending Review', className: 'bg-orange-100 text-orange-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
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
    <div className={cn('flex items-start gap-4 rounded-xl border border-border bg-white p-4', accent && 'border-primary/20 bg-primary/5')}>
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', accent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={cn('text-2xl font-bold', accent && 'text-primary')}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
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
    <article className="group overflow-hidden rounded-xl border border-border bg-white transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {cover ? (
          <Image
            src={cover}
            alt={listing.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
            </svg>
          </div>
        )}
        <span className={cn('absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold', statusConfig.className)}>
          {statusConfig.label}
        </span>
      </div>

      <div className="p-4">
        <h3 className="line-clamp-1 font-semibold text-foreground">{listing.title}</h3>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{listing.locality}, {listing.city}</span>
        </div>

        {/* Rejection reason */}
        {listing.status === 'REJECTED' && listing.rejectionReason && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{listing.rejectionReason}</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <p className="text-base font-bold text-foreground">{formatPrice(listing.price)}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            <span>{listing.viewCount}</span>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {listing.status === 'DRAFT' ? (
            <Link
              href="/sell"
              className={cn('flex-1 rounded-lg border border-primary py-2 text-center text-xs font-medium text-primary', 'transition-colors hover:bg-primary/5')}
            >
              Resume Draft
            </Link>
          ) : (
            <Link
              href={`/dashboard/listings/${listing.id}/edit`}
              className={cn('flex-1 rounded-lg border border-border py-2 text-center text-xs font-medium text-foreground', 'transition-colors hover:bg-muted')}
            >
              Edit
            </Link>
          )}
          <Link
            href={`/listing/${listing.id}`}
            className={cn('flex-1 rounded-lg border border-border py-2 text-center text-xs font-medium text-foreground', 'transition-colors hover:bg-muted')}
          >
            View
          </Link>
        </div>
      </div>
    </article>
  )
}

function EmptyState({ tab }: { tab: TabFilter }) {
  const messages: Record<TabFilter, { title: string; sub: string }> = {
    all: { title: 'No listings yet', sub: 'Start selling by creating your first property listing.' },
    active: { title: 'No active listings', sub: 'Your published listings will appear here.' },
    draft: { title: 'No drafts', sub: "Listings you've saved but not yet published will appear here." },
    pending: { title: 'No pending listings', sub: 'Listings awaiting review will appear here.' },
    rejected: { title: 'No rejected listings', sub: 'Listings rejected by our team will appear here.' },
    sold: { title: 'No sold listings', sub: "Properties you've marked as sold will appear here." },
  }
  const msg = messages[tab]
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-foreground">{msg.title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{msg.sub}</p>
      <Link href="/sell" className={cn('mt-6 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white', 'transition-colors hover:bg-primary/90')}>
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

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        if (isSupabaseConfigured()) {
          const res = await fetch('/api/dashboard/listings')
          if (res.ok) {
            const json = await res.json() as { listings: DashboardListing[] }
            setListings(json.listings.map(toDisplayListing))
          } else {
            // Fallback to mock data if API fails
            setListings(MOCK_LISTINGS)
          }
        } else {
          setListings(MOCK_LISTINGS)
        }
      } catch {
        setListings(MOCK_LISTINGS)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const filteredListings = listings.filter((listing) => {
    if (activeTab === 'all') return true
    if (activeTab === 'pending') return listing.status === 'PENDING_REVIEW'
    if (activeTab === 'rejected') return listing.status === 'REJECTED'
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
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">My Listings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage and track your property listings</p>
        </div>
        <Link href="/sell" className={cn('hidden items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white sm:flex', 'transition-colors hover:bg-primary/90')}>
          <Plus className="h-4 w-4" />
          New listing
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total Listings" value={stats.total} icon={<LayoutGrid className="h-5 w-5" />} />
        <StatCard label="Active" value={stats.active} sub="Currently live" icon={<TrendingUp className="h-5 w-5" />} accent />
        <div className="col-span-2 sm:col-span-1">
          <StatCard label="Views This Month" value={stats.views.toLocaleString('en-IN')} sub="Across all listings" icon={<Eye className="h-5 w-5" />} />
        </div>
      </div>

      <div role="tablist" aria-label="Filter listings" className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={activeTab === tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              activeTab === tab.value ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredListings.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      <div className="fixed bottom-20 right-4 sm:hidden">
        <Link href="/sell" aria-label="Create new listing" className={cn('flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg', 'transition-transform hover:scale-105 active:scale-95')}>
          <Plus className="h-6 w-6" />
        </Link>
      </div>
    </div>
  )
}
