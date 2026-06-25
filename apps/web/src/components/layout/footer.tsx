import Link from 'next/link'
import { Home } from 'lucide-react'

const FOOTER_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
] as const

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Logo + tagline */}
          <div className="flex flex-col gap-1">
            <Link href="/" className="flex items-center gap-1.5" aria-label="SellItRight home">
              <Home className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
              <span className="font-bold text-base tracking-tight text-[var(--color-foreground)]">SellItRight</span>
            </Link>
            <p className="text-xs text-[var(--color-muted-foreground)]">Find your perfect home across India.</p>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap gap-x-5 gap-y-2" role="list">
              {FOOTER_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
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
