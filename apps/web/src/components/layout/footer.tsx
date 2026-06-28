import { Plus } from 'lucide-react'
import Link from 'next/link'

const FOOTER_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/trust', label: 'Trust Center' },
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/report', label: 'Report Abuse' },
] as const

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Logo + tagline + CTA */}
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              className="flex items-center gap-1 text-base font-bold leading-none tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              <span className="sr-only">SellItRight home</span>
              <span aria-hidden="true" className="text-[var(--color-accent)]">
                Sell
              </span>
              <span aria-hidden="true" className="text-[var(--color-foreground)]">
                ItRight
              </span>
            </Link>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Find your perfect home across India.
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
          &copy; {new Date().getFullYear()} SellItRight. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
