import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'ChapterNew — Sign in',
  description:
    'Sign in or create an account on ChapterNew to buy and sell properties across India.',
  robots: { index: false, follow: false },
}

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-white px-4 py-8">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
