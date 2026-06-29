import { ArrowRight, ShieldCheck, Lock, BadgeCheck, CheckCircle2, Star } from 'lucide-react'
import Link from 'next/link'

import { Reveal, Stagger, FadeIn } from '@/components/landing/reveal'
import { ListingCard } from '@/components/listing/listing-card'
import { mapSupabaseListingToMock } from '@/lib/listing-mapper'
import { MOCK_LISTINGS, type MockListing } from '@/lib/mock-data'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { createClient } from '@/lib/supabase/server'

// ─── Data ─────────────────────────────────────────────────────────────────────

const PAIN_POINTS = [
  {
    num: '01',
    title: 'You enquire once.',
    description: 'Your number gets sold to twelve brokers before evening.',
  },
  {
    num: '02',
    title: 'The listing looks perfect.',
    description: 'Photos from two years ago. Owner moved. Property already sold. You still called.',
  },
  {
    num: '03',
    title: '1–2% of the sale price.',
    description: 'Lakhs of rupees. For connecting a call you could have made yourself.',
  },
  {
    num: '04',
    title: 'Nobody asked you.',
    description: "Your contact details were shared without consent. You didn't agree to this.",
  },
]

const HANDSHAKE_STEPS = [
  {
    step: '01',
    actor: 'Owner',
    label: 'Lists their property',
    description:
      'Real photos. Verified identity. Contact details stay private until they choose to share them.',
  },
  {
    step: '02',
    actor: 'Buyer',
    label: 'Sends a request',
    description:
      'The owner sees exactly who is asking — name, intent, no anonymity — before agreeing to anything.',
  },
  {
    step: '03',
    actor: 'Owner',
    label: 'Approves or declines',
    description: 'Full control. The owner decides who gets access. No cold contacts. No surprises.',
  },
  {
    step: '04',
    actor: 'Buyer',
    label: 'Pays a small platform fee',
    description:
      'Only after both sides have agreed. No upfront cost. No commission. No subscriptions.',
  },
  {
    step: '05',
    actor: 'Both',
    label: 'Talk directly',
    description:
      'A real conversation between a verified owner and a genuine buyer. No broker in the middle.',
  },
]

const TRUST_PILLARS = [
  {
    icon: BadgeCheck,
    title: 'Every listing is reviewed before it goes live.',
    description:
      'We check every submission manually. If something looks wrong, it does not appear. No exceptions.',
  },
  {
    icon: ShieldCheck,
    title: 'You know exactly who you are talking to.',
    description:
      "Owners verify their phone number before listing. You're not messaging an anonymous post.",
  },
  {
    icon: Lock,
    title: 'Your details stay private until you choose to share them.',
    description:
      'Contact information is hidden on both sides until an owner explicitly approves a request.',
  },
  {
    icon: CheckCircle2,
    title: 'You only pay after both sides agree to connect.',
    description:
      'No upfront fees. No commissions. A small platform fee applies only when a conversation is mutually unlocked.',
  },
]

const TESTIMONIALS = [
  {
    quote:
      'Every other portal sold my number to agents. Here I chose who gets to contact me. That alone is worth it.',
    name: 'Rahul S.',
    role: 'Buyer, Pune',
  },
  {
    quote:
      'I listed my 2BHK and had three genuine buyer requests within a week. No broker calls. No spam. Just real people.',
    name: 'Priya M.',
    role: 'Owner, Bengaluru',
  },
  {
    quote:
      "The listing review gave me confidence that what I was browsing was real. That's rare in this market.",
    name: 'Ananya K.',
    role: 'Buyer, Mumbai',
  },
]

const TRUST_METRICS = [
  { value: '2,400+', label: 'Verified Owners' },
  { value: '8,500+', label: 'Properties Listed' },
  { value: '1,200+', label: 'Successful Connections' },
  { value: '< 24 hrs', label: 'Average Response' },
]

const CITIES = [
  'Mumbai',
  'Bengaluru',
  'Pune',
  'Hyderabad',
  'Delhi NCR',
  'Chennai',
  'Ahmedabad',
  'Kolkata',
  'Jaipur',
  'Surat',
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  let featured: MockListing[] = []
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient()
      const { data } = await supabase
        .from('listings')
        .select(
          'id, title, price, city, locality, bhk_type, built_up_area, carpet_area, total_floors, floor, furnishing, property_type, age_of_property, bathrooms, balconies, parking, facing, address, state, pincode, amenities, image_urls, status, is_verified, view_count, created_at, seller_id',
        )
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(6)
      featured = (data ?? []).map(mapSupabaseListingToMock)
    } catch {
      featured = MOCK_LISTINGS.filter((l) => l.status === 'ACTIVE').slice(0, 6)
    }
  } else {
    featured = MOCK_LISTINGS.filter((l) => l.status === 'ACTIVE').slice(0, 6)
  }

  return (
    <main className="overflow-x-hidden">
      {/* ══════════════════════════════════════════════════════════════════════
          Chapter 1 — First Impression
          Clean white. No blobs. Typography does all the work.
          Left-anchored. Large. Breathing.
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="hero-heading"
        className="px-4 pb-24 pt-20 sm:px-6 md:pb-36 md:pt-32"
      >
        <div className="mx-auto max-w-4xl">
          {/* Trust signal — above the fold, earns its place before the headline */}
          <Reveal>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              Every listing reviewed before it goes live
            </div>
          </Reveal>

          {/* Headline */}
          <Reveal delay={0.05}>
            <h1
              id="hero-heading"
              className="max-w-3xl text-[2.75rem] font-bold leading-[1.08] tracking-tight text-[var(--color-foreground)] sm:text-6xl md:text-7xl"
            >
              Buy or sell property.{' '}
              <em className="not-italic" style={{ color: 'var(--color-accent)' }}>
                You stay in control.
              </em>
            </h1>
          </Reveal>

          {/* Subline — one continuous thought, not a bullet list */}
          <Reveal delay={0.12}>
            <p className="mt-8 max-w-lg text-lg leading-relaxed text-[var(--color-muted-foreground)]">
              Most property portals hand your number to whoever pays them. We don&apos;t. You choose
              who contacts you, and when — before any conversation begins.
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/properties"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-gray-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 active:scale-[0.97]"
              >
                Browse Homes
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/sell"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-8 py-3.5 text-sm font-semibold text-[var(--color-foreground)] transition-all hover:bg-[var(--color-muted)] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                Post Property Free
              </Link>
            </div>
            <p className="mt-4 text-xs text-[var(--color-muted-foreground)]">
              Free to list &nbsp;·&nbsp; No broker fees &nbsp;·&nbsp; No unsolicited contact
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Chapter 2 — The Problem
          Numbered list, not icon list. Numbers feel editorial and earned.
          Continues the white background — no break yet.
      ══════════════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="problem-heading" className="px-4 py-20 sm:px-6 md:py-28">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
              The problem
            </p>
            <h2
              id="problem-heading"
              className="max-w-xl text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl"
            >
              Property portals were built for brokers, not for you.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--color-muted-foreground)]">
              You wanted to find a home. Instead you got a call centre.
            </p>
          </Reveal>

          <Stagger className="mt-12 divide-y divide-[var(--color-border)]" stagger={0.07} y={16}>
            {PAIN_POINTS.map(({ num, title, description }) => (
              <div key={num} className="flex gap-6 py-6 sm:gap-10">
                <span
                  className="mt-0.5 shrink-0 text-sm font-bold tabular-nums text-[var(--color-border)]"
                  aria-hidden="true"
                >
                  {num}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-foreground)]">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Chapter 3 — The Shift
          A single sentence. Maximum whitespace.
          The horizontal rule above anchors it — not floating in space.
      ══════════════════════════════════════════════════════════════════════ */}
      <section aria-label="Transition" className="px-4 py-20 sm:px-6 md:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 h-px bg-[var(--color-border)]" aria-hidden="true" />
          <Reveal y={12}>
            <p
              className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-[var(--color-foreground)] sm:text-5xl"
              style={{ borderLeft: '3px solid var(--color-accent)', paddingLeft: '1.5rem' }}
            >
              There had to be
              <br />a better way.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Trust Metrics — left-anchored, asymmetric.
          Numbers earn credibility because we've shown the problem.
          City strip below adds geographic proof.
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-label="Platform statistics"
        className="border-y border-[var(--color-border)] bg-[var(--color-muted)] py-12"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <FadeIn>
            <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4">
              {TRUST_METRICS.map(({ value, label }) => (
                <div key={label}>
                  <p className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
                    {value}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{label}</p>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* City coverage strip — proof of geographic spread */}
          <FadeIn delay={0.15}>
            <div className="mt-8 border-t border-[var(--color-border)] pt-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-muted-foreground)]">
                Active in
              </p>
              <div className="flex flex-wrap gap-2">
                {CITIES.map((city) => (
                  <span
                    key={city}
                    className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs font-medium text-[var(--color-foreground)]"
                  >
                    {city}
                  </span>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Chapter 4 — The Handshake Model
          The product. The most important section.
          Dark background signals a new chapter.
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="handshake-heading"
        className="bg-[var(--color-primary)] px-4 py-24 sm:px-6 md:py-36"
      >
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <h2
              id="handshake-heading"
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              The Handshake Model
            </h2>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-white/60">
              Every connection requires consent from both sides.
              <br className="hidden sm:block" />
              No unsolicited contact. Ever.
            </p>
          </Reveal>

          <ol className="mt-16 space-y-0" aria-label="How SellItRight works">
            {HANDSHAKE_STEPS.map(({ step, actor, label, description }, idx) => (
              <Reveal key={step} delay={idx * 0.06} y={20}>
                <li className="group grid grid-cols-[3rem_1fr] gap-x-6 border-t border-white/10 py-8 sm:grid-cols-[4rem_1fr] sm:gap-x-10 md:grid-cols-[5rem_auto_1fr] md:gap-x-12">
                  <span
                    className="text-4xl font-bold tabular-nums leading-none text-white/20 sm:text-5xl"
                    aria-hidden="true"
                  >
                    {step}
                  </span>
                  <span className="hidden self-center md:block">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                      {actor}
                    </span>
                  </span>
                  <div className="self-center">
                    <span className="mb-1.5 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/50 md:hidden">
                      {actor}
                    </span>
                    <h3 className="text-base font-semibold text-white sm:text-lg">{label}</h3>
                    <p className="mt-1 max-w-md text-sm leading-relaxed text-white/55">
                      {description}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
            <li aria-hidden="true" className="border-t border-white/10" />
          </ol>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Chapter 5 — Trust (demonstrated)
          Magazine two-column layout. White, breathing.
      ══════════════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="trust-heading" className="px-4 py-20 sm:px-6 md:py-28">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <h2
              id="trust-heading"
              className="max-w-xl text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl"
            >
              Why you can trust what you see here.
            </h2>
            <p className="mt-3 max-w-md text-base leading-relaxed text-[var(--color-muted-foreground)]">
              Not because we say so. Because of how the product is built.
            </p>
          </Reveal>

          <div className="mt-14 space-y-0">
            {TRUST_PILLARS.map(({ icon: Icon, title, description }, idx) => (
              <Reveal key={title} delay={idx * 0.05} y={16}>
                <div className="grid grid-cols-1 gap-4 border-t border-[var(--color-border)] py-7 sm:grid-cols-2 sm:gap-10">
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-muted)]">
                      <Icon className="h-4 w-4 text-[var(--color-foreground)]" aria-hidden="true" />
                    </div>
                    <h3 className="text-sm font-semibold leading-snug text-[var(--color-foreground)] sm:text-base">
                      {title}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)] sm:pt-0.5">
                    {description}
                  </p>
                </div>
              </Reveal>
            ))}
            <div className="border-t border-[var(--color-border)]" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Chapter 6 — Homes
          Muted background. Trust subline at the moment the visitor sees listings.
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="featured-heading"
        className="bg-[var(--color-muted)] px-4 py-20 sm:px-6 md:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2
                  id="featured-heading"
                  className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]"
                >
                  Homes you can trust
                </h2>
                <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
                  Every listing below was reviewed before it became visible.
                </p>
              </div>
              <Link
                href="/properties"
                className="shrink-0 text-sm font-semibold text-[var(--color-foreground)] underline-offset-4 hover:underline"
              >
                Browse all properties
              </Link>
            </div>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((listing, idx) => (
              <Reveal key={listing.id} delay={idx * 0.04} y={20}>
                <ListingCard
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
                  priorityImage={idx === 0}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Chapter 7 — Human Stories
          Pull-quote dominant. Stars on pull quote (social proof shorthand).
          White background after muted listings.
      ══════════════════════════════════════════════════════════════════════ */}
      <section aria-label="Customer testimonials" className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          {/* Primary pull-quote */}
          <Reveal>
            <figure className="rounded-2xl bg-[var(--color-muted)] px-8 py-10 sm:px-12 sm:py-14">
              {/* Star cluster — social proof shorthand */}
              <div className="mb-6 flex gap-0.5" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                    aria-hidden="true"
                  />
                ))}
              </div>
              <blockquote className="text-xl font-medium leading-relaxed text-[var(--color-foreground)] sm:text-2xl">
                &ldquo;{TESTIMONIALS[0]!.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-8 flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--color-border)]" aria-hidden="true" />
                <span className="text-sm font-semibold text-[var(--color-foreground)]">
                  {TESTIMONIALS[0]!.name}
                </span>
                <span className="text-[var(--color-border)]" aria-hidden="true">
                  ·
                </span>
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {TESTIMONIALS[0]!.role}
                </span>
              </figcaption>
            </figure>
          </Reveal>

          {/* Secondary quotes */}
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {TESTIMONIALS.slice(1).map(({ quote, name, role }, idx) => (
              <Reveal key={name} delay={idx * 0.07} y={16}>
                <figure className="flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-white p-6">
                  <div className="mb-4 flex gap-0.5" aria-label="5 out of 5 stars">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <blockquote className="flex-1 text-sm leading-relaxed text-[var(--color-foreground)]">
                    &ldquo;{quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-4 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-muted-foreground)]">
                    <span className="font-semibold text-[var(--color-foreground)]">{name}</span>
                    {' · '}
                    {role}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Chapter 8 — Final Decision
          White. Border-top. Left-anchored. No hard sell.
          Both CTAs carry equal visual weight — buyer and seller are peers.
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="cta-heading"
        className="border-t border-[var(--color-border)] px-4 py-24 sm:px-6 md:py-32"
      >
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <h2
              id="cta-heading"
              className="max-w-2xl text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl md:text-5xl"
            >
              Property the way it should work.
              <br />
              <span style={{ color: 'var(--color-accent)' }}>You in control.</span>
            </h2>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--color-muted-foreground)]">
              Verified owners. Genuine buyers. Direct conversations. No one in the middle profiting
              from your search.
            </p>
          </Reveal>

          <Reveal delay={0.14}>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/properties"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-gray-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 active:scale-[0.97]"
              >
                Browse Homes
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/sell"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-8 py-3.5 text-sm font-semibold text-[var(--color-foreground)] transition-all hover:bg-[var(--color-muted)] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                Post Property Free
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  )
}
