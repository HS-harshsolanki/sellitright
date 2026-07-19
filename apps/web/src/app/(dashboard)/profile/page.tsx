'use client'

import {
  AlertCircle,
  CheckCircle2,
  LogOut,
  Mail,
  Phone,
  Save,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/supabase/auth-context'
import {
  createClient,
  isSupabaseConfigured as isSupabaseConfiguredLocal,
} from '@/lib/supabase/client'
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

type PhoneFlowState = 'idle' | 'sending' | 'otp-sent' | 'verifying' | 'verified'

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [nameError, setNameError] = useState('')

  const [phoneInput, setPhoneInput] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [flowState, setFlowState] = useState<PhoneFlowState>('idle')
  const [phoneError, setPhoneError] = useState('')
  const [phoneAlreadyClaimed, setPhoneAlreadyClaimed] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [phoneAvailability, setPhoneAvailability] = useState<
    'unknown' | 'checking' | 'available' | 'taken'
  >('unknown')

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  // Refresh the session on mount so user_metadata reflects the latest server state.
  // The cached JWT may be stale if phone was verified in a previous tab/session.
  useEffect(() => {
    if (!isSupabaseConfiguredLocal()) return
    createClient()
      .auth.refreshSession()
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.full_name ?? '')
      setPhoneInput(user.user_metadata?.phone ?? user.phone ?? '')
      if (user.user_metadata?.phone_verified) setFlowState('verified')
    }
  }, [user])

  useEffect(() => {
    if (!loading && !user) router.replace('/login?next=/profile')
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
  const verifiedPhone: string = user.user_metadata?.phone_verified
    ? (user.user_metadata?.phone ?? '')
    : ''

  const memberSince = (() => {
    const raw = user.created_at
    if (!raw) return null
    const d = new Date(raw)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  })()

  const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/
  function normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '')
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
    return digits
  }

  function startCooldown(seconds = 30) {
    setResendCooldown(seconds)
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handlePhoneBlur() {
    const normalized = normalizePhone(phoneInput)
    if (!INDIAN_MOBILE_RE.test(normalized)) return
    setPhoneAvailability('checking')
    try {
      const res = await fetch(`/api/phone/check-availability?phone=${normalized}`)
      if (!res.ok) {
        setPhoneAvailability('unknown')
        return
      }
      const data = (await res.json()) as { available?: boolean }
      if (data.available) {
        setPhoneAvailability('available')
      } else {
        setPhoneAvailability('taken')
        setPhoneAlreadyClaimed(true)
        setPhoneError('taken')
      }
    } catch {
      setPhoneAvailability('unknown')
    }
  }

  async function handleSendOtp() {
    setPhoneError('')
    setPhoneAlreadyClaimed(false)
    const normalized = normalizePhone(phoneInput)
    if (!INDIAN_MOBILE_RE.test(normalized)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number (e.g. 98765 43210)')
      return
    }
    setFlowState('sending')
    try {
      const res = await fetch('/api/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      })
      const data = (await res.json()) as { error?: string; code?: string }
      if (!res.ok) {
        if (res.status === 409 || data.code === 'PHONE_ALREADY_CLAIMED') {
          setPhoneAvailability('taken')
          setPhoneAlreadyClaimed(true)
          setPhoneError('taken')
        } else {
          setPhoneError(data.error ?? 'Failed to send OTP. Please try again.')
        }
        setFlowState('idle')
        return
      }
      setFlowState('otp-sent')
      startCooldown(30)
    } catch {
      setPhoneError('Failed to send OTP. Please check your connection.')
      setFlowState('idle')
    }
  }

  async function handleVerifyOtp() {
    setPhoneError('')
    const normalized = normalizePhone(phoneInput)
    const digits = otpInput.replace(/\D/g, '').slice(0, 6)
    if (digits.length !== 6) {
      setPhoneError('Enter the 6-digit OTP from SMS.')
      return
    }
    setFlowState('verifying')
    try {
      const res = await fetch('/api/phone/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, otp: digits }),
      })
      const data = (await res.json()) as { error?: string; code?: string }
      if (!res.ok) {
        if (res.status === 409 || data.code === 'PHONE_ALREADY_CLAIMED') {
          setPhoneAlreadyClaimed(true)
          setPhoneError('taken')
        } else {
          setPhoneError(data.error ?? 'Verification failed. Please try again.')
        }
        setFlowState('otp-sent')
        return
      }
      await createClient().auth.refreshSession()
      setFlowState('verified')
      setOtpInput('')
    } catch {
      setPhoneError('Network error — please check your connection.')
      setFlowState('otp-sent')
    }
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setNameError('')
    setSaved(false)
    const { error } = await createClient().auth.updateUser({ data: { full_name: displayName } })
    setSaving(false)
    if (error) {
      setNameError('Failed to save name. Please try again.')
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
        setNameError(d.error ?? 'Failed to delete account')
      }
    } catch {
      setNameError('Failed to delete account')
    } finally {
      setIsDeleting(false)
    }
  }

  const normalizedInput = normalizePhone(phoneInput)
  const phoneInputValid = INDIAN_MOBILE_RE.test(normalizedInput)
  const isSending = flowState === 'sending'
  const isVerifying = flowState === 'verifying'

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
          My Profile
        </h1>
        <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
          Manage your account details
        </p>
      </div>

      {/* Unverified phone banner */}
      {flowState !== 'verified' && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Verify your phone number</span> to post properties and
            receive buyer inquiries.
          </p>
        </div>
      )}

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
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-2xl font-bold text-white">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-[var(--color-foreground)]">
            {displayName || email || 'Anonymous'}
          </p>
          {email && (
            <p className="mt-0.5 truncate text-sm text-[var(--color-muted-foreground)]">{email}</p>
          )}
          {flowState === 'verified' && verifiedPhone && (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-green-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              +91 {verifiedPhone} verified
            </p>
          )}
          {memberSince && (
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              Member since {memberSince}
            </p>
          )}
        </div>
      </div>

      {/* Phone verification card */}
      <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white p-5">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-[var(--color-primary)]" />
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
            Phone verification
          </h2>
          {flowState === 'verified' && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verified
            </span>
          )}
        </div>

        {flowState === 'verified' ? (
          <div className="flex items-start gap-2 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-800">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
            <span>
              Your phone number <span className="font-semibold">+91 {verifiedPhone}</span> is
              verified. Buyers can reach you directly after their request is accepted.
              <button
                type="button"
                onClick={() => {
                  setFlowState('idle')
                  setPhoneInput('')
                  setOtpInput('')
                  setPhoneError('')
                  setPhoneAlreadyClaimed(false)
                  setPhoneAvailability('unknown')
                }}
                className="ml-2 text-xs underline opacity-60 hover:opacity-100"
              >
                Change number
              </button>
            </span>
          </div>
        ) : (
          <>
            {/* Phone input */}
            <div>
              <label
                htmlFor="phone-number"
                className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]"
              >
                Phone number <span className="text-[var(--color-destructive)]">*</span>
              </label>
              <div
                className={cn(
                  'flex h-11 items-center overflow-hidden rounded-xl border',
                  phoneError && flowState === 'idle'
                    ? 'border-[var(--color-destructive)]'
                    : 'border-[var(--color-border)]',
                  'focus-within:ring-2 focus-within:ring-[var(--color-ring)]',
                  (flowState === 'otp-sent' || flowState === 'verifying') &&
                    'bg-[var(--color-muted)]',
                )}
              >
                <span className="ml-3 shrink-0 text-sm font-medium text-[var(--color-muted-foreground)]">
                  +91
                </span>
                <input
                  id="phone-number"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phoneInput}
                  onChange={(e) => {
                    setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))
                    setPhoneError('')
                    setPhoneAlreadyClaimed(false)
                    setPhoneAvailability('unknown')
                  }}
                  onBlur={handlePhoneBlur}
                  disabled={
                    flowState === 'otp-sent' || flowState === 'verifying' || flowState === 'sending'
                  }
                  placeholder="98765 43210"
                  className="h-full flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[var(--color-muted-foreground)] disabled:cursor-not-allowed"
                  autoComplete="tel"
                />
              </div>
              {phoneAvailability === 'checking' ? (
                <p className="mt-1 flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
                  <Spinner className="h-3 w-3" />
                  Checking availability…
                </p>
              ) : (
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  We&apos;ll send a one-time code via SMS to this number.
                </p>
              )}
            </div>

            {/* OTP input — shown after sending */}
            {(flowState === 'otp-sent' || flowState === 'verifying') && (
              <div>
                <label
                  htmlFor="otp-input"
                  className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]"
                >
                  6-digit SMS OTP
                </label>
                <div className="flex gap-3">
                  <div
                    className={cn(
                      'flex h-11 flex-1 items-center overflow-hidden rounded-xl border',
                      phoneError
                        ? 'border-[var(--color-destructive)]'
                        : 'border-[var(--color-border)]',
                      'focus-within:ring-2 focus-within:ring-[var(--color-ring)]',
                    )}
                  >
                    <input
                      id="otp-input"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="one-time-code"
                      placeholder="••••••"
                      value={otpInput}
                      onChange={(e) => {
                        setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))
                        setPhoneError('')
                      }}
                      disabled={isVerifying}
                      className="h-full w-full bg-transparent px-4 text-center text-lg font-bold tracking-widest outline-none placeholder:text-[var(--color-muted-foreground)] disabled:opacity-50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={isVerifying || otpInput.replace(/\D/g, '').length < 6}
                    className={cn(
                      'flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition-all',
                      'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                      isVerifying || otpInput.replace(/\D/g, '').length < 6
                        ? 'bg-[var(--color-primary)]/50 cursor-not-allowed'
                        : 'hover:bg-[var(--color-primary)]/90 bg-[var(--color-primary)] active:scale-[0.98]',
                    )}
                  >
                    {isVerifying && <Spinner className="h-4 w-4" />}
                    {isVerifying ? 'Verifying…' : 'Verify'}
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFlowState('idle')
                      setOtpInput('')
                      setPhoneError('')
                    }}
                    className="text-xs text-[var(--color-muted-foreground)] underline hover:text-[var(--color-foreground)]"
                  >
                    Change number
                  </button>
                  <span className="text-[var(--color-muted-foreground)]">·</span>
                  {resendCooldown > 0 ? (
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setOtpInput('')
                        setPhoneError('')
                        void handleSendOtp()
                      }}
                      className="text-xs text-[var(--color-primary)] underline"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                  <Phone className="h-3.5 w-3.5" />
                  Check your SMS messages for a 6-digit code. Valid for 10 minutes.
                </p>
              </div>
            )}

            {/* Send OTP button */}
            {flowState === 'idle' && (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSending || !phoneInputValid || phoneAvailability === 'taken'}
                className={cn(
                  'flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition-all',
                  'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                  isSending || !phoneInputValid || phoneAvailability === 'taken'
                    ? 'cursor-not-allowed opacity-50'
                    : 'active:scale-[0.98]',
                  'bg-[var(--color-primary)]',
                )}
              >
                {isSending ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Sending OTP…
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4" />
                    Send OTP via SMS
                  </>
                )}
              </button>
            )}

            {phoneError && (
              <p
                className="flex items-center gap-1.5 text-sm text-[var(--color-destructive)]"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {phoneAlreadyClaimed ? (
                  <>
                    This number is already registered to another account. If this is your number,{' '}
                    <a
                      href="mailto:support@chapternew.com?subject=Phone%20number%20conflict"
                      className="underline hover:opacity-80"
                    >
                      contact support
                    </a>
                    .
                  </>
                ) : (
                  phoneError
                )}
              </p>
            )}
          </>
        )}
      </div>

      {/* Account details form */}
      <form
        onSubmit={handleSaveName}
        className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white p-5"
      >
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-[var(--color-primary)]" />
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Account details</h2>
        </div>
        <div>
          <label
            htmlFor="display-name"
            className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]"
          >
            Display name
          </label>
          <div className="flex h-11 items-center overflow-hidden rounded-xl border border-[var(--color-border)] focus-within:ring-2 focus-within:ring-[var(--color-ring)]">
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
        {email && (
          <div>
            <p className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
              Email address
            </p>
            <div className="flex h-11 items-center overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]">
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
        {nameError && (
          <p className="text-sm text-[var(--color-destructive)]" role="alert">
            {nameError}
          </p>
        )}
        <Button
          type="submit"
          className="h-11 w-full rounded-full text-sm font-semibold"
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
              Save name
            </span>
          )}
        </Button>
      </form>

      {/* Session */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <LogOut className="h-4 w-4 text-red-500" />
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Session</h2>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full gap-2 rounded-full border-[var(--color-destructive)] text-sm font-medium text-[var(--color-destructive)] hover:bg-red-50"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out of all devices
        </Button>
      </div>

      {/* Data rights */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-[var(--color-primary)]" />
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Your data</h2>
        </div>
        <div className="flex flex-col gap-3">
          <a
            href="/api/user/export"
            download
            className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
          >
            Download all my data (JSON)
          </a>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex h-9 items-center justify-center rounded-full border border-red-200 px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Delete my account
          </button>
        </div>
        {showDeleteConfirm && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="mb-3 text-sm text-red-800">
              This permanently deletes your account and all personal data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="inline-flex h-9 items-center rounded-full border border-[var(--color-border)] bg-white px-4 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="inline-flex h-9 items-center rounded-full bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
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
