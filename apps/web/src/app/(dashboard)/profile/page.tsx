'use client'

import {
  AlertCircle,
  CheckCircle2,
  LogOut,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase/client'
import { useAuth } from '@/lib/supabase/auth-context'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

import type { ConfirmationResult, RecaptchaVerifier as RV } from 'firebase/auth'

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

const WA_COLOR = '#25D366'

function WhatsAppIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

type PhoneFlowState = 'idle' | 'sending' | 'otp-sent' | 'verifying' | 'verified'

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)
  const verifierRef = useRef<RV | null>(null)
  const confirmationRef = useRef<ConfirmationResult | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [nameError, setNameError] = useState('')

  const [phoneInput, setPhoneInput] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [flowState, setFlowState] = useState<PhoneFlowState>('idle')
  const [phoneError, setPhoneError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
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

  async function initVerifier(): Promise<RV> {
    if (verifierRef.current) {
      try {
        verifierRef.current.clear()
      } catch {
        /* ignore */
      }
      verifierRef.current = null
    }
    const { RecaptchaVerifier } = await import('firebase/auth')
    const container = recaptchaContainerRef.current!
    container.innerHTML = ''
    const anchor = document.createElement('div')
    container.appendChild(anchor)
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase not available')
    const verifier = new RecaptchaVerifier(auth, anchor, {
      size: 'invisible',
    })
    verifierRef.current = verifier
    return verifier
  }

  async function handleSendOtp() {
    setPhoneError('')
    const normalized = normalizePhone(phoneInput)
    if (!INDIAN_MOBILE_RE.test(normalized)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number (e.g. 98765 43210)')
      return
    }
    setFlowState('sending')
    try {
      if (!isFirebaseConfigured()) {
        // Fallback: MSG91 route when Firebase keys not yet set
        const res = await fetch('/api/phone/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: normalized }),
        })
        const data = (await res.json()) as { error?: string }
        if (!res.ok) {
          setPhoneError(data.error ?? 'Failed to send OTP. Please try again.')
          setFlowState('idle')
          return
        }
        setFlowState('otp-sent')
        startCooldown(30)
        return
      }

      const { signInWithPhoneNumber } = await import('firebase/auth')
      const verifier = await initVerifier()
      const TIMEOUT_MS = 15_000
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(new Error('OTP request timed out. Please check your connection and try again.')),
          TIMEOUT_MS,
        ),
      )
      const confirmation = await Promise.race([
        signInWithPhoneNumber(getFirebaseAuth()!, `+91${normalized}`, verifier),
        timeoutPromise,
      ])
      confirmationRef.current = confirmation
      setFlowState('otp-sent')
      startCooldown(30)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (
        (msg.includes('provider-already-linked') || msg.includes('credential-already-in-use')) &&
        getFirebaseAuth()?.currentUser
      ) {
        // Already linked — just update Supabase metadata
        try {
          const idToken = await getFirebaseAuth()!.currentUser!.getIdToken(/* forceRefresh */ true)
          const res = await fetch('/api/phone/firebase-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          })
          if (res.ok) {
            await createClient().auth.refreshSession()
            setFlowState('verified')
            setOtpInput('')
          } else {
            const data = (await res.json()) as { error?: string }
            setPhoneError(data.error ?? 'Verification failed.')
            setFlowState('idle')
          }
        } catch {
          setPhoneError('Verification failed. Please try again.')
          setFlowState('idle')
        }
        return
      }
      console.error('[Firebase OTP] sendOTP error:', err)
      const isTooMany = msg.includes('too-many-requests')
      const friendlyMsg = isTooMany
        ? 'Too many attempts. Please wait 5 minutes and try again.'
        : msg.includes('invalid-phone-number')
          ? "That doesn't look like a valid phone number."
          : 'Failed to send OTP. Please try again.'
      setPhoneError(friendlyMsg)
      if (isTooMany) startCooldown(300)
      setFlowState('idle')
      verifierRef.current?.clear()
      verifierRef.current = null
    }
  }

  async function handleVerifyOtp() {
    setPhoneError('')
    const normalized = normalizePhone(phoneInput)
    const digits = otpInput.replace(/\D/g, '').slice(0, 6)
    if (digits.length !== 6) {
      setPhoneError('Enter the 6-digit OTP from the SMS.')
      return
    }
    setFlowState('verifying')
    try {
      if (!isFirebaseConfigured() || !confirmationRef.current) {
        // Fallback: MSG91 verify
        const res = await fetch('/api/phone/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: normalized, otp: digits }),
        })
        const data = (await res.json()) as { error?: string }
        if (!res.ok) {
          setPhoneError(data.error ?? 'Verification failed. Please try again.')
          setFlowState('otp-sent')
          return
        }
        await createClient().auth.refreshSession()
        setFlowState('verified')
        setOtpInput('')
        return
      }

      const result = await confirmationRef.current.confirm(digits)
      const idToken = await result.user.getIdToken(/* forceRefresh */ true)
      const res = await fetch('/api/phone/firebase-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setPhoneError(data.error ?? 'Verification failed. Please try again.')
        setFlowState('otp-sent')
        return
      }
      await createClient().auth.refreshSession()
      setFlowState('verified')
      setOtpInput('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('invalid-verification-code') || msg.includes('code-expired')) {
        setPhoneError('Incorrect or expired OTP. Please try again.')
      } else {
        setPhoneError('Network error — please check your connection.')
      }
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
      <div>
        <h1 className="text-xl font-bold text-[var(--color-foreground)] sm:text-2xl">My Profile</h1>
        <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
          Manage your account details
        </p>
      </div>

      {/* Invisible reCAPTCHA anchor for Firebase phone auth */}
      <div ref={recaptchaContainerRef} />

      {flowState !== 'verified' && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
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
          {flowState === 'verified' && verifiedPhone && (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-green-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              +91 {verifiedPhone} verified
            </p>
          )}
        </div>
      </div>

      {/* Phone verification card */}
      <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white p-5">
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-[var(--color-primary)]" />
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
          <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
            Your phone number <span className="font-semibold">+91 {verifiedPhone}</span> is
            verified. Buyers can reach you directly after their request is accepted.
            <button
              type="button"
              onClick={() => {
                setFlowState('idle')
                setPhoneInput('')
                setOtpInput('')
                setPhoneError('')
                confirmationRef.current = null
              }}
              className="ml-2 text-xs underline opacity-60 hover:opacity-100"
            >
              Change number
            </button>
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
                  'flex h-11 items-center overflow-hidden rounded-lg border',
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
                  }}
                  disabled={
                    flowState === 'otp-sent' || flowState === 'verifying' || flowState === 'sending'
                  }
                  placeholder="98765 43210"
                  className="h-full flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[var(--color-muted-foreground)] disabled:cursor-not-allowed"
                  autoComplete="tel"
                />
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                We&apos;ll send a one-time code via SMS to this number.
              </p>
            </div>

            {/* OTP input — shown after sending */}
            {(flowState === 'otp-sent' || flowState === 'verifying') && (
              <div>
                <label
                  htmlFor="otp-input"
                  className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]"
                >
                  6-digit SMS code
                </label>
                <div className="flex gap-3">
                  <div
                    className={cn(
                      'flex h-11 flex-1 items-center overflow-hidden rounded-lg border',
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
                      'flex h-11 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-all',
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
                      confirmationRef.current = null
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
                  Check your SMS messages for a 6-digit code. Valid for 5 minutes.
                </p>
              </div>
            )}

            {/* Send OTP button */}
            {flowState === 'idle' && (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSending || !phoneInputValid}
                className={cn(
                  'flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition-all',
                  'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                  isSending || !phoneInputValid
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
                {phoneError}
              </p>
            )}
          </>
        )}
      </div>

      {/* Display name form */}
      <form
        onSubmit={handleSaveName}
        className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white p-5"
      >
        <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Account details</h2>
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
        {nameError && (
          <p className="text-sm text-[var(--color-destructive)]" role="alert">
            {nameError}
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
              Save name
            </span>
          )}
        </Button>
      </form>

      {/* Session */}
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

      {/* Data rights */}
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
