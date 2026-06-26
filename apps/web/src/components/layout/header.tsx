'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/supabase/auth-context'
import { Suspense, useEffect, useRef, useState } from 'react'
import {
  Menu,
  Plus,
  LogOut,
  LayoutDashboard,
  User,
  UserPlus,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { HeaderSearch } from '@/components/layout/header-search'
import { cn } from '@/lib/utils'

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <Link
      href="/"
      className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] rounded"
      aria-label="SellItRight home"
    >
      <span className="block text-lg font-bold tracking-tight text-[var(--color-primary)] md:hidden">
        SIR
      </span>
      <span className="hidden md:block text-xl font-bold tracking-tight leading-none">
        <span className="text-[var(--color-primary)]">Sell</span>
        <span className="text-[var(--color-foreground)]">ItRight</span>
      </span>
    </Link>
  )
}

function SearchFallback() {
  return (
    <div className="relative flex-1 max-w-md h-10 sm:h-11 rounded-full bg-[var(--color-muted)] border border-[var(--color-border)]" />
  )
}

// ─── User dropdown (desktop) ──────────────────────────────────────────────────

interface UserDropdownProps {
  name: string | null
  email: string | null
  onSignOut: () => void
}

function UserDropdown({ name, email, onSignOut }: UserDropdownProps) {
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
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
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
            'rounded-xl border border-[var(--color-border)] bg-white shadow-xl overflow-hidden',
          )}
        >
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <p className="text-sm font-semibold text-[var(--color-foreground)] truncate">
              {name ?? 'My Account'}
            </p>
            {email && (
              <p className="text-xs text-[var(--color-muted-foreground)] truncate mt-0.5">{email}</p>
            )}
          </div>

          <div className="py-1">
            <Link
              href="/dashboard"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden="true" />
              Dashboard
            </Link>
            <Link
              href="/sell"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
            >
              <Plus className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden="true" />
              Post Property
            </Link>
            <Link
              href="/dashboard/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
            >
              <User className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden="true" />
              My Profile
            </Link>
          </div>

          <div className="border-t border-[var(--color-border)] py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); onSignOut() }}
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
  pathname: string
  onSignOut: () => void
}

function MobileSheet({ name, isLoggedIn, pathname, onSignOut }: MobileSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className={cn(
            'flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white',
            'pl-2.5 pr-1 py-1',
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
            href="/sell"
            className="flex items-center gap-2.5 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            Post Property
          </Link>

          <div className="my-2 border-t border-[var(--color-border)]" />

          {isLoggedIn ? (
            <>
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
              <Link
                href="/dashboard/profile"
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const name = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? null
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
        <div className="hidden md:flex shrink-0 items-center gap-3">
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

          {/* Loading skeleton to avoid layout shift */}
          {loading ? (
            <div className="h-9 w-9 rounded-full bg-[var(--color-muted)] animate-pulse" aria-hidden="true" />
          ) : user ? (
            <UserDropdown name={name} email={email} onSignOut={signOut} />
          ) : (
            <Link
              href="/login"
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium text-[var(--color-muted-foreground)]',
                'transition-colors duration-150 hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]',
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
            pathname={pathname}
            onSignOut={signOut}
          />
        </div>

      </div>
    </header>
  )
}
