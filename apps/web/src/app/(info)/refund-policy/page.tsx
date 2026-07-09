import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Refund Policy | ChapterNew',
  description: 'Understand when and how ChapterNew issues refunds for the ₹99 connection fee.',
}

const SECTIONS = [
  {
    id: '1',
    title: 'What we charge',
    body: "A one-time ₹99 connection fee is charged when a buyer pays to unlock a seller's contact details. This fee is charged only after the seller has explicitly accepted the buyer's request — you are never charged for a request that is still pending or that the seller has declined.",
  },
  {
    id: '2',
    title: 'When you get a full refund',
    body: null,
    list: [
      'The listing was deactivated or removed within 24 hours of your payment.',
      "The seller's contact details we provided are incorrect or unreachable.",
      'A technical error prevented your contact details from being delivered.',
    ],
    listNote:
      'Eligible refunds are processed automatically within 5 business days back to your original payment method.',
  },
  {
    id: '3',
    title: 'How to request a refund',
    body: 'Email support@chapternew.com with your payment ID (found in your email receipt) and a brief description of the issue. We respond within 2 business days. If your case qualifies under the criteria above, we will initiate the refund without requiring further documentation.',
  },
  {
    id: '4',
    title: 'Non-refundable cases',
    body: 'Refunds are not available if you changed your mind after successfully receiving working contact details. We provide the connection — the outcome of that conversation is between you and the seller. If a seller does not respond, please contact us and we will review the case.',
  },
  {
    id: '5',
    title: 'Pricing and taxes',
    body: 'The ₹99 connection fee is the total amount charged to you. GST (if applicable) is included in this amount. We will provide a tax invoice on request. Our GSTIN will be published here once obtained.',
  },
  {
    id: '6',
    title: 'Grievance Officer',
    body: 'For complaints related to payments, refunds, or service quality under the Consumer Protection Act 2019, contact our Grievance Officer: Name: Harsh Solanki, Designation: Founder, Email: grievance@chapternew.com, Address: ChapterNew Internet Services, India (full postal address available on request at grievance@chapternew.com). We will acknowledge your complaint within 48 hours and resolve it within 30 days.',
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
        {SECTIONS.map(({ id, title, body, list, listNote }) => (
          <section key={id} id={`section-${id}`} className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              {id}. {title.charAt(0).toUpperCase() + title.slice(1)}
            </h2>
            {body && (
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                {body}
              </p>
            )}
            {list && (
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                {list.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-muted-foreground)]" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
            {listNote && (
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                {listNote}
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
