import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'SellItRight — Sign in',
  description:
    'Sign in or create an account on SellItRight to buy and sell properties across India.',
  robots: { index: false, follow: false },
}

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--color-muted)] px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
