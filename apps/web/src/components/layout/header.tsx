'use client'

import { Menu, Plus, LogOut, LayoutDashboard, User, UserPlus, Bell, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'

import { HeaderSearch } from '@/components/layout/header-search'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useNotifications } from '@/hooks/use-notifications'
import { useAuth } from '@/lib/supabase/auth-context'
import { cn } from '@/lib/utils'

const LS_KEY = 'sir_has_listings'

function useHasListings(userId: string | undefined): boolean {
  const [hasListings, setHasListings] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(LS_KEY) === '1'
  })

  useEffect(() => {
    if (!userId) {
      setHasListings(false)
      return
    }
    // Read from localStorage first (instant, no network)
    if (localStorage.getItem(LS_KEY) === '1') {
      setHasListings(true)
      return
    }
    // Only hit the API when no cached value exists
    fetch('/api/dashboard/listings?limit=1')
      .then((r) => r.json())
      .then((data: unknown) => {
        if (data && typeof data === 'object' && 'listings' in data) {
          const d = data as { listings: unknown[] }
          const has = d.listings.length > 0
          if (has) localStorage.setItem(LS_KEY, '1')
          setHasListings(has)
        }
      })
      .catch(() => {})
  }, [userId])

  return hasListings
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <Link
      href="/"
      className="shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
    >
      <span className="sr-only">SellItRight home</span>
      <span
        aria-hidden="true"
        className="block text-lg font-bold tracking-tight text-[var(--color-primary)] md:hidden"
      >
        SIR
      </span>
      <span
        aria-hidden="true"
        className="hidden text-xl font-bold leading-none tracking-tight md:block"
      >
        <span className="text-[var(--color-primary)]">Sell</span>
        <span className="text-[var(--color-foreground)]">ItRight</span>
      </span>
    </Link>
  )
}

function SearchFallback() {
  return (
    <div className="relative h-10 max-w-md flex-1 rounded-full border border-[var(--color-border)] bg-[var(--color-muted)] sm:h-11" />
  )
}

// ─── User dropdown (desktop) ──────────────────────────────────────────────────

interface UserDropdownProps {
  name: string | null
  email: string | null
  hasListings: boolean
  onSignOut: () => void
}

function UserDropdown({ name, email, hasListings, onSignOut }: UserDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const initials = name?.[0]?.toUpperCase() ?? null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-white',
          'text-[var(--color-muted-foreground)] transition-shadow duration-200',
          'hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
          open && 'shadow-md',
        )}
      >
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
            initials
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-transparent text-[var(--color-muted-foreground)]',
          )}
          aria-hidden="true"
        >
          {initials ?? <User className="h-4 w-4" />}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account options"
          className={cn(
            'absolute right-0 top-[calc(100%+8px)] z-[100] w-56',
            'overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-xl',
          )}
        >
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
              {name ?? 'My Account'}
            </p>
            {email && (
              <p className="mt-0.5 truncate text-xs text-[var(--color-muted-foreground)]">
                {email}
              </p>
            )}
          </div>

          <div className="py-1">
            {hasListings && (
              <Link
                href="/dashboard"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
              >
                <LayoutDashboard
                  className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]"
                  aria-hidden="true"
                />
                Dashboard
              </Link>
            )}
            <Link
              href="/sell"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
            >
              <Plus
                className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]"
                aria-hidden="true"
              />
              Post Property
            </Link>
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
            >
              <User
                className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]"
                aria-hidden="true"
              />
              My Profile
            </Link>
          </div>

          <div className="border-t border-[var(--color-border)] py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onSignOut()
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Mobile Sheet ─────────────────────────────────────────────────────────────

interface MobileSheetProps {
  name: string | null
  isLoggedIn: boolean
  hasListings: boolean
  pathname: string
  onSignOut: () => void
  notificationCount?: number
}

function MobileSheet({
  name,
  isLoggedIn,
  hasListings,
  pathname,
  onSignOut,
  notificationCount = 0,
}: MobileSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className={cn(
            'flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white',
            'py-1 pl-2.5 pr-1',
            'text-[var(--color-muted-foreground)] transition-shadow duration-200 hover:shadow-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
          )}
        >
          <Menu className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)]"
            aria-hidden="true"
          >
            {name?.[0]?.toUpperCase() ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white">
                {name[0].toUpperCase()}
              </span>
            ) : (
              <User className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            )}
          </span>
        </button>
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-6">
        <SheetHeader className="mb-5">
          <SheetTitle className="text-left text-base font-bold tracking-tight">
            <span className="text-[var(--color-primary)]">Sell</span>
            <span className="text-[var(--color-foreground)]">ItRight</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
          <Link
            href="/properties"
            className={cn(
              'flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
              pathname.startsWith('/properties')
                ? 'bg-[var(--color-muted)] text-[var(--color-foreground)]'
                : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
            )}
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            Browse Properties
          </Link>
          <Link
            href="/sell"
            className="flex items-center gap-2.5 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            Post Property
          </Link>

          <div className="my-2 border-t border-[var(--color-border)]" />

          {isLoggedIn ? (
            <>
              {hasListings && (
                <Link
                  href="/dashboard"
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                    pathname.startsWith('/dashboard')
                      ? 'bg-[var(--color-muted)] text-[var(--color-foreground)]'
                      : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
                  )}
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Dashboard
                </Link>
              )}
              <Link
                href="/notifications"
                className={cn(
                  'flex items-center justify-between gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                  pathname.startsWith('/notifications')
                    ? 'bg-[var(--color-muted)] text-[var(--color-foreground)]'
                    : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Bell className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Notifications
                </span>
                {notificationCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1.5 text-[10px] font-bold text-white">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </Link>
              <Link
                href="/profile"
                className={cn(
                  'flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                  pathname.startsWith('/profile')
                    ? 'bg-[var(--color-muted)] text-[var(--color-foreground)]'
                    : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
                )}
              >
                <User className="h-4 w-4 shrink-0" aria-hidden="true" />
                My Profile
              </Link>

              <div className="my-2 border-t border-[var(--color-border)]" />

              <button
                type="button"
                onClick={onSignOut}
                className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                <User className="h-4 w-4 shrink-0" aria-hidden="true" />
                Login
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                Create Account
              </Link>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

export function Header() {
  const { user, loading, signOut } = useAuth()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const hasListings = useHasListings(user?.id)
  // Single shared hook — bell and mobile badge read from the same state
  const notificationsHook = useNotifications(user?.id)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const name =
    user?.user_metadata?.full_name ??
    (user?.email?.includes('@') ? user.email.split('@')[0] : (user?.email ?? null)) ??
    null
  const email = user?.email ?? null

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80',
        'transition-shadow duration-200',
        scrolled ? 'shadow-sm' : 'shadow-none',
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:h-16 sm:gap-4 sm:px-6">
        {/* Zone 1: Logo */}
        <Logo />

        {/* Zone 2: Search */}
        <div className="flex flex-1 justify-center">
          <Suspense fallback={<SearchFallback />}>
            <HeaderSearch className="max-w-md" />
          </Suspense>
        </div>

        {/* Zone 3: Right actions — desktop */}
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <Link
            href="/properties"
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium text-[var(--color-muted-foreground)]',
              'transition-colors duration-150 hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
            )}
          >
            Browse
          </Link>
          <Link
            href="/sell"
            className={cn(
              'rounded-full bg-[var(--color-foreground)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm',
              'transition-all duration-150 hover:bg-gray-800 hover:shadow-md active:scale-[0.97]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2',
            )}
          >
            Post Property
          </Link>

          {/* Notification bell — authenticated users only */}
          {!loading && user && <NotificationBell hook={notificationsHook} />}

          {/* Loading skeleton to avoid layout shift */}
          {loading ? (
            <div
              className="h-9 w-9 animate-pulse rounded-full bg-[var(--color-muted)]"
              aria-hidden="true"
            />
          ) : user ? (
            <UserDropdown name={name} email={email} hasListings={hasListings} onSignOut={signOut} />
          ) : (
            <Link
              href="/login"
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium text-[var(--color-muted-foreground)]',
                'transition-colors duration-150 hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
              )}
            >
              Log in
            </Link>
          )}
        </div>

        {/* Mobile only */}
        <div className="shrink-0 md:hidden">
          <MobileSheet
            name={name}
            isLoggedIn={!!user}
            hasListings={hasListings}
            pathname={pathname}
            onSignOut={signOut}
            notificationCount={notificationsHook.unreadCount}
          />
        </div>
      </div>
    </header>
  )
}
