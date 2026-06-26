'use client'

import Link from 'next/link'
import { useState } from 'react'
import { MessageSquare, ShieldCheck, User, Clock, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RequestContactModal } from '@/components/listing/request-contact-modal'
import type { MockSeller } from '@/lib/mock-data'

interface ContactSellerProps {
  seller: MockSeller
  listingId: string
  listingTitle: string
  isAuthenticated?: boolean
  /** Pre-hydrated from server: buyer already has a pending request */
  hasExistingRequest?: boolean
  /** Viewer is the seller — hide the contact CTA */
  isOwner?: boolean
  price?: string
  statsLine?: string
}

export function ContactSeller({
  seller,
  listingId,
  listingTitle,
  isAuthenticated = false,
  hasExistingRequest = false,
  isOwner = false,
  price,
  statsLine,
}: ContactSellerProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [requested, setRequested] = useState(hasExistingRequest)

  function handleModalChange(open: boolean) {
    setModalOpen(open)
  }

  function handleRequestSuccess() {
    setRequested(true)
    setModalOpen(false)
  }

  function handleWithdraw() {
    setRequested(false)
    setModalOpen(false)
  }

  return (
    <>
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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)]">
            <User className="h-5 w-5 text-[var(--color-muted-foreground)]" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
              {/* Seller name visible — seller's contact details hidden until handshake */}
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

        {isOwner ? (
          /* Owner viewing their own listing */
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3 text-center">
            <p className="text-sm font-medium text-[var(--color-foreground)]">
              This is your listing
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
              Manage it from your{' '}
              <Link
                href="/dashboard"
                className="underline underline-offset-2 transition-opacity hover:opacity-70"
              >
                Dashboard
              </Link>
            </p>
          </div>
        ) : !isAuthenticated ? (
          /* Unauthenticated — prompt to sign in */
          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3 text-center text-sm text-[var(--color-muted-foreground)]">
              Sign in to contact the seller
            </div>
            <Button
              asChild
              className="h-12 w-full rounded-xl bg-[var(--color-foreground)] font-semibold text-[var(--color-background)] hover:opacity-90"
            >
              <Link href={`/login?next=/listing/${listingId}`}>Sign in to Request Contact</Link>
            </Button>
          </div>
        ) : requested ? (
          /* Already has a pending request */
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-green-800">Request sent</p>
                <p className="text-xs text-green-700">The seller will reach out to you soon.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="w-full rounded-xl border border-[var(--color-border)] py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              View / update request
            </button>
          </div>
        ) : (
          /* Authenticated, no pending request */
          <Button
            type="button"
            onClick={() => setModalOpen(true)}
            className="h-12 w-full rounded-xl bg-[var(--color-foreground)] font-semibold text-[var(--color-background)] hover:opacity-90"
          >
            <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
            Request Contact
          </Button>
        )}

        {/* ── Trust signal — hidden for owner ── */}
        {!isOwner && (
          <div className="mt-4 flex items-center justify-center gap-1.5">
            <Clock
              className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
              aria-hidden="true"
            />
            <p className="text-center text-xs text-[var(--color-muted-foreground)]">
              Usually responds within 1 hour · No brokerage
            </p>
          </div>
        )}
      </section>

      <RequestContactModal
        open={modalOpen}
        onOpenChange={handleModalChange}
        onSuccess={handleRequestSuccess}
        onWithdraw={handleWithdraw}
        viewExisting={requested}
        listingId={listingId}
        listingTitle={listingTitle}
      />
    </>
  )
}
