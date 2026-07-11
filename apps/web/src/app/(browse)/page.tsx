import { ArrowRight, BadgeCheck, CheckCircle2, Lock, Search, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

import { FAQItem, FadeIn, Reveal, ScrollChevron, Stagger } from '@/components/landing/reveal'
import { OAuthCallbackRedirect } from '@/components/auth/oauth-callback-redirect'

// ─── Data ─────────────────────────────────────────────────────────────────────

const PAIN_POINTS = [
  {
    num: '01',
    title: 'That listing you called about? It sold three months ago.',
    description:
      'Ghost listings keep portals looking busy. You spend evenings calling numbers that go unanswered — or worse, answered by a broker who says "that one is gone, but I have others."',
  },
  {
    num: '02',
    title: 'There is no way to know if the owner is even real.',
    description:
      'No ID. No verification. The person posting could be a broker pretending to be an owner, a sub-broker, or someone running a scam. You have no way to tell until it is too late.',
  },
  {
    num: '03',
    title: 'Lakhs go to a broker for a connection you could have made yourself.',
    description:
      '1–2% of the sale price. On a ₹80 lakh flat, that is ₹80,000–₹1.6 lakh — for someone who sent one WhatsApp message and showed up once.',
  },
  {
    num: '04',
    title: 'You get twelve broker calls before you see a single listing.',
    description:
      'You searched once. Your number was harvested and sold. By evening, strangers are calling you about properties in cities you never looked at. You never consented to any of this.',
  },
]

const HANDSHAKE_STEPS = [
  {
    step: '01',
    actor: 'Owner',
    label: 'Lists their property',
    description:
      'Real photos. Verified identity. Contact details stay completely private until the owner chooses to share them — with exactly the right person.',
  },
  {
    step: '02',
    actor: 'Buyer',
    label: 'Sends a request',
    description:
      'The owner sees who is asking — your name, your intent — before agreeing to anything. No anonymous pings. No pressure.',
  },
  {
    step: '03',
    actor: 'Owner',
    label: 'Approves or declines',
    description:
      'The owner is in full control. They decide who gets their number. No cold calls, no strangers showing up uninvited.',
  },
  {
    step: '04',
    actor: 'Buyer',
    label: 'Pays a small platform fee',
    description:
      'Just ₹49 — a one-time fee, charged only after both sides have agreed to connect. Not before. Not as a subscription. Just once.',
  },
  {
    step: '05',
    actor: 'Both',
    label: 'Talk directly',
    description:
      'A real conversation on WhatsApp — owner to buyer, no middleman listening in. What you say, what you negotiate, is between the two of you.',
  },
]

const TRUST_PILLARS = [
  {
    icon: BadgeCheck,
    title: 'Every owner is verified before their listing goes live.',
    description:
      'Government ID checked and matched to property documents. If we cannot verify the owner, the listing does not appear. No exceptions.',
  },
  {
    icon: ShieldCheck,
    title: 'You know exactly who owns the property you are looking at.',
    description:
      'Owners verify their identity and phone number before posting. The person behind every listing is a real, confirmed individual — not an anonymous post.',
  },
  {
    icon: Lock,
    title: 'Your contact details are never shared without your say-so.',
    description:
      'Your number stays hidden until an owner explicitly approves your request. No one can see your contact details just by browsing.',
  },
  {
    icon: CheckCircle2,
    title: 'Spot something wrong? We act within 48 hours.',
    description:
      'If a listing does not match what you see in person, report it. We investigate and take it down before any fee is ever charged to you.',
  },
]

const FAQ_ITEMS = [
  {
    question: 'Is ChapterNew a broker?',
    answer:
      'No — and that is the whole point. We are a platform, not a middleman. No ChapterNew person is involved in your negotiation, your price discussion, or your site visit. You deal directly with the owner. We charge a small one-time platform fee only after both sides agree to connect.',
  },
  {
    question: 'What does the ₹49 platform fee actually cover?',
    answer:
      "It covers the cost of verifying the owner's identity, reviewing the listing, and enabling the secure exchange of contact details between both parties. You pay nothing until you have seen the listing, found it genuine, and chosen to connect. Not before.",
  },
  {
    question: 'What if the owner does not respond after I send a request?',
    answer:
      'Owners are notified the moment you express interest. If they do not respond within 72 hours, the listing is flagged for our review. You can also report unresponsive listings directly — we follow up and take action. Your time matters.',
  },
  {
    question: 'How do I know the listing is still available and not already sold?',
    answer:
      'Owners are required to mark their listing as sold or remove it once a deal is done. Listings that stay live without activity are automatically flagged. If you suspect a ghost listing, report it — we investigate within 48 hours. The ₹49 fee is never charged for a listing that turns out to be unavailable.',
  },
  {
    question: 'Can I negotiate the price directly with the owner?',
    answer:
      'Yes — completely. Once you are connected, everything between you and the owner is your business. We do not set prices, take a cut of the deal, or interfere in negotiations. What you agree on is between the two of you.',
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

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams

  return (
    <main className="overflow-x-hidden">
      {params.code && <OAuthCallbackRedirect code={params.code} next={params.next} />}
      {/* ══════════════════════════════════════════════════════════════════════
          Section 1 — Hero
          min-h subtracts the sticky header height (h-14 = 3.5rem / sm:h-16 = 4rem)
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="hero-heading"
        className="flex min-h-[calc(100vh-3.5rem)] flex-col justify-center px-6 py-20 sm:min-h-[calc(100vh-4rem)] sm:px-10 lg:px-16"
      >
        <div className="mx-auto w-full max-w-4xl">
          <Reveal y={40}>
            <h1
              id="hero-heading"
              className="text-[clamp(2.75rem,7vw,5.5rem)] font-semibold leading-[1.05] tracking-tight text-[var(--color-foreground)]"
            >
              Buy or sell a home.
              <br />
              No broker in the <span style={{ color: '#F86039' }}>middle.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.1} y={20}>
            <p className="mt-6 max-w-lg text-xl leading-relaxed text-[var(--color-muted-foreground)] sm:text-2xl">
              ChapterNew is where verified property owners meet serious buyers — directly,
              privately, and on their own terms. No brokers. No number leaks. No drama.
            </p>
          </Reveal>

          <Reveal delay={0.18} y={24}>
            <form action="/properties" method="get" className="mt-10 flex max-w-lg gap-2">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  name="q"
                  required
                  placeholder="Search by city — Mumbai, Pune, Delhi..."
                  aria-label="Search by city"
                  className="focus:ring-[var(--color-foreground)]/10 h-12 w-full rounded-xl border border-[var(--color-border)] bg-white pl-10 pr-4 text-sm text-[var(--color-foreground)] transition-[border-color,box-shadow,background-color] placeholder:text-[var(--color-muted-foreground)] hover:border-transparent hover:bg-[var(--color-muted)] hover:placeholder:text-[var(--color-foreground)] focus:border-[var(--color-foreground)] focus:bg-white focus:outline-none focus:ring-2"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-12 items-center gap-1.5 rounded-xl bg-[var(--color-foreground)] px-6 text-sm font-semibold text-white transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-foreground)]"
              >
                Search
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link
                href="/properties"
                className="text-sm font-medium text-[var(--color-foreground)] underline-offset-4 hover:underline"
              >
                Search Homes
              </Link>
              <span className="text-[var(--color-border)]" aria-hidden="true">
                ·
              </span>
              <Link
                href="/sell"
                className="text-sm font-medium text-[var(--color-foreground)] underline-offset-4 hover:underline"
              >
                List Your Property Free
              </Link>
            </div>

            <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
              No broker fees &nbsp;·&nbsp; No spam calls &nbsp;·&nbsp; Free to list
            </p>
          </Reveal>

          <div className="mt-20 flex justify-start">
            <ScrollChevron />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Section 2 — Problem
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="problem-heading"
        className="flex min-h-screen flex-col justify-center bg-[var(--color-muted)] px-6 py-24 sm:px-10 lg:px-16"
      >
        <div className="mx-auto w-full max-w-4xl">
          <Reveal x={-24} y={0}>
            <h2
              id="problem-heading"
              className="max-w-2xl text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-tight tracking-tight text-[var(--color-foreground)]"
            >
              Most portals work
              <br />
              against <span style={{ color: '#F86039' }}>you.</span>
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-[var(--color-muted-foreground)]">
              If you have ever searched for a home in India, you already know this. Here is why it
              keeps happening.
            </p>
          </Reveal>

          <Stagger className="mt-14 divide-y divide-[var(--color-border)]" stagger={0.1} y={24}>
            {PAIN_POINTS.map(({ num, title, description }) => (
              <div key={num} className="flex gap-8 py-8 sm:gap-12">
                <span
                  className="mt-1 w-8 shrink-0 text-sm font-normal tabular-nums text-[var(--color-muted-foreground)]"
                  aria-hidden="true"
                >
                  {num}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-[var(--color-muted-foreground)]">
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
        className="flex min-h-screen flex-col justify-center bg-[var(--color-primary)] px-6 py-24 sm:px-10 lg:px-16"
      >
        <div className="mx-auto w-full max-w-3xl">
          <FadeIn>
            <h2
              id="handshake-heading"
              className="text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-tight tracking-tight text-white"
            >
              How it works — for
              <br />
              both <span style={{ color: '#F86039' }}>sides.</span>
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/60">
              Every step is built so owners stay in control and buyers only pay when they have found
              something real.
            </p>
          </FadeIn>

          {/* Numbered step timeline */}
          <ol className="relative mt-16 space-y-0" aria-label="How ChapterNew works">
            {HANDSHAKE_STEPS.map(({ step, actor, label, description }, idx) => (
              <Reveal key={step} delay={idx * 0.09} y={16}>
                <li className="relative flex gap-8 pb-12 last:pb-0">
                  {/* Connector line — starts below the circle */}
                  {idx < HANDSHAKE_STEPS.length - 1 && (
                    <div
                      className="absolute bottom-0 left-[19px] top-10 w-px bg-white/15"
                      aria-hidden="true"
                    />
                  )}
                  {/* Step dot — solid bg so line cannot bleed through */}
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-[var(--color-primary)] text-xs font-bold tabular-nums text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
                    {step}
                  </div>
                  {/* Content */}
                  <div className="pt-1.5">
                    <span className="mb-2.5 inline-block rounded-md bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/60">
                      {actor}
                    </span>
                    <h3 className="text-lg font-semibold text-white sm:text-xl">{label}</h3>
                    <p className="mt-2 max-w-lg text-base leading-relaxed text-white/55">
                      {description}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>

          <Reveal delay={0.5} y={16}>
            <div className="mt-14 flex flex-col items-start gap-4 border-t border-white/10 pt-14 sm:flex-row sm:items-center">
              <Link
                href="/sell"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-[var(--color-primary)] transition-opacity hover:opacity-90"
              >
                List Your Property Free <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/properties"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-7 py-3.5 text-sm font-semibold text-white/80 transition-all hover:border-white/50 hover:text-white"
              >
                Search Homes <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Section 4 — Trust
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="trust-heading"
        className="flex min-h-screen flex-col justify-center px-6 py-24 sm:px-10 lg:px-16"
      >
        <div className="mx-auto w-full max-w-4xl">
          <Reveal x={-24} y={0}>
            <h2
              id="trust-heading"
              className="max-w-2xl text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-tight tracking-tight text-[var(--color-foreground)]"
            >
              What we check before
              <br />
              anything goes <span style={{ color: '#F86039' }}>live.</span>
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-[var(--color-muted-foreground)]">
              Every listing goes through the same process. No shortcuts, no paid boosts that skip
              verification.
            </p>
          </Reveal>

          <Stagger className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2" stagger={0.08} y={20}>
            {TRUST_PILLARS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex gap-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted)] p-7"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white">
                  <Icon className="h-5 w-5 text-[var(--color-foreground)]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-semibold leading-snug text-[var(--color-foreground)] sm:text-lg">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
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
        className="flex min-h-screen flex-col justify-center bg-[var(--color-muted)] px-6 py-24 sm:px-10 lg:px-16"
      >
        <div className="mx-auto w-full max-w-4xl">
          <Reveal y={20}>
            <h2
              id="faq-heading"
              className="text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-tight tracking-tight text-[var(--color-foreground)]"
            >
              Common <span style={{ color: '#F86039' }}>questions.</span>
            </h2>
          </Reveal>
          <Stagger className="mt-12 divide-y divide-[var(--color-border)]" stagger={0.09} y={12}>
            {FAQ_ITEMS.map(({ question, answer }) => (
              <FAQItem key={question} question={question} answer={answer} />
            ))}
          </Stagger>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Section 6 — Cities
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="cities-heading"
        className="flex min-h-screen flex-col justify-center px-6 py-24 sm:px-10 lg:px-16"
      >
        <div className="mx-auto w-full max-w-4xl">
          <FadeIn>
            <h2
              id="cities-heading"
              className="text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-tight tracking-tight text-[var(--color-foreground)]"
            >
              Browse by <span style={{ color: '#F86039' }}>city.</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-[var(--color-muted-foreground)]">
              Verified owner listings — no brokers, no fake posts — across India&apos;s major
              cities.
            </p>
          </FadeIn>

          <Stagger className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3" stagger={0.06} y={20}>
            {CITIES_GRID.map((city) => (
              <Link
                key={city.name}
                href={city.href}
                className="group flex items-center justify-between rounded-2xl border border-[var(--color-border)] p-7 transition-colors duration-150 hover:border-[var(--color-primary)]"
              >
                <div>
                  <p className="text-xl font-medium text-[var(--color-foreground)]">{city.name}</p>
                  <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                    {city.state}
                  </p>
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
        className="flex min-h-screen flex-col justify-center bg-[var(--color-primary)] px-6 py-24 sm:px-10 lg:px-16"
      >
        <div className="mx-auto w-full max-w-4xl">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Reveal x={-24} y={0}>
              <div className="flex flex-col gap-6 rounded-2xl border border-white/10 p-10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
                    For buyers
                  </p>
                  <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight text-white">
                    Looking for a <span style={{ color: '#F86039' }}>home?</span>
                  </h2>
                  <p className="mt-4 text-lg leading-relaxed text-white/55">
                    Browse verified owner listings in your city — no broker calls, no number leaks.
                  </p>
                </div>
                <Link
                  href="/properties"
                  className="mt-auto inline-flex items-center gap-2 self-start rounded-xl border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:border-white/50 hover:bg-white/5"
                >
                  Search Homes <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
            <Reveal x={24} y={0} delay={0.06}>
              <div className="flex flex-col gap-6 rounded-2xl bg-white/10 p-10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
                    For sellers
                  </p>
                  <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight text-white">
                    Selling your <span style={{ color: '#F86039' }}>property?</span>
                  </h2>
                  <p className="mt-4 text-lg leading-relaxed text-white/55">
                    List in minutes, free. We verify it. Serious buyers come to you — no broker in
                    the middle taking a cut.
                  </p>
                </div>
                <Link
                  href="/sell"
                  className="mt-auto inline-flex items-center gap-2 self-start rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-[var(--color-primary)] transition-opacity hover:opacity-90"
                >
                  List Your Property Free <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
          </div>

          <FadeIn delay={0.2}>
            <p className="mt-14 text-center text-sm text-white/40">
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
