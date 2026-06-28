import Link from 'next/link'
import { MOCK_LISTINGS } from '@/lib/mock-data'
import { ListingCard } from '@/components/listing/listing-card'

// ─── Data ─────────────────────────────────────────────────────────────────────

const TRUST_METRICS = [
  { value: '2,400+', label: 'Verified Owners' },
  { value: '8,500+', label: 'Properties Listed' },
  { value: '1,200+', label: 'Successful Connections' },
  { value: '< 24 hrs', label: 'Average Response' },
]

const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: 'Owner Lists Property',
    description: 'Create a verified listing with photos and details',
  },
  {
    step: 2,
    title: 'Buyer Sends Request',
    description: 'Interested buyer sends a connection request',
  },
  { step: 3, title: 'Owner Accepts', description: 'Owner reviews and accepts the request' },
  {
    step: 4,
    title: 'Buyer Unlocks Contact',
    description: 'Buyer pays a small fee to unlock contact details',
  },
  { step: 5, title: 'Both Connect', description: 'Direct conversation — no middlemen' },
]

const COMPARISON_ROWS = [
  { feature: 'Broker fees', ours: 'None', theirs: '1–2% commission' },
  { feature: 'Contact spam', ours: 'Zero', theirs: 'Constant calls' },
  { feature: 'Owner verification', ours: 'Every listing', theirs: 'Varies' },
  { feature: 'Buyer consent', ours: 'Required', theirs: 'Not required' },
  { feature: 'Connection fee', ours: '₹49 flat', theirs: 'Negotiated per deal' },
  { feature: 'Listing fee', ours: 'Free', theirs: 'Paid plans only' },
]

// ─── Featured listings ─────────────────────────────────────────────────────────

const featured = MOCK_LISTINGS.filter((l) => l.status === 'ACTIVE').slice(0, 6)

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section aria-labelledby="hero-heading" className="py-20 md:py-32">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h1
            id="hero-heading"
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
          >
            Find Your Next Home.{' '}
            <span className="text-[var(--color-accent)]">Directly From the Owner.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--color-muted-foreground)] sm:text-xl">
            No brokers. No spam. Only verified owners and genuine buyers.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/properties"
              aria-label="Browse all properties"
              className="rounded-full bg-[var(--color-primary)] px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-gray-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 active:scale-[0.97]"
            >
              Browse Properties
            </Link>
            <Link
              href="/sell"
              aria-label="Post your property for free"
              className="rounded-full border border-[var(--color-border)] px-8 py-3.5 text-sm font-semibold text-[var(--color-foreground)] transition-all hover:bg-[var(--color-muted)] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              Post Property Free
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trust Metrics ────────────────────────────────────────────────────── */}
      <section aria-label="Platform statistics" className="bg-[var(--color-muted)] py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <dl className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {TRUST_METRICS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <dt className="text-3xl font-bold text-[var(--color-foreground)]">{value}</dt>
                <dd className="mt-1 text-sm text-[var(--color-muted-foreground)]">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="how-heading" className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2
            id="how-heading"
            className="text-center text-3xl font-bold text-[var(--color-foreground)]"
          >
            How SellItRight Works
          </h2>

          <ol className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-5">
            {HOW_IT_WORKS_STEPS.map(({ step, title, description }, idx) => (
              <li key={step} className="flex flex-col items-center text-center">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-lg font-bold text-white"
                  aria-hidden="true"
                >
                  {step}
                </div>
                {/* Connector line between steps — desktop only */}
                {idx < HOW_IT_WORKS_STEPS.length - 1 && (
                  <div className="hidden sm:block" aria-hidden="true" />
                )}
                <h3 className="mt-4 text-sm font-semibold text-[var(--color-foreground)]">
                  {title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                  {description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Why SellItRight ──────────────────────────────────────────────────── */}
      <section aria-labelledby="why-heading" className="bg-[var(--color-muted)] py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2
            id="why-heading"
            className="text-center text-3xl font-bold text-[var(--color-foreground)]"
          >
            Why SellItRight?
          </h2>

          <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-2xl border border-[var(--color-border)]">
            <table className="w-full">
              <thead>
                <tr className="bg-white">
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-sm font-semibold text-[var(--color-foreground)]"
                  >
                    Feature
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-sm font-semibold text-[var(--color-foreground)]"
                  >
                    SellItRight
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-sm font-semibold text-[var(--color-foreground)]"
                  >
                    Traditional Portals
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map(({ feature, ours, theirs }, idx) => (
                  <tr
                    key={feature}
                    className={idx % 2 === 0 ? 'bg-[var(--color-muted)]' : 'bg-white'}
                  >
                    <td className="px-6 py-3 text-sm font-medium text-[var(--color-foreground)]">
                      {feature}
                    </td>
                    <td className="px-6 py-3 text-sm font-semibold text-green-600">✓ {ours}</td>
                    <td className="px-6 py-3 text-sm text-[var(--color-muted-foreground)]">
                      {theirs}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Featured Properties ───────────────────────────────────────────────── */}
      <section aria-labelledby="featured-heading" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2
            id="featured-heading"
            className="text-center text-3xl font-bold text-[var(--color-foreground)]"
          >
            Featured Properties
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((listing) => (
              <ListingCard
                key={listing.id}
                id={listing.id}
                title={listing.title}
                price={listing.price}
                images={listing.images}
                locality={listing.locality}
                city={listing.city}
                bhkType={listing.bhkType}
                builtUpArea={listing.builtUpArea}
                furnishing={listing.furnishing}
                floor={listing.floor}
                totalFloors={listing.totalFloors}
                isVerified={listing.isVerified}
                createdAt={listing.createdAt}
                viewCount={listing.viewCount}
                ageOfProperty={listing.ageOfProperty}
              />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/properties"
              aria-label="View all property listings"
              className="rounded-full border border-[var(--color-border)] px-8 py-3.5 text-sm font-semibold text-[var(--color-foreground)] transition-all hover:bg-[var(--color-muted)] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              View All Properties
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────────── */}
      <section aria-labelledby="cta-heading" className="bg-[var(--color-primary)] py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 id="cta-heading" className="text-3xl font-bold text-white">
            Ready to find your next home?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Join thousands of verified owners and genuine buyers on SellItRight.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/properties"
              aria-label="Browse all properties"
              className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[var(--color-foreground)] shadow-sm transition-all hover:bg-gray-100 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-primary)] active:scale-[0.97]"
            >
              Browse Properties
            </Link>
            <Link
              href="/sell"
              aria-label="Post your property for free"
              className="rounded-full border border-white px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Post Property Free
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
