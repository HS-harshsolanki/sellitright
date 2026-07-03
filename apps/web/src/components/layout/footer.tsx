import { Plus } from 'lucide-react'
import Link from 'next/link'

import { ChapterNewLogo } from '@/components/layout/chapternew-logo'

const FOOTER_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/refund-policy', label: 'Refund Policy' },
] as const

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Logo + tagline + CTA */}
          <div className="flex flex-col gap-2">
            <ChapterNewLogo size="sm" />
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Find your next place in life.
            </p>
            <Link
              href="/sell"
              className="mt-1 flex w-fit items-center gap-1.5 rounded-full bg-[var(--color-foreground)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Post Property
            </Link>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap gap-x-5 gap-y-2" role="list">
              {FOOTER_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Copyright */}
        <p className="mt-6 text-xs text-[var(--color-muted-foreground)]">
          &copy; {new Date().getFullYear()} ChapterNew. All rights reserved.
        </p>
        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
          Questions?{' '}
          <a
            href="mailto:support@chapternew.com"
            className="underline underline-offset-2 hover:text-[var(--color-foreground)]"
          >
            support@chapternew.com
          </a>
        </p>
      </div>
    </footer>
  )
}
