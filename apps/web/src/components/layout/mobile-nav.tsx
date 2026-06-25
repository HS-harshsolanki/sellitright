'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusSquare, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavTab {
  href: string
  label: string
  icon: React.ElementType
}

const TABS: NavTab[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/', label: 'Search', icon: Search },
  { href: '/sell', label: 'Sell', icon: PlusSquare },
  { href: '/login', label: 'Profile', icon: User },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-background)]/80 pb-safe-0"
      aria-label="Bottom navigation"
    >
      <ul className="flex h-16 items-stretch" role="list">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)

          return (
            <li key={href} className="flex-1">
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
