import type { Metadata } from 'next'
import Link from 'next/link'
import { BarChart3, Home, LayoutGrid, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SignOutButton } from '@/components/auth/sign-out-button'

export const metadata: Metadata = {
  title: 'Dashboard — SellItRight',
  description: 'Manage your property listings on SellItRight.',
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'My Listings',
    icon: <LayoutGrid className="h-4 w-4" />,
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: <User className="h-4 w-4" />,
  },
]

const BOTTOM_NAV_ITEMS = [
  { href: '/', label: 'Browse', icon: <Home className="h-5 w-5" /> },
  { href: '/dashboard', label: 'Listings', icon: <LayoutGrid className="h-5 w-5" /> },
  { href: '/sell', label: 'Post', icon: <BarChart3 className="h-5 w-5" /> },
  { href: '/profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
]

function SidebarNav() {
  return (
    <aside className="border-border hidden w-56 shrink-0 border-r bg-white lg:flex lg:flex-col">
      {/* Logo */}
      <div className="border-border flex h-16 items-center border-b px-6">
        <Link href="/" className="text-primary flex items-center gap-1 text-lg font-bold">
          <span className="text-accent">Sell</span>
          <span>ItRight</span>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Dashboard navigation">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              'text-muted-foreground hover:bg-muted hover:text-foreground',
              'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Sign out */}
      <div className="border-border border-t p-3">
        <SignOutButton className="w-full" />
      </div>
    </aside>
  )
}

function TopBar() {
  return (
    <header className="border-border sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-white/95 px-4 backdrop-blur-sm lg:hidden">
      <Link href="/" className="text-primary flex items-center gap-1 text-base font-bold">
        <span className="text-accent">Sell</span>
        <span>ItRight</span>
      </Link>
      <Link
        href="/sell"
        className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
      >
        + List property
      </Link>
    </header>
  )
}

function MobileBottomNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="border-border pb-safe-0 fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center border-t bg-white/95 backdrop-blur-sm lg:hidden"
    >
      {BOTTOM_NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'text-muted-foreground flex flex-1 flex-col items-center justify-center gap-1 py-2',
            'hover:text-primary focus-visible:ring-ring transition-colors focus-visible:outline-none focus-visible:ring-2',
          )}
        >
          {item.icon}
          <span className="text-[10px] font-medium">{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="bg-muted/30 flex min-h-screen">
      <SidebarNav />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />

        <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-8">{children}</main>
      </div>

      <MobileBottomNav />
    </div>
  )
}
