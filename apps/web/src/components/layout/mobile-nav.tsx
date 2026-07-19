'use client'

import { Compass, LayoutGrid, MessageSquare, Plus, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useAuth } from '@/lib/supabase/auth-context'
import { cn } from '@/lib/utils'

// Logged-in nav: unified for both browse and dashboard surfaces.
// Matches the dashboard mobile bottom nav so the user sees the same 5 tabs everywhere.
const LOGGED_IN_TABS = [
  {
    href: '/properties',
    label: 'Browse',
    icon: Compass,
    matchHref: '/properties',
  },
  {
    href: '/dashboard',
    label: 'My Activity',
    icon: LayoutGrid,
    matchHref: '/dashboard',
  },
  {
    href: '/sell',
    label: 'Post',
    icon: Plus,
    matchHref: '/sell',
  },
  {
    href: '/messages',
    label: 'Inbox',
    icon: MessageSquare,
    matchHref: '/messages',
  },
  {
    href: '/profile',
    label: 'Me',
    icon: User,
    matchHref: '/profile',
  },
] as const

// Logged-out nav: minimal — no dashboard, no inbox
const LOGGED_OUT_TABS = [
  {
    href: '/properties',
    label: 'Browse',
    icon: Compass,
    matchHref: '/properties',
  },
  {
    href: '/sell',
    label: 'Sell',
    icon: Plus,
    matchHref: '/sell',
  },
  {
    href: '/login',
    label: 'Sign In',
    icon: User,
    matchHref: '/login',
  },
] as const

export function MobileNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  const tabs = user ? LOGGED_IN_TABS : LOGGED_OUT_TABS

  return (
    <nav
      className="bg-[var(--color-background)]/95 supports-[backdrop-filter]:bg-[var(--color-background)]/80 pb-safe-0 fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] backdrop-blur md:hidden"
      aria-label="Bottom navigation"
    >
      <ul className="flex h-16 items-stretch" role="list">
        {tabs.map(({ href, label, icon: Icon, matchHref }) => {
          const isActive =
            matchHref === '/properties'
              ? // active on /properties and any property detail page
                pathname.startsWith('/properties') || pathname.startsWith('/property')
              : matchHref === '/dashboard'
                ? // active on all /dashboard/** routes
                  pathname.startsWith('/dashboard')
                : matchHref === '/sell'
                  ? pathname.startsWith('/sell')
                  : matchHref === '/messages'
                    ? pathname.startsWith('/messages')
                    : matchHref === '/profile'
                      ? pathname.startsWith('/profile')
                      : matchHref === '/login'
                        ? pathname.startsWith('/login')
                        : pathname === href

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
