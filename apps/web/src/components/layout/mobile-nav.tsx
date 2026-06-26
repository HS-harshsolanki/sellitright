'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusSquare, User, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/supabase/auth-context'

export function MobileNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  const tabs = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/?focus=search', label: 'Search', icon: Search, matchHref: '/' },
    { href: '/sell', label: 'Sell', icon: PlusSquare },
    user
      ? { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }
      : { href: '/login', label: 'Profile', icon: User },
  ]

  return (
    <nav
      className="bg-[var(--color-background)]/95 supports-[backdrop-filter]:bg-[var(--color-background)]/80 pb-safe-0 fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] backdrop-blur md:hidden"
      aria-label="Bottom navigation"
    >
      <ul className="flex h-16 items-stretch" role="list">
        {tabs.map(({ href, label, icon: Icon, matchHref }) => {
          const checkHref = matchHref ?? href
          const isActive = checkHref === '/' ? pathname === '/' : pathname.startsWith(checkHref)

          return (
            <li key={label} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                  isActive
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={cn('h-5 w-5', isActive && 'text-[var(--color-primary)]')}
                  aria-hidden="true"
                />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
