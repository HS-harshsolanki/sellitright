import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Refund Policy | ChapterNew',
  description: 'ChapterNew is a free platform — there are no fees and nothing to refund.',
}

const SECTIONS = [
  {
    id: '1',
    title: 'ChapterNew is a free platform',
    body: 'ChapterNew does not charge buyers or owners any fee to list, search, express interest, or connect. There is no connection fee, no subscription, and no commission. Using ChapterNew costs nothing.',
  },
  {
    id: '2',
    title: 'Nothing to refund',
    body: 'Because no payment is ever collected from users, there is nothing to refund. If paid features are introduced in the future, this policy will be updated with full refund terms before any charge is made.',
  },
  {
    id: '3',
    title: 'Contact us',
    body: 'If you believe you were charged in error or have a question about this policy, email us at support@chapternew.com. We respond within 2 business days.',
  },
  {
    id: '4',
    title: 'Grievance Officer',
    body: 'For complaints related to service quality under the Consumer Protection Act 2019, contact our Grievance Officer: Designation: Compliance Team, Email: support@chapternew.com, Address: ChapterNew Internet Services, India (full postal address available on request at support@chapternew.com). We will acknowledge your complaint within 48 hours and resolve it within 30 days.',
  },
]

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* Hero */}
      <div className="mb-10 border-b border-[var(--color-border)] pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl">
          Refund Policy
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          Effective date: 28 June 2026
        </p>
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
        </ol>
      </nav>

      {/* Sections */}
      <div className="space-y-10">
        {SECTIONS.map(({ id, title, body }) => (
          <section key={id} id={`section-${id}`} className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              {id}. {title.charAt(0).toUpperCase() + title.slice(1)}
            </h2>
            {body && (
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                {body}
              </p>
            )}
          </section>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-12 rounded-xl border border-[var(--color-border)] px-5 py-4 text-sm text-[var(--color-muted-foreground)]">
        Questions about a refund? Email us at{' '}
        <a
          href="mailto:support@chapternew.com"
          className="font-medium text-[var(--color-foreground)] underline underline-offset-2 transition-opacity hover:opacity-70"
        >
          support@chapternew.com
        </a>
        . Also see our{' '}
        <Link
          href="/terms"
          className="font-medium text-[var(--color-foreground)] underline underline-offset-2 transition-opacity hover:opacity-70"
        >
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link
          href="/privacy"
          className="font-medium text-[var(--color-foreground)] underline underline-offset-2 transition-opacity hover:opacity-70"
        >
          Privacy Policy
        </Link>
        .
      </div>
    </div>
  )
}
