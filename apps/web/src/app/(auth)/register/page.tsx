'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
)

interface FormState {
  name: string
  phone: string
  email: string
}

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>({ name: '', phone: '', email: '' })
  const [loading, setLoading] = useState(false)

  function handleChange(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === 'phone' ? e.target.value.replace(/\D/g, '') : e.target.value
      setForm((prev) => ({ ...prev, [field]: value }))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // TODO: wire up registration flow
    setTimeout(() => setLoading(false), 1500)
  }

  const isValid = form.name.trim().length > 1 && form.phone.length === 10

  return (
    <>
      {/* Logo */}
      <div className="mb-8 text-center">
        <Link href="/" className="inline-block" aria-label="SellItRight home">
          <span className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            Sell<span className="text-[var(--color-primary)]">It</span>Right
          </span>
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-[var(--color-foreground)]">Create your account</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Join thousands of buyers and sellers across India
        </p>
      </div>

      {/* Google sign-up */}
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full gap-3 border-[var(--color-border)] text-sm font-medium shadow-sm"
        onClick={() => {
          // TODO: trigger next-auth Google sign-in
        }}
      >
        <GoogleIcon />
        Sign up with Google
      </Button>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-xs text-[var(--color-muted-foreground)]">or fill in details</span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      {/* Registration form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
            Full name
          </label>
          <input
            id="name"
            type="text"
            placeholder="Rajesh Kumar"
            value={form.name}
            onChange={handleChange('name')}
            autoComplete="name"
            required
            className="h-12 w-full rounded-lg border border-[var(--color-input)] bg-transparent px-3 text-sm outline-none placeholder:text-[var(--color-muted-foreground)] focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-0"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
            Mobile number
          </label>
          <div className="flex h-12 overflow-hidden rounded-lg border border-[var(--color-input)] focus-within:ring-2 focus-within:ring-[var(--color-ring)]">
            <span className="flex items-center border-r border-[var(--color-input)] bg-[var(--color-muted)] px-3 text-sm font-medium text-[var(--color-muted-foreground)] select-none">
              +91
            </span>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="98765 43210"
              value={form.phone}
              onChange={handleChange('phone')}
              autoComplete="tel-national"
              required
              className="h-full flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[var(--color-muted-foreground)]"
            />
          </div>
        </div>

        {/* Email (optional) */}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
            Email{' '}
            <span className="font-normal text-[var(--color-muted-foreground)]">(optional)</span>
          </label>
          <input
            id="email"
            type="email"
            placeholder="rajesh@example.com"
            value={form.email}
            onChange={handleChange('email')}
            autoComplete="email"
            className="h-12 w-full rounded-lg border border-[var(--color-input)] bg-transparent px-3 text-sm outline-none placeholder:text-[var(--color-muted-foreground)] focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-0"
          />
        </div>

        <Button
          type="submit"
          className="h-12 w-full text-sm font-semibold"
          disabled={!isValid || loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Creating account…
            </span>
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      {/* Login link */}
      <p className="mt-6 text-center text-sm text-[var(--color-muted-foreground)]">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  )
}
