import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-white px-4 py-8">
      {/* Back to browse — top-left corner */}
      <Link
        href="/properties"
        className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-[#E5E5E5] bg-white px-3 py-2 text-sm font-medium text-[#6B6B6B] transition-colors hover:border-[#1A1A1A] hover:text-[#1A1A1A] sm:left-6 sm:top-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Browse homes
      </Link>

      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
