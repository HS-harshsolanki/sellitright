import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about ChapterNew — our mission, how the platform works, and why owners choose us to sell their properties.',
}

const PILLARS = [
  {
    title: 'Direct owners only',
    body: 'No brokers, no middlemen. Every listing comes from the person who actually owns the property, so buyers talk to the right person from day one.',
  },
  {
    title: 'Verified listings',
    body: 'Our team reviews every submission before it goes live. You browse with confidence knowing each listing has passed a quality and accuracy check.',
  },
  {
    title: 'Zero commission',
    body: 'Sellers pay nothing to list. Buyers pay nothing to contact a seller. We keep the platform free so the full value of a transaction stays with the people involved.',
  },
]

const STEPS = [
  {
    step: '01',
    title: 'List your property',
    body: 'Add photos, set a price, and describe your property. The whole process takes under ten minutes.',
  },
  {
    step: '02',
    title: 'We review it',
    body: 'Our moderation team checks every listing before it appears in search results — usually within a few hours.',
  },
  {
    step: '03',
    title: 'Buyers reach out',
    body: 'Interested buyers send a contact request with their intent and timeline. You choose who to respond to.',
  },
  {
    step: '04',
    title: 'Close the deal',
    body: 'Connect directly with your chosen buyer, arrange a site visit, and take it from there — on your own terms.',
  },
]

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* Hero */}
      <div className="mb-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
          About
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl">
          Property transactions that work for real people
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--color-muted-foreground)]">
          ChapterNew was built to cut out the noise in Indian real estate — the cold calls, the
          broker markups, the listings that go nowhere. We connect property owners directly with
          buyers across every city in India.
        </p>
      </div>

      {/* Mission pillars */}
      <section className="mb-12">
        <h2 className="mb-6 text-xl font-semibold text-[var(--color-foreground)]">
          What we stand for
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PILLARS.map(({ title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] p-5"
            >
              <p className="font-semibold text-[var(--color-foreground)]">{title}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mb-12">
        <h2 className="mb-6 text-xl font-semibold text-[var(--color-foreground)]">How it works</h2>
        <ol className="space-y-5">
          {STEPS.map(({ step, title, body }) => (
            <li key={step} className="flex gap-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-foreground)] text-xs font-bold text-[var(--color-primary-foreground)]">
                {step}
              </span>
              <div>
                <p className="font-semibold text-[var(--color-foreground)]">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* CTA */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] px-6 py-6 text-center">
        <p className="font-semibold text-[var(--color-foreground)]">Ready to list your property?</p>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          It takes less than 10 minutes and it&apos;s completely free.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/sell"
            className="inline-flex items-center justify-center rounded-lg bg-[var(--color-foreground)] px-5 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90"
          >
            List your property
          </Link>
          <Link
            href="/properties"
            className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-white"
          >
            Browse listings
          </Link>
        </div>
      </div>
    </div>
  )
}
