import Link from 'next/link'

import { OAuthCallbackRedirect } from '@/components/auth/oauth-callback-redirect'
import { FAQItem, FadeIn, Reveal, Stagger } from '@/components/landing/reveal'

// ─── Data ─────────────────────────────────────────────────────────────────────

const TRUST_BAR = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="10" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M5 24c0-4.418 4.03-8 9-8s9 3.582 9 8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="18"
          y1="13"
          x2="23"
          y2="13"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    label: 'No brokers',
    sub: 'Save thousands',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect x="4" y="7" width="20" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M4 11l10 7 10-7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="22"
          y1="20"
          x2="26"
          y2="24"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="25" cy="24" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <line
          x1="23.5"
          y1="22.5"
          x2="26.5"
          y2="25.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    label: 'No spam',
    sub: 'No unwanted calls',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="1.5" />
        <line
          x1="7"
          y1="7"
          x2="21"
          y2="21"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M10 14h3l1-3 1 6 1-3h2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: 'No hidden fees',
    sub: 'What you see is what you pay',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path
          d="M14 3l8 3.5V14c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V6.5L14 3z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M9 14l3 3 6-6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: '100% private',
    sub: 'Your data is safe',
  },
]

const HANDSHAKE_STEPS = [
  {
    step: '01',
    actor: 'Owner',
    label: 'Lists their property',
    description:
      'Real photos. Verified identity. Contact details stay completely private until the owner decides to share — with exactly the right person.',
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
    label: 'Reviews the buyer',
    description:
      'The owner can chat first to get to know the buyer, or accept and share contact right away — or decline. Entirely their call.',
  },
  {
    step: '04',
    actor: 'Owner',
    label: 'Chooses to connect',
    description:
      'One click to share contact, or keep chatting, or decline — the owner decides if and when to share. No payment. No pressure.',
  },
  {
    step: '05',
    actor: 'Both',
    label: 'Talk and close the deal',
    description:
      'A direct conversation on WhatsApp or phone — owner to buyer, no middleman. What you say, what you negotiate, is between the two of you.',
  },
]

const FAQ_ITEMS = [
  {
    question: 'Is ChapterNew a broker?',
    answer:
      'No — and that is the whole point. We are a platform, not a middleman. No ChapterNew person is involved in your negotiation, your price discussion, or your site visit. You deal directly with the owner. There are no fees at any step.',
  },
  {
    question: 'Is it really free? No hidden charges?',
    answer:
      'Yes — completely free for both buyers and owners. There is no platform fee, no commission, and no subscription. ChapterNew is free to use. The only thing we ask is that everyone verifies their identity before listing or connecting.',
  },
  {
    question: 'What if the owner does not respond after I send a request?',
    answer:
      'Owners are notified the moment you express interest. If they do not respond within 72 hours, the listing is flagged for our review. You can also report unresponsive listings directly — we follow up and take action.',
  },
  {
    question: 'How do I know the listing is still available and not already sold?',
    answer:
      'Owners are required to mark their listing as sold or remove it once a deal is done. Listings that stay live without activity are automatically flagged. If you suspect a ghost listing, report it — we investigate within 48 hours.',
  },
  {
    question: 'Can I negotiate the price directly with the owner?',
    answer:
      'Yes — completely. Once you are connected, everything between you and the owner is your business. We do not set prices, take a cut of the deal, or interfere in negotiations.',
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

// ─── Inline SVG illustrations ─────────────────────────────────────────────────

function WomanIllustration() {
  return (
    <svg
      viewBox="0 0 260 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      aria-hidden="true"
    >
      {/* Floor shadow */}
      <ellipse cx="120" cy="325" rx="70" ry="8" fill="#E8E0D8" />
      {/* Chair legs */}
      <rect x="58" y="248" width="8" height="60" rx="4" fill="#C4B5A5" />
      <rect x="158" y="248" width="8" height="60" rx="4" fill="#C4B5A5" />
      {/* Chair back */}
      <rect x="50" y="160" width="124" height="100" rx="22" fill="#E8D5C4" />
      {/* Chair seat */}
      <rect x="50" y="220" width="124" height="40" rx="16" fill="#DEC8B4" />
      {/* Chair arm left */}
      <rect x="42" y="190" width="16" height="52" rx="8" fill="#DEC8B4" />
      {/* Chair arm right */}
      <rect x="166" y="190" width="16" height="52" rx="8" fill="#DEC8B4" />
      {/* Body / torso */}
      <rect x="88" y="148" width="48" height="80" rx="14" fill="#F0EAE4" />
      {/* Top / shirt */}
      <rect x="84" y="152" width="56" height="52" rx="12" fill="#DCDCDC" />
      {/* Legs */}
      <path d="M96 228 Q90 270 80 290" stroke="#F0EAE4" strokeWidth="22" strokeLinecap="round" />
      <path d="M128 228 Q140 270 148 285" stroke="#F0EAE4" strokeWidth="20" strokeLinecap="round" />
      {/* Shoes */}
      <ellipse cx="78" cy="294" rx="16" ry="9" fill="#888" />
      <ellipse cx="150" cy="290" rx="14" ry="8" fill="#888" />
      {/* Neck */}
      <rect x="106" y="128" width="12" height="24" rx="6" fill="#F5DEC8" />
      {/* Head */}
      <ellipse cx="112" cy="110" rx="26" ry="30" fill="#F5DEC8" />
      {/* Hair */}
      <path
        d="M86 100 Q88 68 112 70 Q136 68 138 100 Q130 72 112 72 Q94 72 86 100z"
        fill="#5C3D2E"
      />
      <path d="M86 100 Q80 130 88 148" stroke="#5C3D2E" strokeWidth="10" strokeLinecap="round" />
      <path d="M138 100 Q132 138 126 148" stroke="#5C3D2E" strokeWidth="6" strokeLinecap="round" />
      {/* Face — eyes */}
      <ellipse cx="105" cy="112" rx="2.5" ry="3" fill="#3D2B1A" />
      <ellipse cx="119" cy="112" rx="2.5" ry="3" fill="#3D2B1A" />
      {/* Smile */}
      <path
        d="M107 122 Q112 127 117 122"
        stroke="#C08060"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right arm + phone */}
      <path d="M84 168 Q62 190 54 210" stroke="#F5DEC8" strokeWidth="18" strokeLinecap="round" />
      {/* Phone */}
      <rect x="36" y="204" width="26" height="40" rx="5" fill="#2D2D2D" />
      <rect x="39" y="208" width="20" height="30" rx="3" fill="#4A90D9" />
      {/* Left arm resting */}
      <path d="M140 168 Q155 185 163 195" stroke="#F5DEC8" strokeWidth="18" strokeLinecap="round" />
      {/* Plant pot */}
      <rect x="10" y="270" width="36" height="42" rx="6" fill="#B5A090" />
      <rect x="14" y="266" width="28" height="10" rx="3" fill="#A08070" />
      {/* Plant stem + leaves */}
      <line x1="28" y1="266" x2="28" y2="200" stroke="#7A9A5A" strokeWidth="3" />
      <ellipse cx="20" cy="224" rx="18" ry="10" fill="#8AAE5A" transform="rotate(-20 20 224)" />
      <ellipse cx="38" cy="210" rx="20" ry="9" fill="#6A9244" transform="rotate(15 38 210)" />
      <ellipse cx="16" cy="204" rx="16" ry="8" fill="#8AAE5A" transform="rotate(-10 16 204)" />
      <ellipse cx="40" cy="196" rx="14" ry="7" fill="#6A9244" transform="rotate(25 40 196)" />
      {/* Side table */}
      <rect x="170" y="248" width="56" height="6" rx="3" fill="#C4B5A5" />
      <rect x="182" y="254" width="6" height="44" rx="3" fill="#C4B5A5" />
      <rect x="208" y="254" width="6" height="44" rx="3" fill="#C4B5A5" />
      {/* Cup on table */}
      <rect x="188" y="232" width="18" height="18" rx="4" fill="#E8E0D8" />
      <path
        d="M206 238 Q212 238 212 244 Q212 250 206 250"
        stroke="#C4B5A5"
        strokeWidth="2"
        fill="none"
      />
      {/* Vase on table */}
      <ellipse cx="222" cy="250" rx="8" ry="4" fill="#B5A090" />
      <rect x="217" y="222" width="10" height="30" rx="5" fill="#C8B8A8" />
      {/* Small flowers */}
      <circle cx="222" cy="218" r="3" fill="#E88C6A" />
      <circle cx="217" cy="220" r="2.5" fill="#F0A882" />
      <circle cx="227" cy="219" r="2.5" fill="#E88C6A" />
    </svg>
  )
}

function ManIllustration() {
  return (
    <svg
      viewBox="0 0 260 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      aria-hidden="true"
    >
      {/* Floor shadow */}
      <ellipse cx="140" cy="325" rx="70" ry="8" fill="#E8E0D8" />
      {/* Chair */}
      <rect x="78" y="160" width="124" height="100" rx="22" fill="#E8D5C4" />
      <rect x="78" y="220" width="124" height="40" rx="16" fill="#DEC8B4" />
      <rect x="70" y="190" width="16" height="52" rx="8" fill="#DEC8B4" />
      <rect x="174" y="190" width="16" height="52" rx="8" fill="#DEC8B4" />
      {/* Chair legs */}
      <rect x="86" y="248" width="8" height="60" rx="4" fill="#C4B5A5" />
      <rect x="166" y="248" width="8" height="60" rx="4" fill="#C4B5A5" />
      {/* Body */}
      <rect x="108" y="148" width="44" height="80" rx="14" fill="#E8EEF8" />
      {/* Shirt collar detail */}
      <rect x="104" y="152" width="52" height="52" rx="12" fill="#D0DAF0" />
      {/* Legs */}
      <path d="M116 228 Q108 268 98 288" stroke="#F5DEC8" strokeWidth="24" strokeLinecap="round" />
      <path d="M144 228 Q154 268 162 285" stroke="#F5DEC8" strokeWidth="22" strokeLinecap="round" />
      {/* Shoes */}
      <ellipse cx="96" cy="292" rx="16" ry="9" fill="#555" />
      <ellipse cx="164" cy="290" rx="15" ry="8" fill="#555" />
      {/* Neck */}
      <rect x="118" y="128" width="14" height="22" rx="7" fill="#F0D4B8" />
      {/* Head */}
      <ellipse cx="125" cy="106" rx="27" ry="28" fill="#F0D4B8" />
      {/* Hair — short */}
      <path
        d="M98 100 Q100 72 125 72 Q150 72 152 100 Q148 78 125 78 Q102 78 98 100z"
        fill="#3D2820"
      />
      {/* Ears */}
      <ellipse cx="98" cy="108" rx="5" ry="7" fill="#F0D4B8" />
      <ellipse cx="152" cy="108" rx="5" ry="7" fill="#F0D4B8" />
      {/* Eyes */}
      <ellipse cx="118" cy="108" rx="2.5" ry="3" fill="#2D1A0A" />
      <ellipse cx="132" cy="108" rx="2.5" ry="3" fill="#2D1A0A" />
      {/* Smile — subtle */}
      <path
        d="M120 119 Q125 123 130 119"
        stroke="#C08060"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right arm — holding phone */}
      <path d="M152 168 Q170 190 178 212" stroke="#F0D4B8" strokeWidth="20" strokeLinecap="round" />
      {/* Phone */}
      <rect x="172" y="206" width="24" height="38" rx="5" fill="#2D2D2D" />
      <rect x="175" y="210" width="18" height="28" rx="3" fill="#4A90D9" />
      {/* Left arm resting on chair arm */}
      <path d="M108 168 Q90 188 78 198" stroke="#F0D4B8" strokeWidth="20" strokeLinecap="round" />
      {/* Pendant lamp */}
      <line x1="200" y1="0" x2="200" y2="40" stroke="#B8A898" strokeWidth="2" />
      <path d="M182 40 Q200 80 218 40z" fill="#D8CCBC" />
      <ellipse cx="200" cy="40" rx="18" ry="5" fill="#C8B8A8" />
      {/* Light glow circle */}
      <circle cx="200" cy="60" r="22" fill="#FFFAE0" opacity="0.5" />
      {/* Plant right side */}
      <rect x="214" y="270" width="36" height="42" rx="6" fill="#B5A090" />
      <rect x="218" y="266" width="28" height="10" rx="3" fill="#A08070" />
      <line x1="232" y1="266" x2="232" y2="200" stroke="#7A9A5A" strokeWidth="3" />
      <ellipse cx="224" cy="228" rx="18" ry="10" fill="#8AAE5A" transform="rotate(20 224 228)" />
      <ellipse cx="240" cy="214" rx="18" ry="9" fill="#6A9244" transform="rotate(-15 240 214)" />
      <ellipse cx="220" cy="208" rx="14" ry="7" fill="#8AAE5A" transform="rotate(10 220 208)" />
      <ellipse cx="244" cy="200" rx="14" ry="7" fill="#6A9244" transform="rotate(-25 244 200)" />
      {/* Side table left */}
      <rect x="18" y="246" width="56" height="6" rx="3" fill="#C4B5A5" />
      <rect x="28" y="252" width="6" height="46" rx="3" fill="#C4B5A5" />
      <rect x="54" y="252" width="6" height="46" rx="3" fill="#C4B5A5" />
      {/* Books on table */}
      <rect x="22" y="226" width="22" height="22" rx="2" fill="#A0B8D0" />
      <rect x="24" y="222" width="18" height="22" rx="2" fill="#C0D8F0" />
      <rect x="26" y="218" width="14" height="22" rx="2" fill="#90A8C0" />
    </svg>
  )
}

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
          Hero — full viewport height, centred layout, illustrations flanking
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="hero-heading"
        className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center overflow-hidden bg-[#FAF8F5] sm:min-h-[calc(100dvh-4rem)]"
      >
        {/* Illustrations — hidden on mobile, shown on lg+ */}
        <div className="pointer-events-none absolute inset-0 hidden lg:flex lg:items-end lg:justify-between">
          <div className="w-[280px] xl:w-[320px]">
            <WomanIllustration />
          </div>
          <div className="w-[280px] xl:w-[320px]">
            <ManIllustration />
          </div>
        </div>

        {/* Centre content */}
        <div className="relative z-10 flex flex-col items-center px-6 py-16 text-center sm:px-10">
          <FadeIn>
            <h1
              id="hero-heading"
              className="text-[clamp(2.4rem,6vw,5rem)] font-bold leading-[1.08] tracking-tight text-[#1A1A1A]"
            >
              A <span className="text-[#F86039]">better</span> way
              <br />
              to buy or sell a home.
            </h1>
          </FadeIn>

          <FadeIn delay={0.1}>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-[#6B6B6B] sm:text-xl">
              No brokers. No spam. Just real people
              <br className="hidden sm:block" />
              and real properties.
            </p>
          </FadeIn>

          {/* Dual CTA buttons */}
          <FadeIn delay={0.18}>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/properties"
                className="inline-flex h-14 w-full items-center justify-center rounded-full bg-[#1A1A1A] px-10 text-base font-semibold text-white transition-opacity hover:opacity-80 sm:w-auto"
              >
                I want to buy
              </Link>
              <Link
                href="/sell"
                className="inline-flex h-14 w-full items-center justify-center rounded-full border-2 border-[#1A1A1A] bg-transparent px-10 text-base font-semibold text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white sm:w-auto"
              >
                I want to sell
              </Link>
            </div>
          </FadeIn>

          {/* Pill search bar */}
          <FadeIn delay={0.26}>
            <form
              action="/properties"
              method="get"
              className="mt-8 flex w-full max-w-xl overflow-hidden rounded-full border border-[#E0D8D0] bg-white shadow-sm"
            >
              <div className="flex flex-1 items-center gap-3 pl-5">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  className="shrink-0 text-[#9A9A9A]"
                  aria-hidden="true"
                >
                  <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                  <line
                    x1="11.5"
                    y1="11.5"
                    x2="16"
                    y2="16"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  type="text"
                  name="q"
                  placeholder="Search by city — Mumbai, Pune, Delhi..."
                  aria-label="Search by city"
                  className="h-14 flex-1 bg-transparent text-sm text-[#1A1A1A] placeholder:text-[#9A9A9A] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="m-1.5 inline-flex h-11 items-center gap-2 rounded-full bg-[#1A1A1A] px-7 text-sm font-semibold text-white transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A] focus-visible:ring-offset-2 sm:px-8"
              >
                Search
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path
                    d="M2 7h10M8 3l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </form>
          </FadeIn>
        </div>

        {/* Trust bar — pinned to bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-[#E8E0D8] bg-[#FAF8F5]">
          <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-[#E8E0D8] md:grid-cols-4">
            {TRUST_BAR.map(({ icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3 px-6 py-4 sm:px-8 sm:py-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0EAE4] text-[#5C5C5C]">
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{label}</p>
                  <p className="text-xs text-[#8A8A8A]">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          How it works
      ══════════════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="how-heading" className="bg-[#1A1A1A] px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-3xl">
          <FadeIn>
            <h2
              id="how-heading"
              className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-tight tracking-tight text-white"
            >
              How it works — for
              <br />
              both <span className="text-[#F86039]">sides.</span>
            </h2>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-white/50">
              Owners stay in full control. Buyers connect directly — no fees, no middlemen.
            </p>
          </FadeIn>

          <ol className="relative mt-14 space-y-0" aria-label="How ChapterNew works">
            {HANDSHAKE_STEPS.map(({ step, actor, label, description }, idx) => (
              <Reveal key={step} delay={idx * 0.09} y={16}>
                <li className="relative flex gap-8 pb-12 last:pb-0">
                  {idx < HANDSHAKE_STEPS.length - 1 && (
                    <div
                      className="absolute bottom-0 left-[19px] top-10 w-px bg-white/10"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[#2A2A2A] text-xs font-bold tabular-nums text-white">
                    {step}
                  </div>
                  <div className="pt-1.5">
                    <span className="bg-white/8 mb-2 inline-block rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                      {actor}
                    </span>
                    <h3 className="text-lg font-semibold text-white sm:text-xl">{label}</h3>
                    <p className="mt-2 max-w-lg text-base leading-relaxed text-white/50">
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
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[#1A1A1A] transition-opacity hover:opacity-90"
              >
                List Your Property Free
              </Link>
              <Link
                href="/properties"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-3.5 text-sm font-semibold text-white/70 transition-all hover:border-white/50 hover:text-white"
              >
                Search Homes
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="faq-heading" className="bg-[#FAF8F5] px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-3xl">
          <Reveal y={20}>
            <h2
              id="faq-heading"
              className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-tight tracking-tight text-[#1A1A1A]"
            >
              Common <span className="text-[#F86039]">questions.</span>
            </h2>
          </Reveal>
          <Stagger className="mt-12 divide-y divide-[#E8E0D8]" stagger={0.09} y={12}>
            {FAQ_ITEMS.map(({ question, answer }) => (
              <FAQItem key={question} question={question} answer={answer} />
            ))}
          </Stagger>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Cities
      ══════════════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="cities-heading" className="bg-white px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-4xl">
          <FadeIn>
            <h2
              id="cities-heading"
              className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-tight tracking-tight text-[#1A1A1A]"
            >
              Browse by <span className="text-[#F86039]">city.</span>
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[#6B6B6B]">
              Verified owner listings — no brokers, no fake posts — across India&apos;s major
              cities.
            </p>
          </FadeIn>

          <Stagger className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3" stagger={0.06} y={20}>
            {CITIES_GRID.map((city) => (
              <Link
                key={city.name}
                href={city.href}
                className="group flex items-center justify-between rounded-2xl border border-[#E8E0D8] bg-[#FAF8F5] p-6 transition-colors hover:border-[#F86039]"
              >
                <div>
                  <p className="text-lg font-semibold text-[#1A1A1A]">{city.name}</p>
                  <p className="mt-0.5 text-sm text-[#9A9A9A]">{city.state}</p>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="text-[#9A9A9A] transition-colors group-hover:text-[#F86039]"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          Final CTA — persona split
      ══════════════════════════════════════════════════════════════════════ */}
      <section aria-label="Get started" className="bg-[#1A1A1A] px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-4xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Reveal x={-24} y={0} className="h-full">
              <div className="flex h-full flex-col gap-6 rounded-3xl border border-white/10 p-10">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/30">
                  For buyers
                </p>
                <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-tight text-white">
                  Looking for a <span className="text-[#F86039]">home?</span>
                </h2>
                <p className="text-base leading-relaxed text-white/50">
                  Browse verified owner listings in your city — no broker calls, no number leaks.
                </p>
                <Link
                  href="/properties"
                  className="mt-auto inline-flex items-center gap-2 self-start rounded-full border border-white/20 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:border-white/50 hover:bg-white/5"
                >
                  Search Homes
                </Link>
              </div>
            </Reveal>
            <Reveal x={24} y={0} delay={0.06} className="h-full">
              <div className="bg-white/8 flex h-full flex-col gap-6 rounded-3xl p-10">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/30">
                  For sellers
                </p>
                <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-tight text-white">
                  Selling your <span className="text-[#F86039]">property?</span>
                </h2>
                <p className="text-base leading-relaxed text-white/50">
                  List in minutes, free. We verify it. Serious buyers come to you — no broker taking
                  a cut.
                </p>
                <Link
                  href="/sell"
                  className="mt-auto inline-flex items-center gap-2 self-start rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[#1A1A1A] transition-opacity hover:opacity-90"
                >
                  List Your Property Free
                </Link>
              </div>
            </Reveal>
          </div>

          <FadeIn delay={0.2}>
            <p className="mt-14 text-center text-sm text-white/30">
              Questions? Email us at{' '}
              <a
                href="mailto:support@chapternew.com"
                className="text-white/50 underline underline-offset-4 hover:text-white"
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
