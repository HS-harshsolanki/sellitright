import { MapPin, BadgeCheck, User, ArrowLeft, Pencil } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

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

interface ListingPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { id } = await params

  const supabase = await createClient()
  const { data: listing } = await supabase
    .from('listings')
    .select('title, price, property_type, bhk_type, city, locality, description, image_urls')
    .eq('id', id)
    .single()

  if (!listing) return { title: 'Listing not found' }

  const priceStr = formatPrice(listing.price)
  const bhk = formatBHK(listing.bhk_type ?? '')
  const description = (listing.description ?? '').slice(0, 155)

  return {
    title: `${bhk} in ${listing.locality}, ${listing.city} — ${priceStr} | SellItRight`,
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

  try {
    const {
      data: { user: viewer },
    } = await supabase.auth.getUser()

    // Fetch by id — RLS allows public read of ACTIVE listings.
    // If the viewer is the seller, also allow PENDING_REVIEW/DRAFT/INACTIVE preview.
    const { data, error } = await supabase.from('listings').select('*').eq('id', id).single()

    if (!error && data) {
      isOwner = viewer?.id === data.seller_id
      const isVisible = data.status === 'ACTIVE' || isOwner
      if (isVisible) {
        listingRaw = mapSupabaseListingToMock(data)
      }
    }
  } catch {
    // Supabase not configured or network error — fall through to mock
  }

  // ── 2. 404 if Supabase returned nothing ──────────────────────────────────
  if (!listingRaw) notFound()

  // notFound() throws (`never`), so listingRaw is defined beyond this point.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const listing = listingRaw!

  // user was already fetched above in the Supabase try block; re-use the session
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  // Check buyer's interest state for this listing (server-side, avoids flash)
  let hasExistingRequest = false
  let interestStatus: 'PENDING' | 'ACCEPTED' | null = null
  let contactUnlocked = false
  let sellerPhone: string | null = null
  let sellerEmail: string | null = null
  let interestId: string | null = null

  if (user) {
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
        .eq('buyer_id', user.id)
        .in('status', ['PENDING', 'ACCEPTED'])
        .maybeSingle()) as { data: InterestRow | null; error: unknown }

      if (existing) {
        interestId = existing.id
        hasExistingRequest = existing.status === 'PENDING'
        interestStatus =
          existing.status === 'PENDING'
            ? 'PENDING'
            : existing.status === 'ACCEPTED'
              ? 'ACCEPTED'
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
        {/* ────────────────────────────────────────────────────────────────── */}
        {/* SECTION 1: Title + Share/Save — ABOVE the gallery                 */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          {/* Back to browse breadcrumb */}
          <div className="mb-3 flex items-center justify-between gap-4">
            <Link
              href="/"
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
      />
    </>
  )
}
