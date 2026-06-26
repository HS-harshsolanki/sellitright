import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact — SellItRight',
  description: 'Get in touch with the SellItRight team for support, feedback, or to report a listing.',
}

const TOPICS = [
  {
    title: 'General support',
    body: 'Questions about your account, a listing, or how the platform works?',
    email: 'support@sellitright.in',
    cta: 'Email support',
  },
  {
    title: 'Report a listing',
    body: 'Spotted something fraudulent or inaccurate? Send us the listing URL and a brief description. We act within 24 hours.',
    email: 'support@sellitright.in',
    cta: 'Report a listing',
  },
  {
    title: 'Privacy requests',
    body: 'To access, correct, or delete your personal data, reach out to our privacy team.',
    email: 'privacy@sellitright.in',
    cta: 'Privacy request',
  },
]

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">

      {/* Hero */}
      <div className="mb-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">Contact</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl">
          We&apos;re here to help
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--color-muted-foreground)]">
          We read every message and aim to respond within one business day. Choose the topic that best fits your question below.
        </p>
      </div>

      {/* Topic cards */}
      <section className="mb-12 space-y-4">
        {TOPICS.map(({ title, body, email, cta }) => (
          <div key={title} className="rounded-xl border border-[var(--color-border)] p-5">
            <p className="font-semibold text-[var(--color-foreground)]">{title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">{body}</p>
            <a
              href={`mailto:${email}?subject=${encodeURIComponent(cta + ' — SellItRight')}`}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-foreground)] underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              {cta}
              <span aria-hidden="true">→</span>
            </a>
          </div>
        ))}
      </section>

      {/* Response time note */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] px-5 py-4 text-sm text-[var(--color-muted-foreground)]">
        <span className="font-medium text-[var(--color-foreground)]">Response times:</span> General support within 1 business day. Listing reports within 24 hours. Privacy requests within 30 days as required by applicable law.
      </div>

      {/* Back to browsing */}
      <p className="mt-8 text-sm text-[var(--color-muted-foreground)]">
        Looking for a property?{' '}
        <Link href="/" className="font-medium text-[var(--color-foreground)] underline underline-offset-2 hover:opacity-70 transition-opacity">
          Browse listings →
        </Link>
      </p>
    </div>
  )
}
