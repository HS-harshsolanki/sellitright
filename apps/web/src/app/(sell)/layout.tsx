import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'List Your Property — SellItRight',
  description: 'List your property on SellItRight and reach thousands of verified buyers across India.',
}

interface SellLayoutProps {
  children: React.ReactNode
}

export default function SellLayout({ children }: SellLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Minimal top bar */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-white/95 px-4 backdrop-blur-sm sm:px-6">
        {/* Logo — "Sell" in primary blue, "ItRight" in foreground dark, matching main header */}
        <Link
          href="/"
          className="flex items-center text-lg font-bold"
          aria-label="SellItRight home"
        >
          <span className="text-[var(--color-primary)]">Sell</span>
          <span className="text-foreground">ItRight</span>
        </Link>

        {/* Right side: draft saved indicator + exit link */}
        <div className="flex items-center gap-3">
          {/* Draft saved badge — subtle, reassures the user */}
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 text-green-500"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M5 8.5l2 2 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Draft saved
          </span>

          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
          >
            Exit
          </Link>
        </div>
      </header>

      {/* Content — centered, max-w-2xl */}
      <main className="flex flex-1 justify-center px-4 pb-32 pt-8 sm:px-6">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  )
}
