import { ArrowRight, ShieldCheck, Eye, Lock, BadgeCheck, PhoneOff, IndianRupee } from 'lucide-react'
import Link from 'next/link'

import { ListingCard } from '@/components/listing/listing-card'
import { MOCK_LISTINGS } from '@/lib/mock-data'

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
    step: 1,
    actor: 'Owner',
    label: 'Lists their property',
    sub: 'Real photos. Verified identity. Nothing hidden.',
  },
  {
    step: 2,
    actor: 'Buyer',
    label: 'Sends a request',
    sub: 'Owners see who is asking before agreeing to anything.',
  },
  {
    step: 3,
    actor: 'Owner',
    label: 'Approves or declines',
    sub: 'You choose who gets access to your contact.',
  },
  {
    step: 4,
    actor: 'Buyer',
    label: 'Pays a small fee',
    sub: 'Only after both sides agree. No surprises.',
  },
  {
    step: 5,
    actor: 'Both',
    label: 'Talk directly',
    sub: 'No broker in the middle. No commission. No noise.',
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
      'Contact information is hidden on both sides until an owner approves a request. Nobody gets your number without your knowledge.',
  },
  {
    icon: IndianRupee,
    title: 'You only pay after both sides agree to connect.',
    description:
      'No upfront fees. No commissions. A small connection fee is charged only when a conversation is mutually unlocked.',
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
      <section aria-labelledby="hero-heading" className="relative overflow-hidden py-28 md:py-44">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 80% 55% at 50% -5%, rgba(198,46,73,0.05) 0%, transparent 68%)',
          }}
          aria-hidden="true"
        />

        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            Every listing is reviewed before it goes live
          </div>

          <h1
            id="hero-heading"
            className="mt-7 text-4xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-5xl md:text-[3.75rem] md:leading-[1.1]"
          >
            Buy or sell property.{' '}
            <span style={{ color: 'var(--color-accent)' }}>You stay in control.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--color-muted-foreground)]">
            You choose who contacts you. You decide when conversations begin. You know exactly who
            you&apos;re talking to.
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
            Free to list &nbsp;·&nbsp; No broker fees &nbsp;·&nbsp; No unsolicited contact
          </p>
        </div>
      </section>

      {/* ── Problem ──────────────────────────────────────────────────────────── */}
      <section aria-labelledby="problem-heading" className="py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="max-w-xl">
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

          <div className="mt-12 divide-y divide-[var(--color-border)]">
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
          </div>

          <div className="mt-14 border-l-2 border-[var(--color-accent)] pl-6">
            <p className="text-2xl font-semibold leading-snug text-[var(--color-foreground)] sm:text-3xl">
              There had to be a better way.
            </p>
          </div>
        </div>
      </section>

      {/* ── Trust Metrics ────────────────────────────────────────────────────── */}
      <section
        aria-label="Platform statistics"
        className="border-y border-[var(--color-border)] bg-[var(--color-muted)] py-10"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
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

      {/* ── Handshake Model ──────────────────────────────────────────────────── */}
      <section
        aria-labelledby="solution-heading"
        className="bg-[var(--color-primary)] py-28 md:py-36"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              id="solution-heading"
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              The Handshake Model
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/70">
              Every connection requires consent from both sides. No unsolicited contact. Ever.
            </p>
          </div>

          <ol className="mt-20 flex flex-col gap-0 sm:flex-row">
            {HANDSHAKE_STEPS.map(({ step, actor, label, sub }, idx) => (
              <li key={step} className="flex flex-1 flex-col items-center text-center">
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
                  {idx > 0 && (
                    <div
                      className="absolute bottom-full h-6 w-px bg-white/20 sm:hidden"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 text-base font-bold text-white backdrop-blur-sm">
                    {step}
                  </div>
                </div>
                <span className="mt-4 rounded-full bg-white/10 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/60">
                  {actor}
                </span>
                <h3 className="mt-2 text-sm font-semibold text-white">{label}</h3>
                <p className="mt-1 px-2 text-xs leading-relaxed text-white/55">{sub}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Trust — demonstrated, not declared ───────────────────────────────── */}
      <section aria-labelledby="trust-heading" className="py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-xl">
            <h2
              id="trust-heading"
              className="text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl"
            >
              Why you can trust what you see here.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--color-muted-foreground)]">
              Not because we say so. Because of how the product is built.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {TRUST_PILLARS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-[var(--color-border)] bg-white p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-muted)]">
                  <Icon className="h-4 w-4 text-[var(--color-foreground)]" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-sm font-semibold leading-snug text-[var(--color-foreground)]">
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
      <section aria-label="Customer testimonials" className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <figure className="rounded-2xl bg-[var(--color-muted)] p-8 sm:p-12">
            <span
              className="block font-serif text-5xl leading-none text-[var(--color-border)]"
              aria-hidden="true"
            >
              &ldquo;
            </span>
            <blockquote className="mt-2 text-xl font-medium leading-relaxed text-[var(--color-foreground)] sm:text-2xl">
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
      <section
        aria-labelledby="cta-heading"
        className="border-t border-[var(--color-border)] py-24 md:py-32"
      >
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2
            id="cta-heading"
            className="text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl"
          >
            Property the way it should work.
            <br />
            <span style={{ color: 'var(--color-accent)' }}>You in control.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[var(--color-muted-foreground)]">
            Verified owners. Genuine buyers. Direct conversations. No middlemen.
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
        </div>
      </section>
    </main>
  )
}
