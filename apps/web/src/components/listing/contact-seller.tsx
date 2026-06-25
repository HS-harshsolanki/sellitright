'use client'

import Link from 'next/link'
import { Phone, ShieldCheck, User, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { maskPhone } from '@/lib/format'
import type { MockSeller } from '@/lib/mock-data'

interface ContactSellerProps {
  seller: MockSeller
  /** Pass true once real auth is wired up */
  isAuthenticated?: boolean
  /** Formatted price string — displayed prominently at top of card */
  price?: string
  /** Quick stats line shown below price, e.g. "3 BHK · 1,450 sq ft · 7th floor" */
  statsLine?: string
}

export function ContactSeller({
  seller,
  isAuthenticated = false,
  price,
  statsLine,
}: ContactSellerProps) {
  return (
    <section
      aria-labelledby="contact-heading"
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 shadow-lg"
    >
      {/* ── Price block ── */}
      {price && (
        <div className="mb-6 border-b border-[var(--color-border)] pb-5">
          <p className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            {price}
          </p>
          {statsLine && (
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{statsLine}</p>
          )}
        </div>
      )}

      {/* ── Seller identity block ── */}
      <div className="mb-5 flex items-center gap-3">
        {/* Avatar */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)]">
          <User className="h-5 w-5 text-[var(--color-muted-foreground)]" aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
            {seller.name}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            {seller.isVerified ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                <span className="text-xs font-medium text-emerald-600">Verified owner</span>
              </>
            ) : (
              <span className="text-xs text-[var(--color-muted-foreground)]">Property owner</span>
            )}
          </div>
        </div>
      </div>

      {/* ── CTA block ── */}
      <h2 id="contact-heading" className="sr-only">
        Contact seller
      </h2>

      {isAuthenticated ? (
        <a
          href={`tel:${seller.phone}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-foreground)] px-4 py-3.5 text-sm font-semibold text-[var(--color-background)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          {seller.phone}
        </a>
      ) : (
        <div className="space-y-3">
          {/* Blurred phone preview */}
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3">
            <Phone className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden="true" />
            <span
              className="select-none text-sm font-medium text-[var(--color-foreground)] blur-sm"
              aria-hidden="true"
            >
              {maskPhone(seller.phone)}
            </span>
          </div>

          <Button
            asChild
            className="h-12 w-full rounded-xl bg-[var(--color-foreground)] text-[var(--color-background)] font-semibold hover:opacity-90"
          >
            <Link href="/login">Contact Seller</Link>
          </Button>
        </div>
      )}

      {/* ── Trust signal ── */}
      <div className="mt-4 flex items-center gap-1.5 justify-center">
        <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden="true" />
        <p className="text-xs text-center text-[var(--color-muted-foreground)]">
          Usually responds within 1 hour · No brokerage
        </p>
      </div>
    </section>
  )
}
