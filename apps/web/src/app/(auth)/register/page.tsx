'use client'

import Link from 'next/link'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

type RegisterStep = 'details' | 'otp'

interface FormState {
  name: string
  phone: string
  email: string
}

function RegisterPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'

  const supabase = createClient()

  const [step, setStep] = useState<RegisterStep>('details')
  const [form, setForm] = useState<FormState>({ name: '', phone: '', email: '' })
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  function handleChange(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === 'phone' ? e.target.value.replace(/\D/g, '') : e.target.value
      setForm((prev) => ({ ...prev, [field]: value }))
    }
  }

  async function handleGoogleSignUp() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  function startResendTimer() {
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(interval); return 0 }
        return c - 1
      })
    }, 1000)
  }

  async function sendOtp() {
    const { error } = await supabase.auth.signInWithOtp({
      phone: `+91${form.phone}`,
      options: {
        data: {
          full_name: form.name.trim(),
          ...(form.email.trim() ? { email: form.email.trim() } : {}),
        },
      },
    })
    return error
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (form.phone.length !== 10) return
    setLoading(true)
    setError('')

    const err = await sendOtp()
    setLoading(false)

    if (err) {
      setError(err.message)
    } else {
      setStep('otp')
      startResendTimer()
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return
    setLoading(true)
    setError('')
    const err = await sendOtp()
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      startResendTimer()
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) return
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.verifyOtp({
      phone: `+91${form.phone}`,
      token: otp,
      type: 'sms',
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      router.push(next.startsWith('/') ? next : '/')
      router.refresh()
    }
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
        onClick={handleGoogleSignUp}
        disabled={loading}
      >
        {loading && step === 'details' ? <Spinner /> : <GoogleIcon />}
        Sign up with Google
      </Button>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-xs text-[var(--color-muted-foreground)]">or fill in details</span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
          aria-live="polite"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {step === 'details' ? (
        <form onSubmit={handleSendOtp} noValidate className="space-y-4">
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
              className="h-12 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm outline-none placeholder:text-[var(--color-muted-foreground)] focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-0"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
              Mobile number
            </label>
            <div className="flex h-12 overflow-hidden rounded-lg border border-[var(--color-border)] focus-within:ring-2 focus-within:ring-[var(--color-ring)]">
              <span className="flex items-center border-r border-[var(--color-border)] bg-[var(--color-muted)] px-3 text-sm font-medium text-[var(--color-muted-foreground)] select-none">
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
              className="h-12 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm outline-none placeholder:text-[var(--color-muted-foreground)] focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-0"
            />
          </div>

          <Button
            type="submit"
            className="h-12 w-full text-sm font-semibold"
            disabled={!isValid || loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner />
                Sending OTP…
              </span>
            ) : (
              'Continue'
            )}
          </Button>
        </form>
      ) : (
        <div className="animate-in fade-in duration-200">
          <form onSubmit={handleVerifyOtp} noValidate>
            <div className="mb-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setStep('details'); setOtp(''); setError('') }}
                className="text-sm text-[var(--color-primary)] hover:underline focus-visible:outline-none"
              >
                &larr; Back
              </button>
              <span className="text-sm text-[var(--color-muted-foreground)]">+91 {form.phone}</span>
            </div>

            <label
              htmlFor="otp"
              className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]"
            >
              Enter 6-digit OTP
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="• • • • • •"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="h-12 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-4 text-center text-lg tracking-[0.5em] outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              autoComplete="one-time-code"
              autoFocus
              required
            />

            <Button
              type="submit"
              className="mt-4 h-12 w-full text-sm font-semibold"
              disabled={otp.length !== 6 || loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  Verifying…
                </span>
              ) : (
                'Verify & Create Account'
              )}
            </Button>

            <p className="mt-3 text-center text-xs text-[var(--color-muted-foreground)]">
              Didn&apos;t receive OTP?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="font-medium text-[var(--color-primary)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
              </button>
            </p>
          </form>
        </div>
      )}

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

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterPageInner />
    </Suspense>
  )
}
