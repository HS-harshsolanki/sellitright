'use client'

import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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

type LoginStep = 'phone' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<LoginStep>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGoogleLogin() {
    setLoading(true)
    setError('')
    await signIn('google', { callbackUrl: '/' })
  }

  function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (phone.length !== 10) return
    setLoading(true)
    setError('')
    // In production, this would call an API to send OTP via SMS
    // For dev, we just move to the OTP step
    setTimeout(() => {
      setLoading(false)
      setStep('otp')
    }, 800)
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) return
    setLoading(true)
    setError('')

    const result = await signIn('phone-otp', {
      phone,
      otp,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Invalid OTP. In dev mode, use: 123456')
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <>
      {/* Logo */}
      <div className="mb-8 text-center">
        <Link href="/" className="inline-block" aria-label="SellItRight home">
          <span className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            Sell<span className="text-[var(--color-primary)]">It</span>Right
          </span>
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-[var(--color-foreground)]">Welcome back</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Sign in to manage your listings
        </p>
      </div>

      {/* Google sign-in */}
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full gap-3 border-[var(--color-border)] text-sm font-medium shadow-sm"
        onClick={handleGoogleLogin}
        disabled={loading}
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-xs text-[var(--color-muted-foreground)]">or</span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {step === 'phone' ? (
        /* Phone number input step */
        <form onSubmit={handleSendOtp} noValidate>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
            Mobile number
          </label>
          <div className="flex h-12 overflow-hidden rounded-lg border border-[var(--color-input)] focus-within:ring-2 focus-within:ring-[var(--color-ring)] focus-within:ring-offset-0">
            <span className="flex items-center border-r border-[var(--color-input)] bg-[var(--color-muted)] px-3 text-sm font-medium text-[var(--color-muted-foreground)] select-none">
              +91
            </span>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              className="h-full flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[var(--color-muted-foreground)]"
              autoComplete="tel-national"
              required
            />
          </div>

          <Button
            type="submit"
            className="mt-4 h-12 w-full text-sm font-semibold"
            disabled={phone.length !== 10 || loading}
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
                Sending OTP…
              </span>
            ) : (
              'Send OTP'
            )}
          </Button>
        </form>
      ) : (
        /* OTP verification step */
        <div className="animate-in fade-in duration-200">
          <form onSubmit={handleVerifyOtp} noValidate>
            <div className="mb-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); setError('') }}
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                &larr; Change number
              </button>
              <span className="text-sm text-[var(--color-muted-foreground)]">+91 {phone}</span>
            </div>

            <label htmlFor="otp" className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
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
              className="h-12 w-full rounded-lg border border-[var(--color-input)] bg-transparent px-4 text-center text-lg tracking-[0.5em] outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
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
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Verifying…
                </span>
              ) : (
                'Verify & Sign In'
              )}
            </Button>

            <p className="mt-3 text-center text-xs text-[var(--color-muted-foreground)]">
              Didn&apos;t receive OTP?{' '}
              <button type="button" className="font-medium text-[var(--color-primary)] hover:underline">
                Resend
              </button>
            </p>
          </form>
        </div>
      )}

      {/* Register link */}
      <p className="mt-6 text-center text-sm text-[var(--color-muted-foreground)]">
        New to SellItRight?{' '}
        <Link
          href="/register"
          className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          Create account
        </Link>
      </p>
    </>
  )
}
