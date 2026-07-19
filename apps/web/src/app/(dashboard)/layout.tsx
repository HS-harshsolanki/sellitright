'use client'

import {
  ArrowUpRight,
  Bell,
  ClipboardList,
  Compass,
  LayoutGrid,
  MessageSquare,
  Plus,
  User,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

import { SignOutButton } from '@/components/auth/sign-out-button'
import { ChapterNewLogo } from '@/components/layout/chapternew-logo'
import { ToastProvider } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'My Listings', icon: <LayoutGrid className="h-4 w-4" /> },
  {
    href: '/dashboard/buyers',
    label: 'Buyer Requests',
    icon: <Users className="h-4 w-4" />,
    matchPath: '/dashboard/buyers',
  },
  {
    href: '/dashboard/requests',
    label: 'My Requests',
    icon: <ClipboardList className="h-4 w-4" />,
    matchPath: '/dashboard/requests',
  },
  {
    href: '/notifications',
    label: 'Notifications',
    icon: <Bell className="h-4 w-4" />,
    matchPath: '/notifications',
  },
  { href: '/profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
]

interface SidebarNavProps {
  pendingBuyerCount?: number | null
}

function SidebarNavInner({ pendingBuyerCount }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden w-56 shrink-0 border-r border-[var(--color-border)] bg-white lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-[var(--color-border)] px-6">
        <ChapterNewLogo size="sm" />
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Dashboard navigation">
        {NAV_ITEMS.map((item) => {
          const isActive =
            'matchPath' in item
              ? item.matchPath !== undefined && pathname.startsWith(item.matchPath)
              : item.href === '/dashboard'
                ? (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) &&
                  !pathname.startsWith('/dashboard/requests') &&
                  !pathname.startsWith('/dashboard/buyers')
                : pathname.startsWith(item.href)
          const badge =
            'matchPath' in item && item.matchPath === '/dashboard/buyers' && pendingBuyerCount
              ? pendingBuyerCount
              : null
          return (
            <Link
              key={item.label}
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
              <span className="flex-1">{item.label}</span>
              {badge ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white">
                  {badge > 99 ? '99+' : badge}
                </span>
              ) : null}
            </Link>
          )
        })}

        <div className="my-2 h-px bg-[var(--color-border)]" />

        {/* Browse marketplace — exits the dashboard */}
        <Link
          href="/properties"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
          )}
        >
          <Compass className="h-4 w-4" />
          <span className="flex-1">Browse marketplace</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
        </Link>
      </nav>

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

function SidebarNav(props: SidebarNavProps) {
  return (
    <Suspense
      fallback={
        <aside className="hidden w-56 shrink-0 border-r border-[var(--color-border)] bg-white lg:flex lg:flex-col" />
      }
    >
      <SidebarNavInner {...props} />
    </Suspense>
  )
}

function TopBar() {
  // No "List property" CTA here — Post is already the centre tab in the bottom nav.
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b border-[var(--color-border)] bg-white/95 px-4 backdrop-blur-sm lg:hidden">
      <ChapterNewLogo size="sm" />
    </header>
  )
}

// Unified 5-item mobile nav — identical labels/icons to the browse MobileNav so
// users see the same bottom bar on every logged-in page (browse + dashboard).
// Browse | My Activity | Post | Inbox | Me
const MOBILE_ITEMS = [
  {
    href: '/properties',
    label: 'Browse',
    icon: <Compass className="h-5 w-5" />,
    matchPath: '/properties',
  },
  {
    href: '/dashboard',
    label: 'My Activity',
    icon: <LayoutGrid className="h-5 w-5" />,
    matchDash: true,
  },
  { href: '/sell', label: 'Post', icon: <Plus className="h-5 w-5" /> },
  {
    href: '/messages',
    label: 'Inbox',
    icon: <MessageSquare className="h-5 w-5" />,
    matchPath: '/messages',
    matchMsg: true,
  },
  { href: '/profile', label: 'Me', icon: <User className="h-5 w-5" /> },
]

interface MobileBottomNavProps {
  totalUnread?: number | null
}

function MobileBottomNavInner({ totalUnread }: MobileBottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Mobile navigation"
      className="pb-safe-0 fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center border-t border-[var(--color-border)] bg-white/95 backdrop-blur-sm lg:hidden"
    >
      {MOBILE_ITEMS.map((item) => {
        const isActive =
          'matchDash' in item
            ? // My Activity: active on all /dashboard/** routes
              pathname === '/dashboard' || pathname.startsWith('/dashboard/')
            : 'matchPath' in item && item.matchPath === '/properties'
              ? // Browse: active on /properties and /property/* detail pages
                pathname.startsWith('/properties') || pathname.startsWith('/property')
              : 'matchPath' in item
                ? item.matchPath !== undefined && pathname.startsWith(item.matchPath)
                : pathname.startsWith(item.href)
        return (
          <Link
            key={item.label}
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
            <span className="relative">
              {item.icon}
              {'matchMsg' in item && totalUnread && totalUnread > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              ) : null}
            </span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function MobileBottomNav({ totalUnread }: MobileBottomNavProps) {
  return (
    <Suspense
      fallback={
        <nav
          aria-label="Mobile navigation"
          className="pb-safe-0 fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center border-t border-[var(--color-border)] bg-white/95 lg:hidden"
        />
      }
    >
      <MobileBottomNavInner totalUnread={totalUnread} />
    </Suspense>
  )
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [pendingBuyerCount, setPendingBuyerCount] = useState<number | null>(null)
  const [totalUnread, setTotalUnread] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/interests?status=PENDING&page=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((json: unknown) => {
        if (
          json !== null &&
          typeof json === 'object' &&
          'total' in json &&
          typeof (json as Record<string, unknown>).total === 'number'
        ) {
          setPendingBuyerCount((json as { total: number }).total)
        }
      })
      .catch((err) => {
        console.error('[dashboard] failed to fetch pending buyer count:', err)
      })
  }, [])

  useEffect(() => {
    fetch('/api/chat/threads')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { threads: Array<{ unreadCount: number }> } | null) => {
        if (!data) return
        setTotalUnread(data.threads.reduce((sum, t) => sum + t.unreadCount, 0))
      })
      .catch(() => {})
  }, [])

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[var(--color-muted)]">
        <SidebarNav pendingBuyerCount={pendingBuyerCount} />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-8">{children}</main>
        </div>

        <MobileBottomNav totalUnread={totalUnread} />
      </div>
    </ToastProvider>
  )
}
