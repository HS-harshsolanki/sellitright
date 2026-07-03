import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { ChapterNewLogo } from '@/components/layout/chapternew-logo'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'List Your Property — ChapterNew',
  description:
    'List your property on ChapterNew and reach thousands of verified buyers across India.',
}

interface SellLayoutProps {
  children: React.ReactNode
}

export default async function SellLayout({ children }: SellLayoutProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (supabaseUrl.startsWith('https://') && !supabaseUrl.includes('<your-project-ref>')) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      redirect('/login?next=/sell')
    }
  }
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Minimal top bar */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-white/95 px-4 backdrop-blur-sm sm:px-6">
        <ChapterNewLogo size="sm" />

        {/* Right side: exit link */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded text-sm font-medium text-[var(--color-muted-foreground)] underline-offset-4 hover:text-[var(--color-foreground)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
          >
            Exit
          </Link>
        </div>
      </header>

      {/* Content — centered, max-w-2xl */}
      <main className="flex flex-1 justify-center px-4 pb-32 pt-8 sm:px-6">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  )
}
