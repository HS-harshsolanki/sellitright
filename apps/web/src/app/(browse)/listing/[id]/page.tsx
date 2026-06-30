import { MapPin, BadgeCheck, User, ArrowLeft, Pencil } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { ContactSeller } from '@/components/listing/contact-seller'
import { ExpandableDescription } from '@/components/listing/expandable-description'
import { ListingGallery } from '@/components/listing/listing-gallery'
import { MobileBottomBar } from '@/components/listing/mobile-bottom-bar'
import { PropertyHighlights } from '@/components/listing/property-highlights'
import { ShareSaveButtons } from '@/components/listing/share-save-buttons'
import { ShowAllAmenities } from '@/components/listing/show-all-amenities'
import { formatPrice, formatBHK, formatArea, formatFloor } from '@/lib/format'
import { mapSupabaseListingToMock } from '@/lib/listing-mapper'
import type { MockListing } from '@/lib/mock-data'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 300

const getListingData = cache(async (id: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('listings')
    .select(
      'id, title, price, property_type, bhk_type, built_up_area, carpet_area, floor, total_floors, facing, furnishing, bathrooms, balconies, parking, age_of_property, amenities, city, locality, address, pincode, state, image_urls, status, is_verified, view_count, created_at, seller_id, description',
    )
    .eq('id', id)
    .single()
  return data
})

interface ListingPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { id } = await params

  const listing = await getListingData(id)

  if (!listing) return { title: 'Listing not found' }

  const priceStr = formatPrice(listing.price)
  const bhk = formatBHK(listing.bhk_type ?? '')
  const description = (listing.description ?? '').slice(0, 155)

  return {
    title: `${bhk} in ${listing.locality}, ${listing.city} — ${priceStr}`,
    description,
    openGraph: {
      title: listing.title,
      description,
      images: listing.image_urls?.[0] ? [{ url: listing.image_urls[0] }] : [],
    },
  }
}

// ─── Amenity icon mapping ─────────────────────────────────────────────────────
// Map common amenity names to a simple character/symbol for the 2-col grid.
// Using CheckSquare as the universal fallback.

// ─── Page component ───────────────────────────────────────────────────────────

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params

  // ── 1. Try Supabase first (anon client — respects RLS) ──────────────────
  const supabase = await createClient()
  let listingRaw: MockListing | undefined = undefined
  let isOwner = false
  let listingStatus: string | null = null
  let viewer: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] | undefined =
    undefined

  try {
    const {
      data: { user: _viewer },
    } = await supabase.auth.getUser()
    viewer = _viewer ?? undefined

    const data = await getListingData(id)
    if (data) {
      listingStatus = data.status
      isOwner = viewer?.id === data.seller_id
      const isVisible = data.status === 'ACTIVE' || isOwner
      if (isVisible) {
        listingRaw = mapSupabaseListingToMock(data)
      }
    }
  } catch {
    // Supabase not configured or network error — fall through to notFound()
  }

  // ── 2. 404 if Supabase returned nothing ──────────────────────────────────
  if (!listingRaw) notFound()

  // notFound() throws (`never`), so listingRaw is defined beyond this point.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const listing = listingRaw!

  const isAuthenticated = !!viewer

  // Check buyer's interest state for this listing (server-side, avoids flash)
  let hasExistingRequest = false
  let interestStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED' | null = null
  let contactUnlocked = false
  let sellerPhone: string | null = null
  let sellerEmail: string | null = null
  let interestId: string | null = null

  if (viewer) {
    try {
      type InterestRow = {
        id: string
        status: string
        contact_unlocked: boolean | null
        seller_phone: string | null
        seller_email: string | null
      }
      const { data: existing } = (await supabase
        .from('buyer_interest')
        .select('id, status, contact_unlocked, seller_phone, seller_email')
        .eq('listing_id', id)
        .eq('buyer_id', viewer.id)
        .in('status', ['PENDING', 'ACCEPTED', 'DECLINED'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()) as { data: InterestRow | null; error: unknown }

      if (existing) {
        interestId = existing.id
        hasExistingRequest = existing.status === 'PENDING'
        interestStatus =
          existing.status === 'PENDING'
            ? 'PENDING'
            : existing.status === 'ACCEPTED'
              ? 'ACCEPTED'
              : existing.status === 'DECLINED'
                ? 'DECLINED'
                : null
        contactUnlocked = existing.contact_unlocked === true
        sellerPhone = contactUnlocked ? (existing.seller_phone ?? null) : null
        sellerEmail = contactUnlocked ? (existing.seller_email ?? null) : null
      }
    } catch {
      // buyer_interest table may not exist yet (migration not run) — default to false
      hasExistingRequest = false
    }
  }

  const bhkRoomCount: Record<string, number> = {
    ONE_BHK: 1,
    TWO_BHK: 2,
    THREE_BHK: 3,
    FOUR_BHK: 4,
    FIVE_PLUS_BHK: 5,
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: listing.title,
    description: (listing.description ?? '').slice(0, 500),
    url: `https://sellitright.in/listing/${listing.id}`,
    datePosted: listing.createdAt,
    price: listing.price,
    priceCurrency: 'INR',
    numberOfRooms: bhkRoomCount[listing.bhkType] ?? null,
    floorSize: {
      '@type': 'QuantitativeValue',
      value: listing.builtUpArea,
      unitCode: 'FTK',
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: listing.address,
      addressLocality: listing.locality,
      addressRegion: listing.city,
      postalCode: listing.pincode,
      addressCountry: 'IN',
    },
    image: listing.images[0]?.url ? [listing.images[0].url] : [],
  }

  const priceStr = formatPrice(listing.price)
  const bhk = formatBHK(listing.bhkType)
  const areaStr = formatArea(listing.builtUpArea)
  const floorStr = formatFloor(listing.floor, listing.totalFloors)

  // Quick stats line for contact card subtitle
  const statsLine = [bhk, areaStr, listing.floor !== null ? `Floor ${floorStr}` : null]
    .filter(Boolean)
    .join(' · ')

  // Property type + location headline (Airbnb: "Entire villa in Aundholi, India")
  const propertyTypeLabel: Record<string, string> = {
    APARTMENT: 'Apartment',
    VILLA: 'Villa',
    PLOT: 'Plot',
    INDEPENDENT_HOUSE: 'Independent house',
    PENTHOUSE: 'Penthouse',
  }
  const typeLabel = propertyTypeLabel[listing.propertyType] ?? 'Property'

  // Quick stats (bedrooms · baths · balconies)
  const quickStats = [
    `${listing.bhkType === 'ONE_BHK' ? '1' : listing.bhkType === 'TWO_BHK' ? '2' : listing.bhkType === 'THREE_BHK' ? '3' : listing.bhkType === 'FOUR_BHK' ? '4' : '5+'} bedrooms`,
    `${listing.bathrooms} ${listing.bathrooms === 1 ? 'bathroom' : 'bathrooms'}`,
    listing.balconies
      ? `${listing.balconies} ${listing.balconies === 1 ? 'balcony' : 'balconies'}`
      : null,
    `${areaStr} built-up`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <div className="pb-32 sm:pb-10">
        {listingStatus && listingStatus !== 'ACTIVE' && (
          <div className="border-b border-amber-200 bg-amber-50">
            <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
              <p className="text-sm font-medium text-amber-800">
                {listingStatus === 'SOLD'
                  ? 'This property has been sold and is no longer available.'
                  : 'This listing is currently unavailable.'}
                {isOwner && ' You can manage it from your Dashboard.'}
              </p>
            </div>
          </div>
        )}
        {/* ────────────────────────────────────────────────────────────────── */}
        {/* SECTION 1: Title + Share/Save — ABOVE the gallery                 */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          {/* Back to browse breadcrumb */}
          <div className="mb-3 flex items-center justify-between gap-4">
            <Link
              href="/properties"
              className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to listings
            </Link>
            {isOwner && (
              <Link
                href={`/dashboard/listings/${listing.id}/edit`}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Edit listing
              </Link>
            )}
          </div>

          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold leading-snug text-[var(--color-foreground)] sm:text-2xl">
              {listing.title}
            </h1>

            {/* Share + Save — client component (Web Share API + clipboard fallback) */}
            <div className="flex shrink-0 items-center gap-1">
              <ShareSaveButtons
                title={listing.title}
                url={`${process.env.NEXT_PUBLIC_APP_URL}/listing/${listing.id}`}
              />
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* SECTION 2: Photo gallery mosaic                                   */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <div className="mx-auto mt-4 max-w-7xl sm:px-6 lg:px-8">
          <ListingGallery images={listing.images} title={listing.title} />
        </div>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* SECTION 3: Two-column content grid                                */}
        {/* Left: all content sections · Right: sticky contact card           */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:grid lg:grid-cols-[1fr_370px] lg:gap-12 lg:px-8">
          {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
          <div>
            {/* Property type + location */}
            <div className="pb-6">
              <p className="text-xl font-semibold text-[var(--color-foreground)]">
                {typeLabel} in {listing.locality}, {listing.city}
              </p>

              {/* Quick stats row */}
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{quickStats}</p>

              {/* Verified + view count badges */}
              {(listing.isVerified || listing.viewCount > 0) && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {listing.isVerified && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Verified listing
                    </span>
                  )}
                  {listing.viewCount > 0 && (
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {listing.viewCount} views
                    </span>
                  )}
                </div>
              )}
            </div>

            <hr className="border-t border-[var(--color-border)]" />

            {/* Host / seller info row */}
            <div className="flex items-center justify-between py-6">
              <div>
                <p className="text-base font-semibold text-[var(--color-foreground)]">
                  Listed by {listing.seller.name}
                </p>
                <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                  {listing.seller.isVerified ? 'Verified owner' : 'Property owner'} · Direct contact
                </p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)]">
                <User className="h-6 w-6 text-[var(--color-muted-foreground)]" aria-hidden="true" />
              </div>
            </div>

            <hr className="border-t border-[var(--color-border)]" />

            {/* Property highlights — Airbnb-style icon + title + subtitle */}
            <div className="py-8">
              <PropertyHighlights listing={listing} />
            </div>

            <hr className="border-t border-[var(--color-border)]" />

            {/* Description */}
            <section aria-labelledby="description-heading" className="py-8">
              <h2
                id="description-heading"
                className="mb-4 text-lg font-semibold text-[var(--color-foreground)]"
              >
                About this property
              </h2>
              <ExpandableDescription text={listing.description} />
            </section>

            <hr className="border-t border-[var(--color-border)]" />

            {/* Amenities — 2-column grid with "Show all" button */}
            {listing.amenities.length > 0 && (
              <>
                <section aria-labelledby="amenities-heading" className="py-8">
                  <h2
                    id="amenities-heading"
                    className="mb-6 text-lg font-semibold text-[var(--color-foreground)]"
                  >
                    What this property offers
                  </h2>

                  <ShowAllAmenities amenities={listing.amenities} />
                </section>

                <hr className="border-t border-[var(--color-border)]" />
              </>
            )}

            {/* Location section */}
            <section aria-labelledby="location-heading" className="py-8">
              <h2
                id="location-heading"
                className="mb-3 text-lg font-semibold text-[var(--color-foreground)]"
              >
                Location
              </h2>

              <address className="mb-4 flex items-start gap-1.5 text-sm not-italic text-[var(--color-muted-foreground)]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {listing.address}, {listing.locality}, {listing.city} — {listing.pincode}
              </address>
            </section>

            {/* Contact card — mobile inline (below location) */}
            <div className="py-8 lg:hidden">
              <hr className="mb-8 border-t border-[var(--color-border)]" />
              <ContactSeller
                seller={listing.seller}
                listingId={listing.id}
                listingTitle={listing.title}
                isAuthenticated={isAuthenticated}
                hasExistingRequest={hasExistingRequest}
                isOwner={isOwner}
                interestId={interestId}
                interestStatus={interestStatus}
                contactUnlocked={contactUnlocked}
                sellerPhone={sellerPhone}
                sellerEmail={sellerEmail}
                price={priceStr}
                statsLine={statsLine}
                listingStatus={listingStatus}
              />
            </div>
          </div>
          {/* ── END LEFT COLUMN ─────────────────────────────────────── */}

          {/* ── RIGHT COLUMN — sticky contact card (desktop only) ───── */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <ContactSeller
                seller={listing.seller}
                listingId={listing.id}
                listingTitle={listing.title}
                isAuthenticated={isAuthenticated}
                hasExistingRequest={hasExistingRequest}
                isOwner={isOwner}
                interestId={interestId}
                interestStatus={interestStatus}
                contactUnlocked={contactUnlocked}
                sellerPhone={sellerPhone}
                sellerEmail={sellerEmail}
                price={priceStr}
                statsLine={statsLine}
                listingStatus={listingStatus}
              />
            </div>
          </aside>
          {/* ── END RIGHT COLUMN ────────────────────────────────────── */}
        </div>
      </div>

      {/* Fixed bottom bar — mobile only */}
      <MobileBottomBar
        price={priceStr}
        listingTitle={listing.title}
        listingId={listing.id}
        isAuthenticated={isAuthenticated}
        hasExistingRequest={hasExistingRequest}
        isOwner={isOwner}
        interestId={interestId}
        interestStatus={interestStatus}
        contactUnlocked={contactUnlocked}
        sellerPhone={sellerPhone}
        listingStatus={listingStatus}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  )
}
