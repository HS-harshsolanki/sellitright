import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Read the terms and conditions governing your use of ChapterNew.',
}

const SECTIONS = [
  {
    id: '1',
    title: 'Acceptance of terms',
    body: 'By accessing or using ChapterNew, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use our platform. We reserve the right to update these terms at any time, and continued use of the platform constitutes your acceptance of any changes.',
  },
  {
    id: '2',
    title: 'Use of the platform',
    body: 'ChapterNew provides a marketplace for property listings in India. You agree to use the platform only for lawful purposes and in a manner that does not infringe the rights of others. You are responsible for ensuring that all information you submit, including property details and photographs, is accurate, truthful, and does not violate any third-party rights.',
  },
  {
    id: '3',
    title: 'User accounts',
    body: 'To create listings you must register using a Google account. You may optionally add a phone number to your profile after registration. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. ChapterNew reserves the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity.',
  },
  {
    id: '4',
    title: 'Listings and content',
    body: "All listings are subject to review and approval. ChapterNew may reject or remove any listing that does not meet our quality standards, contains inaccurate information, or violates applicable laws. You retain ownership of the content you submit but grant ChapterNew a non-exclusive, royalty-free licence to display and distribute it in connection with the platform's services.",
  },
  {
    id: '5',
    title: 'Payment and refunds',
    /* PAYMENT_DISABLED — was: ₹99 connection fee terms */
    body: 'ChapterNew is currently a free platform. No fees are charged to buyers or owners at any step. If paid features are introduced in the future, this section will be updated with full payment, billing, and refund terms before any charge is made.',
  },
  {
    id: '6',
    title: 'Governing law and jurisdiction',
    body: 'These Terms are governed by and construed in accordance with the laws of India. Any disputes arising out of or relating to these Terms or your use of the Platform shall be subject to the exclusive jurisdiction of the courts of Mumbai, Maharashtra, India.',
  },
  {
    id: '7',
    title: 'Dispute resolution',
    body: 'Before initiating formal legal proceedings, users agree to attempt resolution by emailing support@chapternew.com with "Dispute" in the subject line. We will respond within 15 business days. If unresolved, disputes may be referred to the Grievance Officer at grievance@chapternew.com as required under the DPDP Act, 2023.',
  },
  {
    id: '8',
    title: 'Limitation of liability',
    body: 'ChapterNew is not a party to any transaction between buyers and sellers and makes no warranties regarding the accuracy of listings or the conduct of users. To the fullest extent permitted by law, ChapterNew shall not be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of the platform, even if we have been advised of the possibility of such damages.',
  },
]

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* Hero */}
      <div className="mb-10 border-b border-[var(--color-border)] pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl">
          Terms of Service
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
      </div>

      {/* Footer note */}
      <div className="mt-12 rounded-xl border border-[var(--color-border)] px-5 py-4 text-sm text-[var(--color-muted-foreground)]">
        Questions about these terms?{' '}
        <Link
          href="/contact"
          className="font-medium text-[var(--color-foreground)] underline underline-offset-2 transition-opacity hover:opacity-70"
        >
          Contact us
        </Link>
        . Also see our{' '}
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
