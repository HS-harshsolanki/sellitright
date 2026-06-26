'use client'

import Link from 'next/link'
import { useState } from 'react'
import { MessageSquare, CheckCircle2 } from 'lucide-react'
import { RequestContactModal } from '@/components/listing/request-contact-modal'

interface MobileBottomBarProps {
  price: string
  listingTitle: string
  listingId: string
  isAuthenticated: boolean
  hasExistingRequest?: boolean
}

export function MobileBottomBar({
  price,
  listingTitle,
  listingId,
  isAuthenticated,
  hasExistingRequest = false,
}: MobileBottomBarProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [requested, setRequested] = useState(hasExistingRequest)

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 border-t border-[var(--color-border)] bg-[var(--color-background)]/95 px-4 py-4 pb-safe backdrop-blur-sm lg:hidden"
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
        {!isAuthenticated ? (
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

      {isAuthenticated && (
        <RequestContactModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={() => { setRequested(true); setModalOpen(false) }}
          onWithdraw={() => { setRequested(false); setModalOpen(false) }}
          viewExisting={requested}
          listingId={listingId}
          listingTitle={listingTitle}
        />
      )}
    </>
  )
}
