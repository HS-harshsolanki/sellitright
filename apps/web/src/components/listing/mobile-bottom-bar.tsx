'use client'

import Link from 'next/link'
import { Phone } from 'lucide-react'

interface MobileBottomBarProps {
  price: string
  listingTitle: string
}

export function MobileBottomBar({ price, listingTitle }: MobileBottomBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-4 border-t border-[var(--color-border)] bg-[var(--color-background)]/95 px-4 py-4 pb-safe backdrop-blur-sm lg:hidden"
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

      {/* CTA — uses a neutral dark tone to avoid clashing with white bg */}
      <Link
        href="/login"
        className="flex shrink-0 items-center gap-2 rounded-xl bg-[#222] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 dark:bg-white dark:text-[#111] dark:hover:bg-white/90"
      >
        <Phone className="h-4 w-4" aria-hidden="true" />
        Contact Seller
      </Link>
    </div>
  )
}
