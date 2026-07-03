import { ArrowRight, BadgeCheck, CheckCircle2, Lock, Search, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

import { FAQItem, FadeIn, Reveal, ScrollChevron, Stagger } from '@/components/landing/reveal'

// ─── Data ─────────────────────────────────────────────────────────────────────

const PAIN_POINTS = [
  {
    num: '01',
    title: 'Listings stay live after properties are sold.',
    description:
      'Ghost listings drive engagement on portals. You call. No one answers. The property was sold months ago.',
  },
  {
    num: '02',
    title: 'You cannot verify the owner is real.',
    description:
      'Anonymous posts. No ID check. The person on the other end could be a broker, a sublet, or no one.',
  },
  {
    num: '03',
    title: '1–2% of the sale price goes to someone who made one call.',
    description:
      'Lakhs in commission. For a connection you could have made yourself, to an owner you could have found directly.',
  },
  {
    num: '04',
    title: 'Your number is sold before you see a single listing.',
    description:
      'You searched. Your number was harvested. Twelve brokers have it by evening. You never agreed to this.',
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
      'Pays a one-time connection fee — only after both sides agree. No commission. No subscription.',
  },
  {
    step: '05',
    actor: 'Both',
    label: 'Talk directly',
    description:
      'A real conversation via WhatsApp — between a verified owner and a serious buyer. No broker in the middle.',
  },
]

const TRUST_PILLARS = [
  {
    icon: BadgeCheck,
    title: 'Owner identity confirmed before listing.',
    description:
      'Government ID matched to the property documents. Anonymous posts are not accepted.',
  },
  {
    icon: ShieldCheck,
    title: 'You know exactly who sent the listing.',
    description:
      'Owners verify their phone number and identity before their first listing goes live.',
  },
  {
    icon: Lock,
    title: 'Your contact details are never shared without your approval.',
    description:
      'Contact information is hidden on both sides until an owner explicitly accepts a request.',
  },
  {
    icon: CheckCircle2,
    title: 'If a listing is wrong, we take it down.',
    description:
      'Report a listing that does not match reality. We investigate within 48 hours and take action before any fee is charged.',
  },
]

const FAQ_ITEMS = [
  {
    question: 'Is ChapterNew a broker?',
    answer:
      'No. We are a platform. We connect owners and buyers directly — no ChapterNew employee is involved in your negotiation, price discussion, or site visit. We charge a one-time platform fee only when both sides agree to connect.',
  },
  {
    question: 'What does the platform fee cover?',
    answer:
      'The fee covers identity verification of the owner, listing review, and the secure contact exchange between both parties. You pay nothing until a connection is mutually agreed upon.',
  },
  {
    question: 'What if the owner does not respond after I express interest?',
    answer:
      'Owners are notified immediately when you send a request. If there is no response within 72 hours, the listing is flagged for review. You can also report unresponsive listings directly — we investigate and follow up.',
  },
]

const CITIES_GRID = [
  { name: 'Mumbai', state: 'MH', href: '/properties?q=mumbai' },
  { name: 'Delhi NCR', state: 'DL', href: '/properties?q=delhi' },
  { name: 'Pune', state: 'MH', href: '/properties?q=pune' },
  { name: 'Bangalore', state: 'KA', href: '/properties?q=bangalore' },
  { name: 'Hyderabad', state: 'TS', href: '/properties?q=hyderabad' },
  { name: 'Chennai', state: 'TN', href: '/properties?q=chennai' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  return (
    <main className="overflow-x-hidden">
      {/* ══════════════════════════════════════════════════════════════════════
          Section 1 — Hero
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="hero-heading"
        className="px-4 pb-20 pt-24 sm:px-6 md:pb-28 md:pt-32"
      >
        <div className="mx-auto max-w-4xl">
          <Reveal y={40}>
            <h1
              id="hero-heading"
              className="text-5xl font-semibold leading-tight tracking-tight text-[var(--color-foreground)] sm:text-6xl md:text-7xl"
            >
              Find your next place in life.
            </h1>
          </Reveal>

          <Reveal delay={0.1} y={20}>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--color-muted-foreground)]">
              ChapterNew connects verified owners directly with serious buyers — no middlemen, no
              number leaks, no surprises.
            </p>
          </Reveal>

          <Reveal delay={0.18} y={24}>
            <form action="/properties" method="get" className="mt-8 flex max-w-md gap-2">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  name="q"
                  required
                  placeholder="Search by city — Mumbai, Pune, Delhi..."
                  aria-label="Search by city"
                  className="focus:ring-[var(--color-foreground)]/10 h-11 w-full rounded-xl border border-[var(--color-border)] bg-white pl-9 pr-4 text-sm text-[var(--color-foreground)] transition-[border-color,box-shadow] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-foreground)] focus:outline-none focus:ring-2"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[var(--color-foreground)] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-foreground)]"
              >
                Search
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link
                href="/properties"
                className="text-sm font-medium text-[var(--color-foreground)] underline-offset-4 hover:underline"
              >
                Find a Home
              </Link>
              <span className="text-[var(--color-border)]" aria-hidden="true">
                ·
              </span>
              <Link
                href="/sell"
                className="text-sm font-medium text-[var(--color-foreground)] underline-offset-4 hover:underline"
              >
                List Your Property
              </Link>
            </div>

            <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
              No broker fees &nbsp;·&nbsp; No unsolicited contact &nbsp;·&nbsp; Free to list
            </p>
          </Reveal>

          <div className="mt-16 flex justify-start">
            <ScrollChevron />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Section 2 — Problem
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="problem-heading"
        className="bg-[var(--color-muted)] px-4 py-20 sm:px-6 md:py-28"
      >
        <div className="mx-auto max-w-4xl">
          <Reveal x={-24} y={0}>
            <h2
              id="problem-heading"
              className="max-w-xl text-3xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-4xl"
            >
              Most portals work against you.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--color-muted-foreground)]">
              They profit from your number, your time, and your inability to verify what you&apos;re
              looking at.
            </p>
          </Reveal>

          <Stagger className="mt-12 divide-y divide-[var(--color-border)]" stagger={0.1} y={24}>
            {PAIN_POINTS.map(({ num, title, description }) => (
              <div key={num} className="flex gap-6 py-6 sm:gap-10">
                <span
                  className="mt-0.5 shrink-0 text-sm font-normal tabular-nums text-[var(--color-muted-foreground)]"
                  aria-hidden="true"
                >
                  {num}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-[var(--color-foreground)]">
                    {title}
                  </h3>
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
          Section 3 — Handshake Model
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="handshake-heading"
        className="bg-[var(--color-primary)] px-4 py-24 sm:px-6 md:py-36"
      >
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <h2
              id="handshake-heading"
              className="text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            >
              A process that respects both sides.
            </h2>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-white/60">
              Every step is designed so neither party needs to trust a stranger — the system does
              the work.
            </p>
          </FadeIn>

          {/* Numbered step timeline — step dot + connector line */}
          <ol className="relative mt-14 space-y-0" aria-label="How ChapterNew works">
            {HANDSHAKE_STEPS.map(({ step, actor, label, description }, idx) => (
              <Reveal key={step} delay={idx * 0.09} y={16}>
                <li className="relative flex gap-6 pb-10 last:pb-0">
                  {/* Connector line (hidden on last item) */}
                  {idx < HANDSHAKE_STEPS.length - 1 && (
                    <div
                      className="absolute left-4 top-9 h-full w-px bg-white/15"
                      aria-hidden="true"
                    />
                  )}
                  {/* Step dot */}
                  <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-bold tabular-nums text-white/70">
                    {step}
                  </div>
                  {/* Content */}
                  <div className="pb-1 pt-1">
                    <span className="mb-2 inline-block rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/60">
                      {actor}
                    </span>
                    <h3 className="text-base font-semibold text-white sm:text-lg">{label}</h3>
                    <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white/55">
                      {description}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>

          <Reveal delay={0.5} y={16}>
            <div className="mt-10 flex flex-col items-start gap-3 border-t border-white/10 pt-10 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href="/sell"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[var(--color-primary)] transition-opacity hover:opacity-90"
              >
                List Your Property <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/properties"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-6 py-3 text-sm font-semibold text-white/80 transition-all hover:border-white/50 hover:text-white"
              >
                Browse Homes <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Section 4 — Trust
      ══════════════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="trust-heading" className="px-4 py-20 sm:px-6 md:py-28">
        <div className="mx-auto max-w-4xl">
          <Reveal x={-24} y={0}>
            <h2
              id="trust-heading"
              className="max-w-xl text-3xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-4xl"
            >
              What we verify before anything goes live.
            </h2>
            <p className="mt-3 max-w-md text-base leading-relaxed text-[var(--color-muted-foreground)]">
              Every listing passes the same checks. No exceptions for premium listings.
            </p>
          </Reveal>

          <Stagger className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2" stagger={0.08} y={20}>
            {TRUST_PILLARS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex gap-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted)] p-6"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white">
                  <Icon className="h-5 w-5 text-[var(--color-foreground)]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold leading-snug text-[var(--color-foreground)] sm:text-base">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Section 5 — FAQ
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="faq-heading"
        className="bg-[var(--color-muted)] px-4 py-20 sm:px-6 md:py-24"
      >
        <div className="mx-auto max-w-4xl">
          <Reveal y={20}>
            <h2
              id="faq-heading"
              className="text-3xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-4xl"
            >
              Common questions.
            </h2>
          </Reveal>
          <Stagger className="mt-10 divide-y divide-[var(--color-border)]" stagger={0.09} y={12}>
            {FAQ_ITEMS.map(({ question, answer }, idx) => (
              <FAQItem key={idx} question={question} answer={answer} />
            ))}
          </Stagger>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Section 6 — Cities (replaces Featured Homes)
      ══════════════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="cities-heading" className="px-4 py-20 sm:px-6 md:py-28">
        <div className="mx-auto max-w-4xl">
          <FadeIn>
            <h2
              id="cities-heading"
              className="text-3xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-4xl"
            >
              Browse by city.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[var(--color-muted-foreground)]">
              Owner-listed properties across India&apos;s major residential markets.
            </p>
          </FadeIn>

          <Stagger className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3" stagger={0.06} y={20}>
            {CITIES_GRID.map((city) => (
              <Link
                key={city.name}
                href={city.href}
                className="group flex items-center justify-between rounded-xl border border-[var(--color-border)] p-6 transition-colors duration-150 hover:border-[var(--color-primary)]"
              >
                <div>
                  <p className="text-lg font-medium text-[var(--color-foreground)]">{city.name}</p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">{city.state}</p>
                </div>
                <ArrowRight
                  className="h-4 w-4 text-[var(--color-muted-foreground)] transition-colors duration-150 group-hover:text-[var(--color-foreground)]"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Section 7 — Final CTA (persona-split)
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-label="Get started"
        className="bg-[var(--color-primary)] px-4 py-24 sm:px-6 md:py-32"
      >
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:[&>*]:contents">
            <Reveal x={-24} y={0}>
              <div className="flex flex-col gap-4 rounded-2xl border border-white/10 p-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
                    For buyers
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    Looking for a home?
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-white/55">
                    Search verified owner listings in your city. No broker calls.
                  </p>
                </div>
                <Link
                  href="/properties"
                  className="mt-auto inline-flex items-center gap-2 self-start rounded-xl border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-all hover:border-white/50 hover:bg-white/5"
                >
                  Find a Home <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
            <Reveal x={24} y={0} delay={0.06}>
              <div className="flex flex-col gap-4 rounded-2xl bg-white/10 p-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
                    For sellers
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    Selling your property?
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-white/55">
                    List in 5 minutes. We verify it. Buyers come to you.
                  </p>
                </div>
                <Link
                  href="/sell"
                  className="mt-auto inline-flex items-center gap-2 self-start rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[var(--color-primary)] transition-opacity hover:opacity-90"
                >
                  List Your Property <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
          </div>

          <FadeIn delay={0.2}>
            <p className="mt-12 text-center text-sm text-white/40">
              Questions? Email us at{' '}
              <a
                href="mailto:support@chapternew.com"
                className="text-white/60 underline underline-offset-4 hover:text-white"
              >
                support@chapternew.com
              </a>
            </p>
          </FadeIn>
        </div>
      </section>
    </main>
  )
}
