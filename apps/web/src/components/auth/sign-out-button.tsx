'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface SignOutButtonProps {
  className?: string
  showIcon?: boolean
  label?: string
}

export function SignOutButton({
  className,
  showIcon = true,
  label = 'Sign out',
}: SignOutButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignOut() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
        'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    >
      {showIcon && <LogOut className="h-4 w-4" />}
      {loading ? 'Signing out…' : label}
    </button>
  )
}
