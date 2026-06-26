'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Home, LayoutGrid, Plus, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SignOutButton } from '@/components/auth/sign-out-button'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'My Listings', icon: <LayoutGrid className="h-4 w-4" /> },
  { href: '/profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
]

const BOTTOM_NAV_ITEMS = [
  { href: '/', label: 'Browse', icon: <Home className="h-5 w-5" /> },
  { href: '/dashboard', label: 'Listings', icon: <LayoutGrid className="h-5 w-5" /> },
  { href: '/sell', label: 'Post', icon: <BarChart3 className="h-5 w-5" /> },
  { href: '/profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
]

function SidebarNav() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-56 shrink-0 border-r border-[var(--color-border)] bg-white lg:flex lg:flex-col">
      {/* Logo — links back to browse */}
      <div className="flex h-16 items-center border-b border-[var(--color-border)] px-6">
        <Link
          href="/"
          className="flex items-center gap-1 text-lg font-bold leading-none tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          aria-label="SellItRight — back to browse"
        >
          <span className="text-[var(--color-accent)]">Sell</span>
          <span className="text-[var(--color-foreground)]">ItRight</span>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Dashboard navigation">
        {/* Back to browse */}
        <Link
          href="/"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
          )}
        >
          <Home className="h-4 w-4" />
          Browse listings
        </Link>

        <div className="my-1 h-px bg-[var(--color-border)]" />

        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard' || pathname.startsWith('/dashboard/')
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
                isActive
                  ? 'bg-[var(--color-muted)] text-[var(--color-foreground)]'
                  : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Post property CTA + sign out */}
      <div className="space-y-2 border-t border-[var(--color-border)] p-3">
        <Link
          href="/sell"
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold',
            'bg-[var(--color-foreground)] text-white transition-opacity hover:opacity-90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Post Property
        </Link>
        <SignOutButton className="w-full" />
      </div>
    </aside>
  )
}

function TopBar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-white/95 px-4 backdrop-blur-sm lg:hidden">
      <Link
        href="/"
        className="flex items-center gap-1 text-base font-bold leading-none tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        aria-label="SellItRight — back to browse"
      >
        <span className="text-[var(--color-accent)]">Sell</span>
        <span className="text-[var(--color-foreground)]">ItRight</span>
      </Link>
      <Link
        href="/sell"
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white',
          'bg-[var(--color-foreground)] transition-opacity hover:opacity-90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
        )}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        List property
      </Link>
    </header>
  )
}

function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Mobile navigation"
      className="pb-safe-0 fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center border-t border-[var(--color-border)] bg-white/95 backdrop-blur-sm lg:hidden"
    >
      {BOTTOM_NAV_ITEMS.map((item) => {
        const isActive =
          item.href === '/'
            ? pathname === '/'
            : item.href === '/dashboard'
              ? pathname === '/dashboard' || pathname.startsWith('/dashboard/')
              : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
              isActive
                ? 'text-[var(--color-foreground)]'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
            )}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[var(--color-muted)]">
      <SidebarNav />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-8">{children}</main>
      </div>

      <MobileBottomNav />
    </div>
  )
}
