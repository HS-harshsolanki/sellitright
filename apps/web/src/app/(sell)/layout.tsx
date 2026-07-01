import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'List Your Property — SellItRight',
  description:
    'List your property on SellItRight and reach thousands of verified buyers across India.',
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
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  )
}
