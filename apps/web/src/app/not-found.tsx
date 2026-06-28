import { Home, Search } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Page Not Found | SellItRight',
  description: 'The page you are looking for does not exist.',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-6 py-16 text-center">
      <p
        className="text-8xl font-extrabold tabular-nums text-[var(--color-primary)] sm:text-9xl"
        aria-hidden="true"
      >
        404
      </p>

      <h1 className="mt-4 text-xl font-bold text-[var(--color-foreground)] sm:text-2xl">
        Page not found
      </h1>

      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--color-muted-foreground)]">
        The listing or page you were looking for doesn&apos;t exist or may have been removed.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="hover:bg-[var(--color-primary)]/90 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          Go back home
        </Link>

        <Link
          href="/properties"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-6 py-3 text-sm font-semibold text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Browse listings
        </Link>
      </div>
    </main>
  )
}
