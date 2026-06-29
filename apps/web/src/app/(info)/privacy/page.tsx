import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Learn how SellItRight collects, uses, and protects your personal information.',
}

const SECTIONS = [
  {
    id: '1',
    title: 'Information we collect',
    body: "We collect information you provide directly — your mobile number, name, and property listing details. We also automatically collect technical data including your IP address, browser type, and usage patterns when you interact with the platform. This information is used solely to operate and improve SellItRight's services.",
  },
  {
    id: '2',
    title: 'How we use your information',
    body: 'Your information is used to provide and personalise our services, verify user identity, process listings, facilitate communication between buyers and sellers, and comply with legal obligations. We do not sell your personal data to third parties. We may share data with trusted service providers who assist us in operating the platform, subject to strict confidentiality obligations.',
  },
  {
    id: '3',
    title: 'Data storage and security',
    body: 'All data is stored on servers located in India or other jurisdictions with adequate data protection standards. We implement industry-standard security measures including encryption, access controls, and regular audits to protect your personal information from unauthorised access, alteration, or disclosure. No method of transmission over the internet is completely secure.',
  },
  {
    id: '4',
    title: 'Your rights',
    body: 'You have the right to access, correct, or delete your personal data held by us. You may also object to processing or request that we restrict how we use your data. To exercise any of these rights, please contact us at privacy@sellitright.in. We will respond to all valid requests within 30 days in accordance with applicable data protection laws.',
  },
  {
    id: '5',
    title: 'Cookies and tracking',
    body: 'SellItRight uses cookies and similar technologies to maintain your session, remember your preferences, and gather analytics about platform usage. You can control cookie settings through your browser preferences. Disabling cookies may affect the functionality of certain features. We do not use cookies to serve third-party advertising or track you across other websites.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* Hero */}
      <div className="mb-10 border-b border-[var(--color-border)] pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">Last updated: June 2026</p>
      </div>

      {/* Table of contents */}
      <nav
        className="mb-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] px-5 py-4"
        aria-label="Table of contents"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
          Contents
        </p>
        <ol className="space-y-1.5">
          {SECTIONS.map(({ id, title }) => (
            <li key={id}>
              <a
                href={`#section-${id}`}
                className="text-sm text-[var(--color-foreground)] underline-offset-2 transition-opacity hover:underline hover:opacity-70"
              >
                {id}. {title.charAt(0).toUpperCase() + title.slice(1)}
              </a>
            </li>
          ))}
          <li>
            <a
              href="#section-6"
              className="text-sm text-[var(--color-foreground)] underline-offset-2 transition-opacity hover:underline hover:opacity-70"
            >
              6. Data processors
            </a>
          </li>
          <li>
            <a
              href="#section-7"
              className="text-sm text-[var(--color-foreground)] underline-offset-2 transition-opacity hover:underline hover:opacity-70"
            >
              7. How long we retain data
            </a>
          </li>
        </ol>
      </nav>

      {/* Sections */}
      <div className="space-y-10">
        {SECTIONS.map(({ id, title, body }) => (
          <section key={id} id={`section-${id}`} className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              {id}. {title.charAt(0).toUpperCase() + title.slice(1)}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              {body}
            </p>
          </section>
        ))}
        {/* Section 6 — Data processors */}
        <section id="section-6" className="scroll-mt-20">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            6. Data processors
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            We share data with the following service providers who process data on our behalf:
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            <li>
              <span className="font-medium text-[var(--color-foreground)]">
                Supabase (Singapore/EU)
              </span>{' '}
              — database hosting, authentication, and file storage. Data may be replicated to AWS
              infrastructure.{' '}
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 transition-opacity hover:opacity-70"
              >
                Supabase Privacy Policy
              </a>
            </li>
            <li>
              <span className="font-medium text-[var(--color-foreground)]">Razorpay (India)</span> —
              payment processing. Only payment identifiers (order IDs) are stored on our servers;
              full card details are never stored.{' '}
              <a
                href="https://razorpay.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 transition-opacity hover:opacity-70"
              >
                Razorpay Privacy Policy
              </a>
            </li>
          </ul>
        </section>

        {/* Section 7 — Retention */}
        <section id="section-7" className="scroll-mt-20">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            7. How long we retain data
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            <li>
              <span className="font-medium text-[var(--color-foreground)]">
                Account information:
              </span>{' '}
              retained until account deletion or 3 years of inactivity
            </li>
            <li>
              <span className="font-medium text-[var(--color-foreground)]">Listing data:</span>{' '}
              retained for 7 years for legal/tax purposes even after deletion (content anonymised on
              request)
            </li>
            <li>
              <span className="font-medium text-[var(--color-foreground)]">Payment records:</span>{' '}
              retained for 8 years as required by Indian financial regulations
            </li>
            <li>
              <span className="font-medium text-[var(--color-foreground)]">Activity logs:</span>{' '}
              retained for 90 days then automatically deleted
            </li>
            <li>
              <span className="font-medium text-[var(--color-foreground)]">Notifications:</span>{' '}
              retained for 6 months
            </li>
          </ul>
        </section>
      </div>

      {/* Contact */}
      <div className="mt-12 rounded-xl border border-[var(--color-border)] px-5 py-4 text-sm text-[var(--color-muted-foreground)]">
        Questions about this policy?{' '}
        <a
          href="mailto:privacy@sellitright.in"
          className="font-medium text-[var(--color-foreground)] underline underline-offset-2 transition-opacity hover:opacity-70"
        >
          privacy@sellitright.in
        </a>{' '}
        or visit our{' '}
        <Link
          href="/contact"
          className="font-medium text-[var(--color-foreground)] underline underline-offset-2 transition-opacity hover:opacity-70"
        >
          Contact page
        </Link>
        .
      </div>
    </div>
  )
}
