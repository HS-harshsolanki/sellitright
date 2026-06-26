import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { MapPin, Share2, Heart, BadgeCheck, User } from 'lucide-react'
import { getListingById } from '@/lib/mock-data'
import { mapSupabaseListingToMock } from '@/lib/listing-mapper'
import { formatPrice, formatBHK, formatArea, formatFloor } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { ListingGallery } from '@/components/listing/listing-gallery'
import { PropertyHighlights } from '@/components/listing/property-highlights'
import { ContactSeller } from '@/components/listing/contact-seller'
import { MobileBottomBar } from '@/components/listing/mobile-bottom-bar'
import { ExpandableDescription } from '@/components/listing/expandable-description'
import { ShowAllAmenities } from '@/components/listing/show-all-amenities'

interface ListingPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { id } = await params
  const listing = getListingById(id)
  if (!listing) return { title: 'Listing not found' }

  const priceStr = formatPrice(listing.price)
  const bhk = formatBHK(listing.bhkType)

  return {
    title: `${bhk} in ${listing.locality}, ${listing.city} — ${priceStr} | SellItRight`,
    description: listing.description.slice(0, 155),
    openGraph: {
      title: listing.title,
      description: listing.description.slice(0, 155),
      images: listing.images[0] ? [{ url: listing.images[0].url }] : [],
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
  let listingRaw: ReturnType<typeof getListingById> = undefined

  try {
    const {
      data: { user: viewer },
    } = await supabase.auth.getUser()

    // Fetch by id — RLS allows public read of ACTIVE listings.
    // If the viewer is the seller, also allow PENDING_REVIEW/DRAFT/INACTIVE preview.
    const { data, error } = await supabase.from('listings').select('*').eq('id', id).single()

    if (!error && data) {
      const isOwner = viewer?.id === data.seller_id
      const isVisible = data.status === 'ACTIVE' || isOwner
      if (isVisible) {
        listingRaw = mapSupabaseListingToMock(data)
      }
    }
  } catch {
    // Supabase not configured or network error — fall through to mock
  }

  // ── 2. Fall back to mock data if Supabase returned nothing ──────────────
  if (!listingRaw) {
    listingRaw = getListingById(id)
  }

  // ── 3. 404 if neither source has the listing ────────────────────────────
  if (!listingRaw) notFound()

  // notFound() throws (`never`), so listingRaw is defined beyond this point.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const listing = listingRaw!

  // user was already fetched above in the Supabase try block; re-use the session
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  // Check if buyer already has a pending request for this listing (server-side, avoids flash)
  let hasExistingRequest = false
  if (user) {
    try {
      const { data: existing } = await supabase
        .from('buyer_interest')
        .select('id')
        .eq('listing_id', id)
        .eq('buyer_id', user.id)
        .eq('status', 'PENDING')
        .maybeSingle()
      hasExistingRequest = !!existing
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
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold leading-snug text-[var(--color-foreground)] sm:text-2xl">
              {listing.title}
            </h1>

            {/* Share + Save — text links with icons, right-aligned */}
            <div className="flex shrink-0 items-center gap-1">
              <button
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-foreground)] underline underline-offset-2 transition hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                aria-label="Share this listing"
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-foreground)] underline underline-offset-2 transition hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                aria-label="Save to favourites"
              >
                <Heart className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Save</span>
              </button>
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

              {/* Map placeholder */}
              <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-muted)] text-sm text-[var(--color-muted-foreground)]">
                Map coming soon
              </div>
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
      />
    </>
  )
}
