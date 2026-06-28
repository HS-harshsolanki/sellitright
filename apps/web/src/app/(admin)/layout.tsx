'use client'

import React, { useState } from 'react'

import { AdminAuthProvider, useAdminLogin } from '@/components/admin/admin-auth-context'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function AdminKeyGate({ onSuccess }: { onSuccess: () => void }) {
  const [keyInput, setKeyInput] = useState('')
  const { login, loading, error } = useAdminLogin()

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-muted)]">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void login(keyInput, onSuccess)
        }}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-sm"
      >
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded bg-[var(--color-foreground)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
              Admin
            </span>
            <span className="text-sm font-semibold text-[var(--color-foreground)]">
              SellItRight
            </span>
          </div>
          <h1 className="text-xl font-bold text-[var(--color-foreground)]">Admin Access</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Enter your admin key to continue.
          </p>
        </div>
        <Input
          type="password"
          placeholder="Admin key"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          autoFocus
          autoComplete="current-password"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading || !keyInput.trim()}>
          {loading ? 'Verifying...' : 'Unlock'}
        </Button>
      </form>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [validating, setValidating] = useState(true)

  return (
    <AdminAuthProvider
      onAuthenticated={(ok) => {
        setAuthenticated(ok)
        setValidating(false)
      }}
    >
      <AdminLayoutInner
        authenticated={authenticated}
        validating={validating}
        onSuccess={() => setAuthenticated(true)}
      >
        {children}
      </AdminLayoutInner>
    </AdminAuthProvider>
  )
}

function AdminLayoutInner({
  authenticated,
  validating,
  onSuccess,
  children,
}: {
  authenticated: boolean
  validating: boolean
  onSuccess: () => void
  children: React.ReactNode
}) {
  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-muted)]">
        <p className="text-sm text-[var(--color-muted-foreground)]">Loading...</p>
      </div>
    )
  }

  if (!authenticated) {
    return <AdminKeyGate onSuccess={onSuccess} />
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-muted)]">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
