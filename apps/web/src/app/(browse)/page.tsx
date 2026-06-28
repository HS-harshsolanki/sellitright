import { ArrowRight, ShieldCheck, Eye, Lock, BadgeCheck, PhoneOff, IndianRupee } from 'lucide-react'
import Link from 'next/link'

import { Reveal, Stagger } from '@/components/landing/reveal'
import { ListingCard } from '@/components/listing/listing-card'
import { mapSupabaseListingToMock } from '@/lib/listing-mapper'
import { MOCK_LISTINGS, type MockListing } from '@/lib/mock-data'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { createClient } from '@/lib/supabase/server'

// ─── Data ─────────────────────────────────────────────────────────────────────

const PAIN_POINTS = [
  {
    icon: PhoneOff,
    title: 'You enquire once.',
    description: 'Your number gets sold to 12 brokers before evening.',
  },
  {
    icon: Eye,
    title: 'The listing looks perfect.',
    description: 'Photos from two years ago. Owner moved. Property already sold. You still called.',
  },
  {
    icon: IndianRupee,
    title: '1–2% of the sale price.',
    description: 'Lakhs of rupees. For connecting a call you could have made yourself.',
  },
  {
    icon: Lock,
    title: 'Nobody asked you.',
    description: "Your contact details are shared without consent. You didn't agree to this.",
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
    icon: IndianRupee,
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
          Large, breathing, immediate. The belief in the first viewport.
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="hero-heading"
        className="relative px-4 pb-24 pt-20 sm:px-6 md:pb-36 md:pt-32"
      >
        {/* Faint accent halo — pure atmosphere, no meaning */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/3"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(198,46,73,0.07) 0%, transparent 65%)',
          }}
          aria-hidden="true"
        />

        <div className="mx-auto max-w-4xl">
          {/* Trust signal — earns its place before the headline */}
          <Reveal>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              Every listing is reviewed before it goes live
            </div>
          </Reveal>

          {/* Headline — large, left-anchored on desktop, confident */}
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

          {/* Subline — three short promises, each its own statement */}
          <Reveal delay={0.12}>
            <p className="mt-8 max-w-lg text-lg leading-relaxed text-[var(--color-muted-foreground)]">
              You choose who contacts you.
              <br />
              You decide when conversations begin.
              <br />
              You know exactly who you&apos;re talking to.
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
          Left-anchored. Editorial list. Accumulation of grievances.
          No background colour change — continues the white of the hero.
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
            {PAIN_POINTS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-5 py-5 sm:gap-8">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-muted)]">
                  <Icon className="h-4 w-4 text-[var(--color-foreground)]" aria-hidden="true" />
                </div>
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
          Near-empty. One sentence. Maximum whitespace.
          This is the pause before the product is revealed.
          Fitme principle: a section can be almost nothing and still powerful.
      ══════════════════════════════════════════════════════════════════════ */}
      <section aria-label="Transition" className="px-4 py-20 sm:px-6 md:py-32">
        <div className="mx-auto max-w-4xl">
          <Reveal y={16}>
            <div className="border-l-2 border-[var(--color-accent)] pl-6 sm:pl-8">
              <p className="text-3xl font-semibold leading-snug tracking-tight text-[var(--color-foreground)] sm:text-4xl md:text-5xl">
                There had to be
                <br />a better way.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Trust Metrics — punctuation band between problem and product.
          Earns meaning now that the problem has been felt.
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-label="Platform statistics"
        className="border-y border-[var(--color-border)] bg-[var(--color-muted)] py-10"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Stagger className="grid grid-cols-2 gap-6 sm:grid-cols-4" stagger={0.06} y={12}>
            {TRUST_METRICS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
                  {value}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{label}</p>
              </div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Chapter 4 — The Handshake Model
          The product. The most important section. Gets the most space.
          Dark background — signals a new chapter, not just another section.
          Each step is a full row: large number left, content right.
          Fitme principle: alternating rows create rhythm without cards.
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

          {/* Steps as full-width rows — large step number anchors each row */}
          <ol className="mt-16 space-y-0" aria-label="How SellItRight works">
            {HANDSHAKE_STEPS.map(({ step, actor, label, description }, idx) => (
              <Reveal key={step} delay={idx * 0.06} y={20}>
                <li className="group grid grid-cols-[3rem_1fr] gap-x-6 border-t border-white/10 py-8 sm:grid-cols-[4rem_1fr] sm:gap-x-10 md:grid-cols-[5rem_auto_1fr] md:gap-x-12">
                  {/* Step number — large, faded */}
                  <span
                    className="text-4xl font-bold tabular-nums leading-none text-white/20 sm:text-5xl"
                    aria-hidden="true"
                  >
                    {step}
                  </span>

                  {/* Actor tag — desktop only middle column */}
                  <span className="hidden self-center md:block">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                      {actor}
                    </span>
                  </span>

                  {/* Label + description */}
                  <div className="self-center">
                    {/* Actor tag — mobile inline */}
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
            {/* Closing border */}
            <li aria-hidden="true" className="border-t border-white/10" />
          </ol>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Chapter 5 — Trust (demonstrated, not declared)
          Left-anchored heading + right-column description per pillar.
          Magazine two-column layout — contrasts with the step rows above.
          White background — immediate breath after the dark Handshake.
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

          {/* Magazine two-column rows — heading left, detail right */}
          <div className="mt-14 space-y-0">
            {TRUST_PILLARS.map(({ icon: Icon, title, description }, idx) => (
              <Reveal key={title} delay={idx * 0.05} y={16}>
                <div className="grid grid-cols-1 gap-4 border-t border-[var(--color-border)] py-7 sm:grid-cols-2 sm:gap-10">
                  {/* Left — icon + claim sentence */}
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-muted)]">
                      <Icon className="h-4 w-4 text-[var(--color-foreground)]" aria-hidden="true" />
                    </div>
                    <h3 className="text-sm font-semibold leading-snug text-[var(--color-foreground)] sm:text-base">
                      {title}
                    </h3>
                  </div>
                  {/* Right — specifics */}
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
          Muted background for visual separation from the white trust section.
          Subline reinforces trust at the exact moment the visitor sees listings.
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
          Pull-quote layout from v3 — it works.
          Section label removed — the quote speaks for itself.
          White background creates contrast after the muted listings section.
      ══════════════════════════════════════════════════════════════════════ */}
      <section aria-label="Customer testimonials" className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          {/* Primary pull-quote — large, no card border, the muted bg IS the container */}
          <Reveal>
            <figure className="rounded-2xl bg-[var(--color-muted)] px-8 py-10 sm:px-12 sm:py-14">
              <span
                className="block font-serif text-6xl leading-none text-[var(--color-border)]"
                aria-hidden="true"
              >
                &ldquo;
              </span>
              <blockquote className="mt-1 text-xl font-medium leading-relaxed text-[var(--color-foreground)] sm:text-2xl">
                {TESTIMONIALS[0]!.quote}
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
          White background with border-top — not dark, not muted.
          The visitor earned this moment. No hard sell.
          The headline echoes the hero belief but doesn't repeat it.
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
              Verified owners. Genuine buyers. Direct conversations. No middlemen.
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
