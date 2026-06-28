'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Building2,
  AlertTriangle,
  CreditCard,
  Users,
  ScrollText,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminAuth } from './admin-auth-context'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

interface SidebarContentProps {
  items: NavItem[]
  pathname: string
  onLogout: () => void
}

function SidebarContent({ items, pathname, onLogout }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="border-b border-[var(--color-border)] px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[var(--color-foreground)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
            Admin
          </span>
          <span className="text-sm font-semibold text-[var(--color-foreground)]">SellItRight</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active =
            item.href === '/admin/dashboard'
              ? pathname === '/admin/dashboard' || pathname === '/admin'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-[var(--color-foreground)] text-white'
                  : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
              )}
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
              </span>
              {(item.badge ?? 0) > 0 && (
                <span
                  className={cn(
                    'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                    active ? 'bg-white/20 text-white' : 'bg-[var(--color-accent)] text-white',
                  )}
                >
                  {item.badge! > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="space-y-1 border-t border-[var(--color-border)] px-3 py-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
        >
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
          Back to site
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          Logout
        </button>
      </div>
    </div>
  )
}

export function AdminSidebar() {
  const pathname = usePathname()
  const { logout, apiFetch } = useAdminAuth()
  const [pendingCount, setPendingCount] = useState(0)
  const [openReports, setOpenReports] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    apiFetch('/api/admin/stats')
      .then((r) => r.json())
      .then((d: unknown) => {
        if (d && typeof d === 'object') {
          const data = d as {
            listings?: { pending?: number }
            reports?: { open?: number }
          }
          setPendingCount(data.listings?.pending ?? 0)
          setOpenReports(data.reports?.open ?? 0)
        }
      })
      .catch(() => {})
  }, [apiFetch])

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Listings', href: '/admin/listings', icon: Building2, badge: pendingCount },
    { label: 'Reports', href: '/admin/reports', icon: AlertTriangle, badge: openReports },
    { label: 'Payments', href: '/admin/payments', icon: CreditCard },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Audit Log', href: '/admin/audit-log', icon: ScrollText },
  ]

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-0 h-screen border-r border-[var(--color-border)] bg-white">
          <SidebarContent items={navItems} pathname={pathname} onLogout={logout} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--color-border)] bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[var(--color-foreground)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
            Admin
          </span>
          <span className="text-sm font-semibold text-[var(--color-foreground)]">SellItRight</span>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open admin menu"
              className="rounded-lg p-2 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Admin Navigation</SheetTitle>
            </SheetHeader>
            <SidebarContent
              items={navItems}
              pathname={pathname}
              onLogout={() => {
                setMobileOpen(false)
                logout()
              }}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
