'use client'

import { useAuth } from '@/lib/supabase/auth-context'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { User, Mail, Phone, LogOut, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.full_name ?? '')
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-6 w-6 text-[var(--color-muted-foreground)]" />
      </div>
    )
  }

  if (!user) {
    router.replace('/login?next=/profile')
    return null
  }

  const email = user.email ?? null
  const phone = user.phone ?? null
  const provider = user.app_metadata?.provider ?? 'email'
  const avatarUrl: string | null = user.user_metadata?.avatar_url ?? null
  const initials = displayName?.[0]?.toUpperCase() ?? email?.[0]?.toUpperCase() ?? '?'

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)

    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName },
    })

    setSaving(false)

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-foreground)] sm:text-2xl">My Profile</h1>
        <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
          Manage your account details
        </p>
      </div>

      {/* Avatar + identity */}
      <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-5">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName || 'Avatar'}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-2xl font-bold text-white">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold text-[var(--color-foreground)]">
            {displayName || email || 'Anonymous'}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
            Signed in via{' '}
            <span className="capitalize font-medium">{provider}</span>
          </p>
        </div>
      </div>

      {/* Edit form */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-[var(--color-border)] bg-white p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Account details</h2>

        {/* Display name */}
        <div>
          <label
            htmlFor="display-name"
            className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]"
          >
            Display name
          </label>
          <div className="flex h-11 items-center overflow-hidden rounded-lg border border-[var(--color-border)] focus-within:ring-2 focus-within:ring-[var(--color-ring)]">
            <User className="ml-3 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden="true" />
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="h-full flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[var(--color-muted-foreground)]"
              autoComplete="name"
            />
          </div>
        </div>

        {/* Email (read-only) */}
        {email && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
              Email address
            </label>
            <div className="flex h-11 items-center overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]">
              <Mail className="ml-3 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden="true" />
              <span className="px-3 text-sm text-[var(--color-muted-foreground)]">{email}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              Email cannot be changed here.
            </p>
          </div>
        )}

        {/* Phone (read-only) */}
        {phone && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
              Phone number
            </label>
            <div className="flex h-11 items-center overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]">
              <Phone className="ml-3 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden="true" />
              <span className="px-3 text-sm text-[var(--color-muted-foreground)]">{phone}</span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600" role="alert">{error}</p>
        )}

        <Button
          type="submit"
          className="h-11 w-full text-sm font-semibold"
          disabled={saving}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <Spinner className="h-4 w-4" />
              Saving…
            </span>
          ) : saved ? (
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Saved!
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save changes
            </span>
          )}
        </Button>
      </form>

      {/* Danger zone */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-foreground)]">Session</h2>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full gap-2 border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-300"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out of all devices
        </Button>
      </div>
    </div>
  )
}
