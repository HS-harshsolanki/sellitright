'use client'

import { AlertCircle, CheckCircle2, Loader2, Phone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { firebaseAuth, isFirebaseConfigured } from '@/lib/firebase/client'
import { INDIAN_MOBILE_RE, normalizePhone } from '@/lib/phone'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

import type { ConfirmationResult, RecaptchaVerifier as RV } from 'firebase/auth'

const RESEND_COOLDOWN = 30

interface InlinePhoneVerificationProps {
  onVerified: (phone: string) => void
}

function maskPhone(normalized: string): string {
  return normalized.slice(0, 5) + ' ' + '*'.repeat(5)
}

export function InlinePhoneVerification({ onVerified }: InlinePhoneVerificationProps) {
  type FlowState = 'idle' | 'sending' | 'otp_sent' | 'verified'

  const [flowState, setFlowState] = useState<FlowState>('idle')
  const [inlinePhone, setInlinePhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const recaptchaContainerRef = useRef<HTMLDivElement>(null)
  const verifierRef = useRef<RV | null>(null)
  const confirmationRef = useRef<ConfirmationResult | null>(null)

  const normalized = normalizePhone(inlinePhone)
  const phoneValid = INDIAN_MOBILE_RE.test(normalized)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  useEffect(() => {
    return () => {
      verifierRef.current?.clear()
      verifierRef.current = null
    }
  }, [])

  async function initVerifier(): Promise<RV> {
    const { RecaptchaVerifier } = await import('firebase/auth')
    if (verifierRef.current) {
      verifierRef.current.clear()
      verifierRef.current = null
    }
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = ''
    }
    const verifier = new RecaptchaVerifier(firebaseAuth, recaptchaContainerRef.current!, {
      size: 'invisible',
    })
    verifierRef.current = verifier
    return verifier
  }

  async function handleSendOtp() {
    if (!phoneValid || resendCooldown > 0) return
    setIsLoading(true)
    setFlowState('sending')
    setError(null)

    try {
      if (!isFirebaseConfigured()) {
        // Firebase not yet configured — fall back to MSG91 route
        const res = await fetch('/api/phone/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: normalized }),
        })
        const data = (await res.json()) as { error?: string; devOtp?: string }
        if (!res.ok) {
          setError(data.error ?? 'Failed to send OTP. Try again.')
          setFlowState('idle')
        } else {
          setFlowState('otp_sent')
          setResendCooldown(RESEND_COOLDOWN)
        }
        return
      }

      const { linkWithPhoneNumber } = await import('firebase/auth')
      const verifier = await initVerifier()
      const confirmation = await linkWithPhoneNumber(
        firebaseAuth.currentUser!,
        `+91${normalized}`,
        verifier,
      )
      confirmationRef.current = confirmation
      setFlowState('otp_sent')
      setResendCooldown(RESEND_COOLDOWN)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('provider-already-linked') || msg.includes('credential-already-in-use')) {
        await markVerifiedInSupabase(normalized)
        return
      }
      setError('Failed to send OTP. Please check your number and try again.')
      setFlowState('idle')
      verifierRef.current?.clear()
      verifierRef.current = null
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerifyOtp() {
    if (otp.length !== 6) return
    setIsLoading(true)
    setError(null)

    try {
      if (!isFirebaseConfigured() || !confirmationRef.current) {
        // Fallback to MSG91 verify
        const res = await fetch('/api/phone/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: normalized, otp }),
        })
        const data = (await res.json()) as { error?: string; phone?: string }
        if (!res.ok) {
          setError(data.error ?? 'Wrong OTP. Please try again.')
        } else {
          await finalizeVerification(data.phone ?? normalized)
        }
        return
      }

      const result = await confirmationRef.current.confirm(otp)
      const idToken = await result.user.getIdToken()
      const res = await fetch('/api/phone/firebase-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      const data = (await res.json()) as { error?: string; phone?: string }
      if (!res.ok) {
        setError(data.error ?? 'Verification failed. Please try again.')
      } else {
        await finalizeVerification(data.phone ?? normalized)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('invalid-verification-code') || msg.includes('code-expired')) {
        setError('Incorrect or expired OTP. Please try again.')
      } else {
        setError('Verification failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function markVerifiedInSupabase(phone: string) {
    const { getIdToken } = await import('firebase/auth')
    try {
      const idToken = await getIdToken(firebaseAuth.currentUser!)
      const res = await fetch('/api/phone/firebase-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      const data = (await res.json()) as { error?: string; phone?: string }
      if (res.ok) {
        await finalizeVerification(data.phone ?? phone)
      } else {
        setError(data.error ?? 'Verification failed.')
        setFlowState('idle')
      }
    } catch {
      setError('Verification failed. Please try again.')
      setFlowState('idle')
    } finally {
      setIsLoading(false)
    }
  }

  async function finalizeVerification(phone: string) {
    try {
      await createClient().auth.refreshSession()
    } catch {
      // best-effort
    }
    setFlowState('verified')
    onVerified(phone)
  }

  if (flowState === 'verified') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3.5"
      >
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
        <p className="text-sm font-medium text-green-800">Phone verified — you&apos;re all set!</p>
      </div>
    )
  }

  if (flowState === 'idle' || flowState === 'sending') {
    const isSending = flowState === 'sending'
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {isSending ? 'Sending OTP, please wait.' : ''}
        </span>

        {/* Invisible reCAPTCHA anchor — no visible UI */}
        <div ref={recaptchaContainerRef} />

        <div className="mb-3 flex items-start gap-2.5">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-semibold text-amber-900">Verify your phone to publish</h3>
            <p className="mt-0.5 text-xs text-amber-700">
              We&apos;ll send a 6-digit OTP via SMS — buyers need a way to reach you.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <label htmlFor="inline-phone" className="sr-only">
            Indian mobile number (10 digits)
          </label>
          <div
            className={cn(
              'flex flex-1 items-center overflow-hidden rounded-lg border border-amber-300 bg-white',
              !isSending &&
                'focus-within:ring-2 focus-within:ring-amber-400 focus-within:ring-offset-1',
            )}
          >
            <Phone className="ml-3 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <input
              id="inline-phone"
              type="tel"
              value={inlinePhone}
              onChange={(e) => {
                setInlinePhone(e.target.value)
                setError(null)
              }}
              placeholder="98765 43210"
              className="h-11 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-amber-600 disabled:opacity-50"
              autoComplete="tel"
              inputMode="numeric"
              disabled={isSending}
              aria-describedby={error ? 'phone-send-error' : undefined}
              aria-invalid={error ? 'true' : undefined}
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSendOtp()}
            disabled={isSending || !phoneValid}
            className={cn(
              'shrink-0 rounded-lg px-3 py-3 text-xs font-semibold text-white transition-opacity',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
              isSending || !phoneValid
                ? 'cursor-not-allowed bg-amber-200 text-amber-700'
                : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800',
            )}
            aria-disabled={isSending || !phoneValid}
          >
            {isSending ? (
              <span className="flex items-center gap-1.5">
                <Loader2
                  className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                <span>Sending…</span>
              </span>
            ) : (
              'Send OTP'
            )}
          </button>
        </div>

        {error && (
          <p
            id="phone-send-error"
            role="alert"
            className="mt-2 flex items-center gap-1 text-xs text-red-700"
          >
            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
      <div ref={recaptchaContainerRef} />

      <p id="otp-hint" className="mb-3 text-xs text-amber-800">
        OTP sent via SMS to{' '}
        <span className="font-semibold tracking-wide">+91 {maskPhone(normalized)}</span>
      </p>

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isLoading ? 'Verifying OTP, please wait.' : ''}
      </span>

      <label htmlFor="inline-otp" className="sr-only">
        6-digit OTP
      </label>

      <div className="flex gap-2">
        <input
          id="inline-otp"
          type="text"
          inputMode="numeric"
          value={otp}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 6)
            setOtp(val)
            setError(null)
          }}
          placeholder="6-digit OTP"
          maxLength={6}
          autoComplete="one-time-code"
          aria-describedby={`otp-hint${error ? ' otp-error' : ''}`}
          aria-invalid={error ? 'true' : undefined}
          className={cn(
            'h-11 flex-1 rounded-lg border border-amber-300 bg-white px-3 text-sm',
            'tracking-widest placeholder:tracking-normal placeholder:text-amber-600',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1',
          )}
        />
        <button
          type="button"
          onClick={() => void handleVerifyOtp()}
          disabled={isLoading || otp.length !== 6}
          className={cn(
            'shrink-0 rounded-lg px-4 py-3 text-xs font-semibold text-white transition-opacity',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
            isLoading || otp.length !== 6
              ? 'cursor-not-allowed bg-amber-200 text-amber-700'
              : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800',
          )}
          aria-disabled={isLoading || otp.length !== 6}
        >
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <Loader2
                className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              <span className="sr-only">Verifying…</span>
            </span>
          ) : (
            'Verify'
          )}
        </button>
      </div>

      {error && (
        <p
          id="otp-error"
          role="alert"
          className="mt-2 flex items-center gap-1 text-xs text-red-700"
        >
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleSendOtp()}
        disabled={isLoading || resendCooldown > 0}
        className={cn(
          'mt-2.5 block px-1 py-2 text-xs text-amber-700 underline underline-offset-2',
          'hover:text-amber-900 disabled:no-underline disabled:opacity-50',
          'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1',
        )}
      >
        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
      </button>
    </div>
  )
}
