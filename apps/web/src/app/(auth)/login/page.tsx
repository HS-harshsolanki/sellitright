'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

import { ChapterNewLogo } from '@/components/layout/chapternew-logo'
import { Button } from '@/components/ui/button'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

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

const MailIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 7l10 7 10-7" />
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

function LoginPageInner() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/properties'

  const [loading, setLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)

  async function handleGoogleLogin() {
    if (!isSupabaseConfigured()) {
      setError('Sign-in is temporarily unavailable. Please try again later.')
      return
    }
    setLoading(true)
    setError('')
    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
        },
      },
    })
    if (oauthError) {
      console.error('[login] OAuth error:', oauthError.message)
      setError('Sign-in failed. Please try again.')
      setLoading(false)
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !isSupabaseConfigured()) {
      setError('Sign-in is temporarily unavailable. Please try again later.')
      return
    }
    setEmailLoading(true)
    setError('')
    const { error: otpError } = await createClient().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        shouldCreateUser: true,
      },
    })
    setEmailLoading(false)
    if (otpError) {
      console.error('[login] Email OTP error:', otpError.message)
      setError('Could not send sign-in link. Please try again.')
      return
    }
    setEmailSent(true)
  }

  const callbackError = searchParams.get('error')
  const showError = error || callbackError

  return (
    <>
      <div className="mb-8 text-center">
        <div className="flex justify-center">
          <ChapterNewLogo size="md" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-[var(--color-foreground)]">Welcome back</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Sign in to manage your listings
        </p>
      </div>

      {showError && (
        <div
          className="border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/5 mb-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm text-[var(--color-destructive)]"
          role="alert"
          aria-live="polite"
        >
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
          <span>{error || callbackError || 'Sign-in failed. Please try again.'}</span>
        </div>
      )}

      {emailSent ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-center">
          <div className="mb-2 flex justify-center">
            <svg
              viewBox="0 0 24 24"
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-green-800">Check your email</p>
          <p className="mt-1 text-xs text-green-700">
            We sent a sign-in link to <strong>{email}</strong>. Click it to log in — no password
            needed.
          </p>
          <button
            type="button"
            onClick={() => {
              setEmailSent(false)
              setEmail('')
              setShowEmailForm(false)
            }}
            className="mt-3 text-xs text-green-700 underline underline-offset-2 hover:text-green-900"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full gap-3 border-[var(--color-border)] text-sm font-medium shadow-sm"
            onClick={handleGoogleLogin}
            disabled={loading || emailLoading}
          >
            {loading ? <Spinner /> : <GoogleIcon />}
            {loading ? 'Redirecting to Google…' : 'Continue with Google'}
          </Button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--color-border)]" />
            <span className="text-xs text-[var(--color-muted-foreground)]">or</span>
            <div className="h-px flex-1 bg-[var(--color-border)]" />
          </div>

          {showEmailForm ? (
            <form onSubmit={handleEmailLogin} className="space-y-3">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="focus:ring-[var(--color-foreground)]/10 h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] px-4 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-foreground)] focus:bg-white focus:outline-none focus:ring-2"
                  disabled={emailLoading}
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                className="h-12 w-full gap-3 border-[var(--color-border)] text-sm font-medium shadow-sm"
                disabled={emailLoading || !email.trim()}
              >
                {emailLoading ? <Spinner /> : <MailIcon />}
                {emailLoading ? 'Sending link…' : 'Send sign-in link'}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setShowEmailForm(false)
                  setError('')
                }}
                className="w-full text-center text-xs text-[var(--color-muted-foreground)] underline underline-offset-2 hover:text-[var(--color-foreground)]"
              >
                Back
              </button>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full gap-3 border-[var(--color-border)] text-sm font-medium shadow-sm"
              onClick={() => setShowEmailForm(true)}
              disabled={loading}
            >
              <MailIcon />
              Continue with Email
            </Button>
          )}
        </>
      )}

      <p className="mt-6 text-center text-xs text-[var(--color-muted-foreground)]">
        By continuing, you agree to our{' '}
        <Link
          href="/terms"
          className="underline underline-offset-4 hover:text-[var(--color-foreground)]"
        >
          Terms
        </Link>{' '}
        and{' '}
        <Link
          href="/privacy"
          className="underline underline-offset-4 hover:text-[var(--color-foreground)]"
        >
          Privacy Policy
        </Link>
        .
      </p>

      <p className="mt-4 text-center text-sm text-[var(--color-muted-foreground)]">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  )
}
