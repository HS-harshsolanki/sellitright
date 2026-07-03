'use client'

import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface ErrorScreenProps {
  title?: string
  message?: string
  digest?: string
  reset?: () => void
  homeHref?: string
}

export function ErrorScreen({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  digest,
  reset,
  homeHref = '/',
}: ErrorScreenProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden="true" />
      </div>

      <h1 className="mt-4 text-xl font-bold text-[var(--color-foreground)]">{title}</h1>

      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--color-muted-foreground)]">
        {message}
      </p>

      {digest && (
        <p className="mt-2 font-mono text-xs text-[var(--color-muted-foreground)]">Ref: {digest}</p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {reset && (
          <button
            type="button"
            onClick={reset}
            className="hover:bg-[var(--color-primary)]/90 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        )}
        <Link
          href={homeHref}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-6 py-3 text-sm font-semibold text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          Go home
        </Link>
      </div>
    </div>
  )
}
