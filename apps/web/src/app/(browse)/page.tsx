import React from 'react'

import { ArrowRight } from 'lucide-react'
import { unstable_cache } from 'next/cache'
import Link from 'next/link'

import { OAuthCallbackRedirect } from '@/components/auth/oauth-callback-redirect'
import { HeroSearch } from '@/components/browse/hero-search'
import { FAQItem, FadeIn, Reveal, ScrollChevron, Stagger } from '@/components/landing/reveal'
import { ListingCard } from '@/components/listing/listing-card'
import { mapSupabaseListingToMock } from '@/lib/listing-mapper'
import { createServiceClient } from '@/lib/supabase/server'

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
    label: 'List your property',
    description:
      'Add real photos, basic details and verify your identity. Your contact stays private until you choose to share.',
  },
  {
    step: '02',
    actor: 'Buyer',
    label: 'Send a request',
    description:
      'Express interest by sending a request with your name and intent — no anonymous pings, no spam.',
  },
  {
    step: '03',
    actor: 'Owner',
    label: 'Review the buyer',
    description:
      "See who's interested. Check their details and decide whether to accept or decline the request.",
  },
  {
    step: '04',
    actor: 'Owner',
    label: 'Choose to connect',
    description: 'If it feels right, share contact to start a conversation on WhatsApp or phone.',
  },
  {
    step: '05',
    actor: 'Both',
    label: 'Talk and close the deal',
    description:
      'Discuss, negotiate and close directly — on your terms, at your pace, with full control.',
  },
]

const FAQ_ITEMS = [
  {
    question: 'Is ChapterNew a broker?',
    answer:
      'No — and that is the whole point. We are a platform, not a middleman. No ChapterNew person is involved in your negotiation, your price discussion, or your site visit. You deal directly with the owner. There are no fees at any step.',
  },
  {
    /* PAYMENT_DISABLED — was: "What does the ₹49 platform fee cover?" */
    question: 'Is it really free? No hidden charges?',
    answer:
      'Yes — completely free for both buyers and owners. There is no platform fee, no commission, and no subscription. ChapterNew is free to use. The only thing we ask is that everyone verifies their identity before listing or connecting.',
  },
  {
    question: 'What if the owner does not respond after I send a request?',
    answer:
      'Owners are notified the moment you express interest. If they do not respond within 72 hours, the listing is flagged for our review. You can also report unresponsive listings directly — we follow up and take action. Your time matters.',
  },
  {
    question: 'How do I know the listing is still available and not already sold?',
    answer:
      'Owners are required to mark their listing as sold or remove it once a deal is done. Listings that stay live without activity are automatically flagged. If you suspect a ghost listing, report it — we investigate within 48 hours.',
  },
  {
    question: 'Can I negotiate the price directly with the owner?',
    answer:
      'Yes — completely. Once you are connected, everything between you and the owner is your business. We do not set prices, take a cut of the deal, or interfere in negotiations. What you agree on is between the two of you.',
  },
]

// ─── Dummy listings (preview only — remove once real listings exist) ──────────

const DUMMY_LISTINGS = [
  {
    id: 'dummy-1',
    title: '2 BHK Apartment in Koramangala',
    price: 8500000,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop',
        caption: null,
      },
    ],
    locality: 'Koramangala',
    city: 'Bangalore',
    bhkType: '2 BHK',
    builtUpArea: 1100,
    furnishing: 'Semi-Furnished',
    floor: 4,
    totalFloors: 10,
    isVerified: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 38,
  },
  {
    id: 'dummy-2',
    title: '3 BHK Independent House in Banjara Hills',
    price: 22000000,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop',
        caption: null,
      },
    ],
    locality: 'Banjara Hills',
    city: 'Hyderabad',
    bhkType: '3 BHK',
    builtUpArea: 2200,
    furnishing: 'Furnished',
    floor: null,
    totalFloors: null,
    isVerified: true,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 61,
  },
]

// ─── Data fetchers ────────────────────────────────────────────────────────────

const getFeaturedListings = unstable_cache(
  async () => {
    try {
      const admin = createServiceClient()
      if (!admin) return []
      const { data } = await admin
        .from('listings')
        .select(
          'id, title, description, price, property_type, bhk_type, built_up_area, carpet_area, floor, total_floors, facing, furnishing, bathrooms, balconies, parking, age_of_property, amenities, city, locality, address, pincode, state, image_urls, status, is_verified, view_count, created_at, seller_id, quality_score, quality_breakdown',
        )
        .eq('status', 'ACTIVE')
        .order('quality_score', { ascending: false })
        .limit(6)
      return data ? data.map(mapSupabaseListingToMock) : []
    } catch {
      return []
    }
  },
  ['landing-featured-listings'],
  { revalidate: 120, tags: ['listings'] },
)

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const [params, featuredListings] = await Promise.all([searchParams, getFeaturedListings()])

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
              AI quietly improves your listing behind the scenes — from writing compelling
              descriptions to measuring listing quality and matching you with serious buyers. You
              stay in control.
            </p>
          </Reveal>

          <Reveal delay={0.18} y={24}>
            <div className="mt-10">
              <HeroSearch />
            </div>

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

            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-white">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">
                    No brokerage
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Keep 2–3 lakhs in your pocket
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-white">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.89 10.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012.8 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.72 6.72l1.28-1.28a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                    <line x1="23" y1="1" x2="1" y2="23" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">
                    No spam calls
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Only serious buyers
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-white">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                    <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">
                    100% private
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    You control what you share
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          <div className="mt-20 flex justify-start">
            <ScrollChevron />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          AI Features Strip — full-width section
      ══════════════════════════════════════════════════════════════════════ */}
      <section aria-label="AI features" className="px-6 py-24 sm:px-10 sm:py-32 lg:px-16">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-12 border-t border-[var(--color-border)]" />
          {/* Label + heading */}
          <Reveal y={16}>
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-foreground)]">
              <span aria-hidden="true">✦</span>
              Meet your AI selling assistant
            </p>
            <p className="mb-2 text-xl font-semibold text-[var(--color-foreground)] sm:text-2xl">
              Every listing gets a smarter start.
            </p>
            <p className="mb-10 max-w-2xl text-base leading-relaxed text-[var(--color-muted-foreground)]">
              Before your property goes live, AI writes compelling descriptions, highlights
              opportunities to improve, and helps connect you with buyers who are the best fit — so
              you can list with confidence from day one.
            </p>
          </Reveal>

          {/* 3 feature columns */}
          <Stagger
            className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
            stagger={0.08}
            y={20}
          >
            {/* AI Listing Writer */}
            <div className="flex flex-col gap-4 lg:border-r lg:border-[var(--color-border)] lg:pr-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-muted)]">
                {/* Document with lines — represents writing/listing */}
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                  AI Listing Writer
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--color-foreground)]">
                  Write like a professional.
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                  Generate three polished listing descriptions in different styles — from
                  SEO-friendly to investment-focused — in under a minute.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[#D4EDD4] bg-[#F0FAF0] px-3 py-1 text-xs font-medium text-[#2D7A2D]">
                  From your details
                </span>
                <span className="flex items-center gap-1 rounded-full border border-[#D4EDD4] bg-[#F0FAF0] px-3 py-1 text-xs font-medium text-[#2D7A2D]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2D7A2D]" />
                  60 sec to publish
                </span>
              </div>
            </div>

            {/* AI Property Quality Score */}
            <div className="flex flex-col gap-4 lg:border-r lg:border-[var(--color-border)] lg:pl-8 lg:pr-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-muted)]">
                {/* Bar chart rising — represents quality score */}
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                  <line x1="2" y1="20" x2="22" y2="20" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                  AI Property Quality Score
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--color-foreground)]">
                  Know what buyers are missing.
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                  Receive a score out of 100 with personalised recommendations to improve your
                  listing before it goes live.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1 rounded-full border border-[#D4EDD4] bg-[#F0FAF0] px-3 py-1 text-xs font-medium text-[#2D7A2D]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2D7A2D]" />
                  Score out of 100
                </span>
                <span className="flex items-center gap-1 rounded-full border border-[#D4EDD4] bg-[#F0FAF0] px-3 py-1 text-xs font-medium text-[#2D7A2D]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2D7A2D]" />
                  Personalised tips
                </span>
              </div>
            </div>

            {/* AI Buyer Match Score */}
            <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1 lg:pl-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-muted)]">
                {/* Two people connected — represents buyer matching */}
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                  AI Buyer Match Score
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--color-foreground)]">
                  Reach buyers who are more likely to enquire.
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                  See how well your property matches buyer preferences using budget, location,
                  lifestyle, and property fit.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1 rounded-full border border-[#D4EDD4] bg-[#F0FAF0] px-3 py-1 text-xs font-medium text-[#2D7A2D]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2D7A2D]" />
                  Match %
                </span>
                <span className="flex items-center gap-1 rounded-full border border-[#D4EDD4] bg-[#F0FAF0] px-3 py-1 text-xs font-medium text-[#2D7A2D]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2D7A2D]" />
                  Better connections
                </span>
              </div>
            </div>
          </Stagger>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Section 2 — Featured Listings
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="listings-heading"
        className="bg-[var(--color-primary)] px-6 py-24 sm:px-10 sm:py-32 lg:px-16"
      >
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-stretch lg:gap-12">
            {/* ── Left column ──────────────────────────────────────────────── */}
            <FadeIn>
              <div className="flex h-full flex-col justify-between gap-8">
                {/* Heading block */}
                <div>
                  <h2
                    id="listings-heading"
                    className="text-[clamp(2rem,4.5vw,3rem)] font-semibold leading-tight tracking-tight text-white"
                  >
                    Latest <span style={{ color: '#F86039' }}>listings.</span>
                  </h2>
                  <p className="mt-3 text-lg font-medium leading-snug text-white">
                    Discover homes shared directly by owners.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-white/55">
                    Explore recently added properties that have been reviewed before publishing.
                    Find genuine homes, connect directly with owners, and decide when to share your
                    contact details.
                  </p>
                </div>

                {/* Feature bullets */}
                <div className="flex flex-col gap-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#F86039"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Direct owner listings</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-white/50">
                        Talk directly with property owners — no intermediaries.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#4ade80"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <polyline points="9 12 11 14 15 10" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Reviewed before publishing</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-white/50">
                        Every listing is checked before it appears on ChapterNew.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#a78bfa"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Privacy-first contact sharing
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-white/50">
                        Contact details are only shared when both sides agree.
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div>
                  <Link
                    href="/sell"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-[var(--color-primary)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    List Your Property Free
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  <p className="mt-3 text-center text-xs text-white/40">
                    Create your listing in under 2 minutes. No listing fees. Edit anytime.
                  </p>
                </div>
              </div>
            </FadeIn>

            {/* ── Right column ─────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/50">
                  {featuredListings.length > 0
                    ? `${featuredListings.length} listings`
                    : 'No listings yet'}
                </p>
                <Link
                  href="/properties"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-white/50"
                >
                  View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>

              {featuredListings.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/15 px-8 py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white/50"
                      aria-hidden="true"
                    >
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </div>
                  <p className="text-base font-medium text-white">
                    Be the first to list your property
                  </p>
                  <p className="max-w-xs text-sm leading-relaxed text-white/50">
                    No listings have been added yet. Post yours and be seen by serious buyers — for
                    free.
                  </p>
                  <Link
                    href="/sell"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-white underline-offset-4 hover:underline"
                  >
                    Post Property
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2" stagger={0.06} y={20}>
                    {featuredListings.slice(0, 4).map((listing, i) => (
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
                        qualityScore={listing.qualityScore}
                        priorityImage={i < 2}
                      />
                    ))}
                  </Stagger>
                  {featuredListings.length === 1 && (
                    <Link
                      href="/properties"
                      className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-white underline-offset-4 hover:underline"
                    >
                      See all properties
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-3.5">
                <span className="shrink-0 text-sm text-white/40" aria-hidden="true">
                  ✦
                </span>
                <p className="flex-1 text-sm leading-relaxed text-white/50">
                  Every listing is AI-enhanced for better descriptions and quality insights.
                </p>
                <Link
                  href="/sell"
                  className="shrink-0 whitespace-nowrap text-sm font-semibold text-white underline-offset-4 hover:underline"
                >
                  Learn more
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Section 3 — Problem
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="problem-heading"
        className="bg-[var(--color-muted)] px-6 py-24 sm:px-10 sm:py-32 lg:px-16"
      >
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-[5fr_7fr] lg:gap-20">
            {/* Left — heading + subtext + callout */}
            <Reveal x={-24} y={0}>
              <div className="flex flex-col gap-8 lg:sticky lg:top-24">
                <div>
                  <h2
                    id="problem-heading"
                    className="text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-tight tracking-tight text-[var(--color-foreground)]"
                  >
                    Most portals work
                    <br />
                    against <span style={{ color: '#F86039' }}>you.</span>
                  </h2>
                  <p className="mt-5 text-lg leading-relaxed text-[var(--color-muted-foreground)]">
                    Outdated systems. Hidden agendas. Zero transparency. That&apos;s why finding or
                    selling a home feels harder than it should.
                  </p>
                </div>

                {/* ChapterNew callout card */}
                <div className="flex items-start gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50">
                    {/* Shield with checkmark — protection/trust */}
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#F86039"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <polyline points="9 12 11 14 15 10" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--color-foreground)]">
                      ChapterNew is different.
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                      No brokers. No games. Just real owners and real conversations.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Right — pain point rows with icons */}
            <div>
              <Stagger className="divide-y divide-[var(--color-border)]" stagger={0.1} y={20}>
                {/* 01 — Ghost listings */}
                <div className="flex items-start gap-5 py-7">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                    {/* Calendar with X — stale/expired listing */}
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#F86039"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                      <line x1="9" y1="18" x2="13" y2="18" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-[var(--color-foreground)] sm:text-lg">
                      That listing you called about? It sold three months ago.
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                      Ghost listings keep portals looking busy. You spend evenings calling numbers
                      that go unanswered — or worse, answered by a broker who says &quot;that one is
                      gone, but I have others.&quot;
                    </p>
                  </div>
                </div>

                {/* 02 — No verification */}
                <div className="flex items-start gap-5 py-7">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-green-50">
                    {/* User with question mark — unknown/unverified identity */}
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2D7A2D"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="10" cy="7" r="4" />
                      <path d="M2 21v-2a7 7 0 0110.5-6.07" />
                      <circle cx="19" cy="19" r="3" />
                      <path d="M19 13v1.5" />
                      <circle cx="19" cy="11" r="0.5" fill="#2D7A2D" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-[var(--color-foreground)] sm:text-lg">
                      There is no way to know if the owner is even real.
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                      No ID. No verification. The person posting could be a broker pretending to be
                      an owner, a sub-broker, or someone running a scam. You have no way to tell
                      until it is too late.
                    </p>
                  </div>
                </div>

                {/* 03 — Broker fees */}
                <div className="flex items-start gap-5 py-7">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#B45309"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M9 8h6" />
                      <path d="M9 11h6" />
                      <path d="M9 8a3 3 0 010 6h-1l4 4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-[var(--color-foreground)] sm:text-lg">
                      Lakhs go to a broker for a connection you could have made yourself.
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                      1–2% of the sale price. On a ₹80 lakh flat, that is ₹80,000–₹1.6 lakh — for
                      someone who sent one WhatsApp message and showed up once.
                    </p>
                  </div>
                </div>

                {/* 04 — Spam calls */}
                <div className="flex items-start gap-5 py-7">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-purple-50">
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#7C3AED"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M15.05 5A5 5 0 0119 8.95M15.05 1A9 9 0 0123 8.94" />
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10a19.79 19.79 0 01-3.07-8.67A2 2 0 011.72 1h3.09a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L5.78 8.91a16 16 0 006.73 6.73l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-[var(--color-foreground)] sm:text-lg">
                      You get twelve broker calls before you see a single listing.
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                      You searched once. Your number was harvested and sold. By evening, strangers
                      are calling you about properties in cities you never looked at. You never
                      consented to any of this.
                    </p>
                  </div>
                </div>
              </Stagger>

              {/* Bottom banner */}
              <Reveal delay={0.4} y={12}>
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white px-5 py-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#F86039"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <polyline points="9 12 11 14 15 10" />
                    </svg>
                  </div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    It doesn&apos;t have to be this way.{' '}
                    <span className="font-semibold text-[var(--color-foreground)]">
                      Choose a platform that puts you first.
                    </span>
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Section 4 — Handshake Model
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="handshake-heading"
        className="bg-[var(--color-primary)] px-6 py-24 sm:px-10 sm:py-32 lg:px-16"
      >
        <div className="mx-auto w-full max-w-[1040px]">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-[5fr_7fr] lg:gap-20">
            {/* ── Left column ──────────────────────────────────────────────── */}
            <FadeIn>
              <div className="flex flex-col gap-10">
                {/* Heading + subtext */}
                <div>
                  <h2
                    id="handshake-heading"
                    className="text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-tight tracking-tight text-white"
                  >
                    How it works — for
                    <br />
                    both <span style={{ color: '#F86039' }}>sides.</span>
                  </h2>
                  <p className="mt-5 max-w-sm text-base leading-relaxed text-white/55">
                    Owners stay in full control. Buyers connect directly — no fees, no middlemen, no
                    spam.
                  </p>
                </div>

                {/* Trust micro-badges */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {/* 100% Private */}
                  <div className="flex flex-col gap-2">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white/50"
                      aria-hidden="true"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <polyline points="9 12 11 14 15 10" />
                    </svg>
                    <p className="text-sm font-semibold text-white">100% Private</p>
                    <p className="text-xs leading-relaxed text-white/40">
                      Contact shared only when you decide
                    </p>
                  </div>
                  {/* No Middlemen */}
                  <div className="flex flex-col gap-2">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white/50"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                    <p className="text-sm font-semibold text-white">No Middlemen</p>
                    <p className="text-xs leading-relaxed text-white/40">
                      Owner and buyer connect directly
                    </p>
                  </div>
                  {/* Zero Fees */}
                  <div className="flex flex-col gap-2">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white/50"
                      aria-hidden="true"
                    >
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                    <p className="text-sm font-semibold text-white">Zero Fees</p>
                    <p className="text-xs leading-relaxed text-white/40">
                      Free to list and free to connect
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* ── Right column — timeline ───────────────────────────────────── */}
            <div className="flex flex-col">
              <ol className="relative space-y-0" aria-label="How ChapterNew works">
                {HANDSHAKE_STEPS.map(({ step, actor, label, description }, idx) => {
                  const actorPill =
                    actor === 'Buyer'
                      ? 'bg-blue-900/40 text-blue-300'
                      : actor === 'Both'
                        ? 'bg-orange-900/40 text-orange-300'
                        : 'bg-white/10 text-white/60'

                  const stepIcons: Record<string, React.JSX.Element> = {
                    '01': (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    ),
                    '02': (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    ),
                    '03': (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        <circle cx="9" cy="11" r="0.8" fill="currentColor" stroke="none" />
                        <circle cx="12" cy="11" r="0.8" fill="currentColor" stroke="none" />
                        <circle cx="15" cy="11" r="0.8" fill="currentColor" stroke="none" />
                      </svg>
                    ),
                    '04': (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87" />
                        <path d="M16 3.13a4 4 0 010 7.75" />
                      </svg>
                    ),
                    '05': (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M9 11l3 3L22 4" />
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                      </svg>
                    ),
                  }

                  return (
                    <Reveal key={step} delay={idx * 0.09} y={16}>
                      <li className="relative flex items-start gap-5 pb-10 last:pb-0">
                        {idx < HANDSHAKE_STEPS.length - 1 && (
                          <div
                            className="absolute bottom-0 left-[19px] top-10 w-px bg-white/15"
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-transparent text-[11px] font-semibold tabular-nums text-white">
                          {step}
                        </div>
                        <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                          {stepIcons[step]}
                        </div>
                        <div className="pt-1">
                          <span
                            className={`mb-2 inline-block rounded-md px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${actorPill}`}
                          >
                            {actor}
                          </span>
                          <h3 className="text-base font-semibold text-white sm:text-lg">{label}</h3>
                          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-white/50">
                            {description}
                          </p>
                        </div>
                      </li>
                    </Reveal>
                  )
                })}
              </ol>

              <Reveal delay={0.5} y={16}>
                <div className="mt-12 flex flex-col items-start gap-3 border-t border-white/10 pt-10 sm:flex-row sm:items-center">
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
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Section 6 — FAQ
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="faq-heading"
        className="bg-[var(--color-muted)] px-6 py-24 sm:px-10 sm:py-32 lg:px-16"
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
          Section 7 — Final CTA (persona-split)
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-label="Get started"
        className="bg-[var(--color-primary)] px-6 py-24 sm:px-10 sm:py-32 lg:px-16"
      >
        <div className="mx-auto w-full max-w-4xl">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Reveal x={-24} y={0} className="h-full">
              <div className="flex h-full flex-col gap-6 rounded-2xl border border-white/10 p-10">
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
            <Reveal x={24} y={0} delay={0.06} className="h-full">
              <div className="flex h-full flex-col gap-6 rounded-2xl bg-white/10 p-10">
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
