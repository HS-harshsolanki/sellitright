import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'List Your Property — SellItRight',
  description:
    'List your property on SellItRight and reach thousands of verified buyers across India.',
}

interface SellLayoutProps {
  children: React.ReactNode
}

export default function SellLayout({ children }: SellLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Minimal top bar */}
      <header className="border-border sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur-sm sm:px-6">
        {/* Logo — "Sell" in primary blue, "ItRight" in foreground dark, matching main header */}
        <Link
          href="/"
          className="flex items-center text-lg font-bold"
          aria-label="SellItRight home"
        >
          <span className="text-[var(--color-primary)]">Sell</span>
          <span className="text-foreground">ItRight</span>
        </Link>

        {/* Right side: exit link */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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
