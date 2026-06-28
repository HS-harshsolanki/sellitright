import { ArrowRight, ShieldCheck, Eye, Lock, BadgeCheck, PhoneOff, IndianRupee } from 'lucide-react'
import Link from 'next/link'

import { ListingCard } from '@/components/listing/listing-card'
import { MOCK_LISTINGS } from '@/lib/mock-data'

// ─── Data ─────────────────────────────────────────────────────────────────────

const PAIN_POINTS = [
  {
    icon: PhoneOff,
    title: 'Broker spam',
    description: 'You enquire once. Your number gets sold to 12 brokers before evening.',
  },
  {
    icon: Eye,
    title: 'Fake listings',
    description: 'Photos from two years ago. Owner moved. Property already sold. You still called.',
  },
  {
    icon: IndianRupee,
    title: 'Hidden commissions',
    description: '1–2% of the sale price. Lakhs of rupees. For what, exactly?',
  },
  {
    icon: Lock,
    title: 'No privacy',
    description: "Your contact details are shared without consent. You didn't agree to this.",
  },
]

const HANDSHAKE_STEPS = [
  {
    step: 1,
    actor: 'Owner',
    label: 'Lists property',
    sub: 'Verified, with real photos and details',
  },
  { step: 2, actor: 'Buyer', label: 'Sends a request', sub: 'Expresses genuine interest' },
  { step: 3, actor: 'Owner', label: 'Reviews & approves', sub: 'Full control — no cold contacts' },
  { step: 4, actor: 'Buyer', label: 'Unlocks contact', sub: 'Pays ₹49 flat to connect' },
  { step: 5, actor: 'Both', label: 'Conversation begins', sub: 'Direct. No middlemen.' },
]

const TRUST_PILLARS = [
  {
    icon: BadgeCheck,
    title: 'Manual listing review',
    description: 'Every listing is reviewed by our team before it goes live. No auto-approvals.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified owners',
    description: 'Owners verify their identity before listing. You know who you are talking to.',
  },
  {
    icon: Lock,
    title: 'Mutual consent',
    description:
      'Owners approve every buyer request. Your contact is never shared without your explicit knowledge.',
  },
  {
    icon: IndianRupee,
    title: 'Flat ₹49 connection fee',
    description:
      'No percentage commissions. A flat fee keeps buyers genuine and removes broker incentives entirely.',
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

const featured = MOCK_LISTINGS.filter((l) => l.status === 'ACTIVE').slice(0, 6)

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section aria-labelledby="hero-heading" className="relative overflow-hidden py-24 md:py-36">
        {/* Subtle radial glow — purely decorative */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(198,46,73,0.06) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />

        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          {/* Trust signal above headline */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            Every listing is manually verified
          </div>

          <h1
            id="hero-heading"
            className="mt-6 text-4xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-5xl md:text-6xl"
          >
            Buy or sell property.{' '}
            <span style={{ color: 'var(--color-accent)' }}>Without brokers.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--color-muted-foreground)]">
            SellItRight connects verified owners directly with genuine buyers — no spam, no
            commissions, no middlemen.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
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

          <p className="mt-5 text-xs text-[var(--color-muted-foreground)]">
            Free to list &nbsp;·&nbsp; No broker fees &nbsp;·&nbsp; ₹49 to connect
          </p>
        </div>
      </section>

      {/* ── Trust Metrics ────────────────────────────────────────────────────── */}
      <section
        aria-label="Platform statistics"
        className="border-y border-[var(--color-border)] bg-[var(--color-muted)] py-12"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <dl className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {TRUST_METRICS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <dt className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
                  {value}
                </dt>
                <dd className="mt-1 text-sm text-[var(--color-muted-foreground)]">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Problem ──────────────────────────────────────────────────────────── */}
      <section aria-labelledby="problem-heading" className="py-24 md:py-32">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2
              id="problem-heading"
              className="text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl"
            >
              Property portals were built for brokers, not for you.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--color-muted-foreground)]">
              You wanted to find a home. Instead you got a call centre.
            </p>
          </div>

          {/* Editorial list — visual contrast to the card-grid Trust section below */}
          <div className="mt-14 divide-y divide-[var(--color-border)]">
            {PAIN_POINTS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-5 py-6 sm:gap-8">
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
          </div>

          {/* Pivot — accent border gives it weight without shouting */}
          <div className="mt-16 border-l-2 border-[var(--color-accent)] pl-6">
            <p className="text-2xl font-semibold leading-snug text-[var(--color-foreground)] sm:text-3xl">
              There had to be a better way.
            </p>
          </div>
        </div>
      </section>

      {/* ── Solution — The Handshake Model ───────────────────────────────────── */}
      <section aria-labelledby="solution-heading" className="bg-[var(--color-primary)] py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-white/50">
              How it works
            </p>
            <h2
              id="solution-heading"
              className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              The Handshake Model
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/70">
              Every connection on SellItRight requires consent from both sides. No unsolicited
              contact. Ever.
            </p>
          </div>

          {/* Steps — vertical on mobile, horizontal on desktop */}
          <ol className="mt-16 flex flex-col gap-0 sm:flex-row">
            {HANDSHAKE_STEPS.map(({ step, actor, label, sub }, idx) => (
              <li key={step} className="flex flex-1 flex-col items-center text-center">
                {/* Connector line — desktop */}
                <div className="relative flex w-full items-center justify-center">
                  {idx > 0 && (
                    <div
                      className="absolute right-1/2 hidden h-px w-full bg-white/20 sm:block"
                      aria-hidden="true"
                    />
                  )}
                  {idx < HANDSHAKE_STEPS.length - 1 && (
                    <div
                      className="absolute left-1/2 hidden h-px w-full bg-white/20 sm:block"
                      aria-hidden="true"
                    />
                  )}
                  {/* Mobile vertical line above (except first) */}
                  {idx > 0 && (
                    <div
                      className="absolute bottom-full mb-0 h-6 w-px bg-white/20 sm:hidden"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 text-base font-bold text-white backdrop-blur-sm">
                    {step}
                  </div>
                </div>

                {/* Actor tag */}
                <span className="mt-4 rounded-full bg-white/10 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/60">
                  {actor}
                </span>
                <h3 className="mt-2 text-sm font-semibold text-white">{label}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/55">{sub}</p>
              </li>
            ))}
          </ol>

          <div className="mt-14 text-center">
            <Link
              href="/properties"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[var(--color-foreground)] shadow-sm transition-all hover:bg-gray-100 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-primary)] active:scale-[0.97]"
            >
              See how it works
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trust Center ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="trust-heading" className="py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              id="trust-heading"
              className="text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl"
            >
              Built on trust, not just listings
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--color-muted-foreground)]">
              Every structural decision we made was driven by one question: why should you trust us?
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {TRUST_PILLARS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-[var(--color-border)] bg-white p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-muted)]">
                  <Icon className="h-5 w-5 text-[var(--color-foreground)]" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-[var(--color-foreground)]">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Properties ───────────────────────────────────────────────── */}
      <section
        aria-labelledby="featured-heading"
        className="bg-[var(--color-muted)] py-20 md:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="featured-heading"
                className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]"
              >
                Recently verified homes
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Every property below passed manual review before listing.
              </p>
            </div>
            <Link
              href="/properties"
              className="shrink-0 text-sm font-semibold text-[var(--color-foreground)] underline-offset-4 hover:underline"
            >
              View all properties
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((listing, idx) => (
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
                priorityImage={idx === 0}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="testimonials-heading" className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* Dominant pull-quote — not a symmetric grid */}
          <figure className="rounded-2xl bg-[var(--color-muted)] p-8 sm:p-12">
            <span
              className="block font-serif text-5xl leading-none text-[var(--color-border)]"
              aria-hidden="true"
            >
              &ldquo;
            </span>
            <blockquote
              id="testimonials-heading"
              className="mt-2 text-xl font-medium leading-relaxed text-[var(--color-foreground)] sm:text-2xl"
            >
              {TESTIMONIALS[0].quote}
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--color-border)]" aria-hidden="true" />
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                {TESTIMONIALS[0].name}
              </p>
              <span className="text-[var(--color-border)]" aria-hidden="true">
                ·
              </span>
              <p className="text-sm text-[var(--color-muted-foreground)]">{TESTIMONIALS[0].role}</p>
            </figcaption>
          </figure>

          {/* Supporting quotes — smaller, clearly secondary */}
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {TESTIMONIALS.slice(1).map(({ quote, name, role }) => (
              <figure
                key={name}
                className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-white p-6"
              >
                <blockquote className="flex-1 text-sm leading-relaxed text-[var(--color-foreground)]">
                  &ldquo;{quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-muted-foreground)]">
                  <span className="font-semibold text-[var(--color-foreground)]">{name}</span>
                  {' · '}
                  {role}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section aria-labelledby="cta-heading" className="bg-[var(--color-primary)] py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 id="cta-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to buy or sell
            <br className="hidden sm:block" /> without brokers?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/70">
            Join thousands of verified owners and genuine buyers. No commissions. No spam. No
            middlemen.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/properties"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[var(--color-foreground)] shadow-sm transition-all hover:bg-gray-100 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-primary)] active:scale-[0.97]"
            >
              Browse Homes
            </Link>
            <Link
              href="/sell"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:border-white/70 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Post Property Free
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
