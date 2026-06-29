'use client'

import { User, Mail, Phone, LogOut, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/supabase/auth-context'
import { createClient } from '@/lib/supabase/client'
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
  const [displayName, setDisplayName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.full_name ?? '')
      setPhoneNumber(user.user_metadata?.phone ?? user.phone ?? '')
    }
  }, [user])

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?next=/profile')
    }
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-6 w-6 text-[var(--color-muted-foreground)]" />
      </div>
    )
  }

  const email = user.email ?? null
  const provider = user.app_metadata?.provider ?? 'email'
  const avatarUrl: string | null = user.user_metadata?.avatar_url ?? null
  const initials = displayName?.[0]?.toUpperCase() ?? email?.[0]?.toUpperCase() ?? '?'

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)

    const { error } = await createClient().auth.updateUser({
      data: { full_name: displayName, phone: phoneNumber },
    })

    setSaving(false)

    if (error) {
      if (process.env.NODE_ENV === 'development')
        console.error('[profile] updateUser error:', error.message)
      setError('Failed to save changes. Please try again.')
    } else {
      setSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 3000)
    }
  }

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  async function handleDeleteAccount() {
    setIsDeleting(true)
    try {
      const res = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE MY ACCOUNT' }),
      })
      if (res.ok) {
        await createClient().auth.signOut()
        window.location.href = '/?deleted=1'
      } else {
        const d = (await res.json()) as { error?: string }
        setError(d.error ?? 'Failed to delete account')
      }
    } catch {
      setError('Failed to delete account')
    } finally {
      setIsDeleting(false)
    }
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
            Signed in via <span className="font-medium capitalize">{provider}</span>
          </p>
        </div>
      </div>

      {/* Edit form */}
      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white p-5"
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
            <User
              className="ml-3 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]"
              aria-hidden="true"
            />
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
            <p className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
              Email address
            </p>
            <div className="flex h-11 items-center overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]">
              <Mail
                className="ml-3 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]"
                aria-hidden="true"
              />
              <span className="px-3 text-sm text-[var(--color-muted-foreground)]">{email}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              Email cannot be changed here.
            </p>
          </div>
        )}

        {/* Phone number — editable; stored in user_metadata */}
        <div>
          <label
            htmlFor="phone-number"
            className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]"
          >
            Contact phone number
          </label>
          <div className="flex h-11 items-center overflow-hidden rounded-lg border border-[var(--color-border)] focus-within:ring-2 focus-within:ring-[var(--color-ring)]">
            <Phone
              className="ml-3 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]"
              aria-hidden="true"
            />
            <input
              id="phone-number"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91 98765 43210"
              className="h-full flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[var(--color-muted-foreground)]"
              autoComplete="tel"
            />
          </div>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            Shared with buyers only after you accept their request.
          </p>
        </div>

        {error && (
          <p className="text-sm text-[var(--color-destructive)]" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={saving}>
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
          className="h-11 w-full gap-2 border-[var(--color-destructive)] text-sm font-medium text-[var(--color-destructive)] hover:bg-red-50"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out of all devices
        </Button>
      </div>

      {/* Data rights section */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-foreground)]">Your data</h2>
        <div className="flex flex-col gap-3">
          <a
            href="/api/user/export"
            download
            className="text-sm text-[var(--color-accent)] underline"
          >
            Download all my data (JSON)
          </a>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-left text-sm text-red-600 underline"
          >
            Delete my account
          </button>
        </div>
        {showDeleteConfirm && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="mb-3 text-sm text-red-800">
              This permanently deletes your account and all personal data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded border px-3 py-1 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-60"
              >
                {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
