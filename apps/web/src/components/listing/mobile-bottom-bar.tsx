'use client'

import { MessageSquare, CheckCircle2, Phone, Lock } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { RequestContactModal } from '@/components/listing/request-contact-modal'
import { UnlockContactSection } from '@/components/listing/unlock-contact-section'

interface MobileBottomBarProps {
  price: string
  listingTitle: string
  listingId: string
  isAuthenticated: boolean
  hasExistingRequest?: boolean
  isOwner?: boolean
  interestId?: string | null
  interestStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | null
  contactUnlocked?: boolean
  sellerPhone?: string | null
  listingStatus?: string | null
}

export function MobileBottomBar({
  price,
  listingTitle,
  listingId,
  isAuthenticated,
  hasExistingRequest = false,
  isOwner = false,
  interestId = null,
  interestStatus = null,
  contactUnlocked = false,
  sellerPhone = null,
  listingStatus = null,
}: MobileBottomBarProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [unlockSheetOpen, setUnlockSheetOpen] = useState(false)
  const [requested, setRequested] = useState(hasExistingRequest)
  const [localUnlocked, setLocalUnlocked] = useState(contactUnlocked)
  const [localPhone, setLocalPhone] = useState<string | null>(sellerPhone)

  return (
    <>
      <div
        className="bg-[var(--color-background)]/95 pb-safe fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 border-t border-[var(--color-border)] px-4 py-4 backdrop-blur-sm lg:hidden"
        aria-label="Contact seller bar"
      >
        {/* Price + title */}
        <div className="min-w-0">
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">{listingTitle}</p>
          <p className="mt-0.5 text-lg font-bold leading-tight text-[var(--color-foreground)]">
            {price}
            <span className="ml-1 text-xs font-normal text-[var(--color-muted-foreground)]">
              for sale
            </span>
          </p>
        </div>

        {/* CTA */}
        {listingStatus && listingStatus !== 'ACTIVE' && !isOwner ? (
          <div className="flex shrink-0 items-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {listingStatus === 'SOLD' ? 'Sold' : 'Unavailable'}
          </div>
        ) : isOwner ? (
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] px-5 py-3 text-sm font-semibold text-[var(--color-foreground)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
          >
            Manage listing
          </Link>
        ) : localUnlocked && localPhone ? (
          <a
            href={`tel:${localPhone.replace(/\s/g, '')}`}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            Call Seller
          </a>
        ) : interestStatus === 'ACCEPTED' && interestId ? (
          <button
            type="button"
            onClick={() => setUnlockSheetOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[#222] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            Unlock — ₹49
          </button>
        ) : !isAuthenticated ? (
          <Link
            href={`/login?next=/listing/${listingId}`}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[#222] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Request Contact
          </Link>
        ) : requested ? (
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
            Request Sent
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[#222] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Request Contact
          </button>
        )}
      </div>

      {/* Unlock bottom sheet */}
      {unlockSheetOpen && interestId && (
        <div
          className="fixed inset-0 z-[60] flex items-end lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Unlock seller contact"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setUnlockSheetOpen(false)}
            aria-hidden="true"
          />
          {/* Sheet */}
          <div className="relative w-full rounded-t-2xl border-t border-[var(--color-border)] bg-[var(--color-background)] p-6">
            <button
              type="button"
              onClick={() => setUnlockSheetOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              aria-label="Close"
            >
              ✕
            </button>
            <UnlockContactSection
              interestId={interestId}
              listingTitle={listingTitle}
              onUnlocked={(phone, email) => {
                setLocalPhone(phone)
                setLocalUnlocked(true)
                setUnlockSheetOpen(false)
                void email
              }}
            />
          </div>
        </div>
      )}

      {isAuthenticated && (
        <RequestContactModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={() => {
            setRequested(true)
            setModalOpen(false)
          }}
          onWithdraw={() => {
            setRequested(false)
            setModalOpen(false)
          }}
          viewExisting={requested}
          listingId={listingId}
          listingTitle={listingTitle}
        />
      )}
    </>
  )
}
