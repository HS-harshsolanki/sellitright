import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with the ChapterNew team for support, feedback, or to report a listing.',
}

const TOPICS = [
  {
    title: 'General support',
    body: 'Questions about your account, a listing, or how the platform works?',
    email: 'support@chapternew.com',
    cta: 'Email support',
  },
  {
    title: 'Report a listing',
    body: 'Spotted something fraudulent or inaccurate? Send us the listing URL and a brief description. We act within 24 hours.',
    email: 'support@chapternew.com',
    cta: 'Report a listing',
  },
  {
    title: 'Privacy requests',
    body: 'To access, correct, or delete your personal data, reach out to our privacy team.',
    email: 'privacy@chapternew.com',
    cta: 'Privacy request',
  },
]

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* Hero */}
      <div className="mb-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
          Contact
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl">
          We&apos;re here to help
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--color-muted-foreground)]">
          We read every message and aim to respond within one business day. Choose the topic that
          best fits your question below.
        </p>
      </div>

      {/* Topic cards */}
      <section className="mb-12 space-y-4">
        {TOPICS.map(({ title, body, email, cta }) => (
          <div key={title} className="rounded-xl border border-[var(--color-border)] p-5">
            <p className="font-semibold text-[var(--color-foreground)]">{title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              {body}
            </p>
            <a
              href={`mailto:${email}?subject=${encodeURIComponent(cta + ' — ChapterNew')}`}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-foreground)] underline underline-offset-2 transition-opacity hover:opacity-70"
            >
              {cta}
              <span aria-hidden="true">→</span>
            </a>
          </div>
        ))}
      </section>

      {/* Grievance Officer — DPDP Section 13 */}
      <section className="mb-12 rounded-xl border border-[var(--color-border)] p-5">
        <p className="font-semibold text-[var(--color-foreground)]">Grievance Officer</p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          In accordance with the Digital Personal Data Protection Act 2023, a Grievance Officer has
          been appointed to address data privacy complaints:
        </p>
        <address className="mt-3 text-sm not-italic leading-relaxed text-[var(--color-muted-foreground)]">
          <span className="font-medium text-[var(--color-foreground)]">
            Grievance Officer: The Compliance Team
          </span>
          <br />
          ChapterNew
          <br />
          Email:{' '}
          <a
            href="mailto:support@chapternew.com?subject=Data%20Grievance"
            className="font-medium text-[var(--color-foreground)] underline underline-offset-2 transition-opacity hover:opacity-70"
          >
            support@chapternew.com
          </a>
          <br />
          Response time: Within 30 days of receipt
        </address>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          To raise a grievance related to your personal data, please email with the subject line
          &ldquo;Data Grievance&rdquo; and include your registered email address and a description
          of the concern.
        </p>
      </section>

      {/* Response time note */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] px-5 py-4 text-sm text-[var(--color-muted-foreground)]">
        <span className="font-medium text-[var(--color-foreground)]">Response times:</span> General
        support within 1 business day. Listing reports within 24 hours. Privacy requests within 30
        days as required by applicable law.
      </div>

      {/* Back to browsing */}
      <p className="mt-8 text-sm text-[var(--color-muted-foreground)]">
        Looking for a property?{' '}
        <Link
          href="/"
          className="font-medium text-[var(--color-foreground)] underline underline-offset-2 transition-opacity hover:opacity-70"
        >
          Browse listings →
        </Link>
      </p>
    </div>
  )
}
