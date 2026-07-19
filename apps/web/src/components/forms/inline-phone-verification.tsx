'use client'

import { AlertCircle, CheckCircle2, Loader2, Phone } from 'lucide-react'
import { useEffect, useState } from 'react'

import { INDIAN_MOBILE_RE, normalizePhone } from '@/lib/phone'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

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
  const [alreadyClaimed, setAlreadyClaimed] = useState(false)

  const normalized = normalizePhone(inlinePhone)
  const phoneValid = INDIAN_MOBILE_RE.test(normalized)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  async function handleSendOtp() {
    if (!phoneValid || resendCooldown > 0) return
    setIsLoading(true)
    setFlowState('sending')
    setError(null)
    setAlreadyClaimed(false)

    try {
      const res = await fetch('/api/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      })
      const data = (await res.json()) as { error?: string; code?: string }
      if (!res.ok) {
        if (res.status === 409 || data.code === 'PHONE_ALREADY_CLAIMED') {
          setAlreadyClaimed(true)
          setError('claimed')
        } else {
          setError(data.error ?? 'Failed to send OTP. Try again.')
        }
        setFlowState('idle')
      } else {
        setFlowState('otp_sent')
        setResendCooldown(RESEND_COOLDOWN)
      }
    } catch {
      setError('Failed to send OTP. Please check your connection.')
      setFlowState('idle')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerifyOtp() {
    if (otp.length !== 6) return
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/phone/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, otp }),
      })
      const data = (await res.json()) as { error?: string; code?: string; phone?: string }
      if (!res.ok) {
        if (res.status === 409 || data.code === 'PHONE_ALREADY_CLAIMED') {
          setAlreadyClaimed(true)
          setError('claimed')
        } else {
          setError(data.error ?? 'Wrong OTP. Please try again.')
        }
      } else {
        await finalizeVerification(data.phone ?? normalized)
      }
    } catch {
      setError('Verification failed. Please try again.')
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
        className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3.5"
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-green-800">Phone verified</p>
          <p className="text-xs text-green-700">
            You&apos;re all set — your listing can be published.
          </p>
        </div>
      </div>
    )
  }

  const errorNode = alreadyClaimed ? (
    <p
      id="phone-send-error"
      role="alert"
      className="mt-2 flex items-center gap-1.5 text-xs text-red-700"
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      This number is registered to another account.{' '}
      <a
        href="mailto:support@chapternew.com?subject=Phone%20number%20conflict"
        className="underline hover:opacity-80"
      >
        Contact support
      </a>
      .
    </p>
  ) : error ? (
    <p
      id="phone-send-error"
      role="alert"
      className="mt-2 flex items-center gap-1.5 text-xs text-red-700"
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {error}
    </p>
  ) : null

  if (flowState === 'idle' || flowState === 'sending') {
    const isSending = flowState === 'sending'
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-4 shadow-sm">
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {isSending ? 'Sending OTP, please wait.' : ''}
        </span>

        {/* Header */}
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Phone className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
              Verify your phone to publish
            </h3>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Buyers need a way to reach you — takes 30 seconds.
            </p>
          </div>
        </div>

        {/* Input row */}
        <div className="flex gap-2">
          <label htmlFor="inline-phone" className="sr-only">
            Indian mobile number (10 digits)
          </label>
          <div
            className={cn(
              'flex flex-1 items-center overflow-hidden rounded-lg border bg-white transition-colors',
              error ? 'border-red-400' : 'border-[var(--color-border)]',
              !isSending &&
                'focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary)]',
            )}
          >
            <span className="ml-3 shrink-0 text-sm font-medium text-[var(--color-muted-foreground)]">
              +91
            </span>
            <input
              id="inline-phone"
              type="tel"
              value={inlinePhone}
              onChange={(e) => {
                setInlinePhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                setError(null)
                setAlreadyClaimed(false)
              }}
              placeholder="98765 43210"
              className="h-11 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[var(--color-muted-foreground)] disabled:opacity-50"
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
            disabled={isSending || !phoneValid || alreadyClaimed}
            className={cn(
              'shrink-0 rounded-lg px-4 text-sm font-semibold text-white transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
              isSending || !phoneValid || alreadyClaimed
                ? 'bg-[var(--color-primary)]/40 cursor-not-allowed'
                : 'hover:bg-[var(--color-primary)]/90 bg-[var(--color-primary)] active:scale-[0.98]',
            )}
            aria-disabled={isSending || !phoneValid}
          >
            {isSending ? (
              <span className="flex items-center gap-1.5">
                <Loader2
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                Sending…
              </span>
            ) : (
              'Send OTP'
            )}
          </button>
        </div>

        {errorNode}
      </div>
    )
  }

  // OTP entry state
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-4 shadow-sm">
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isLoading ? 'Verifying OTP, please wait.' : ''}
      </span>

      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50">
            <Phone className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-foreground)]">Enter the OTP</p>
            <p id="otp-hint" className="text-xs text-[var(--color-muted-foreground)]">
              Sent via SMS to <span className="font-medium">+91 {maskPhone(normalized)}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setFlowState('idle')
            setOtp('')
            setError(null)
            setAlreadyClaimed(false)
          }}
          className="text-xs text-[var(--color-muted-foreground)] underline underline-offset-2 hover:text-[var(--color-foreground)]"
        >
          Change number
        </button>
      </div>

      {/* OTP row */}
      <label htmlFor="inline-otp" className="sr-only">
        6-digit OTP
      </label>
      <div className="flex gap-2">
        <input
          id="inline-otp"
          type="password"
          inputMode="numeric"
          value={otp}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 6)
            setOtp(val)
            setError(null)
            setAlreadyClaimed(false)
          }}
          placeholder="• • • • • •"
          maxLength={6}
          autoComplete="one-time-code"
          aria-describedby={`otp-hint${error ? ' otp-error' : ''}`}
          aria-invalid={error ? 'true' : undefined}
          className={cn(
            'h-11 flex-1 rounded-lg border bg-white px-4 text-center text-lg font-bold tracking-widest outline-none',
            'placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-[var(--color-muted-foreground)]',
            error ? 'border-red-400' : 'border-[var(--color-border)]',
            'focus-visible:border-[var(--color-primary)] focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]',
          )}
        />
        <button
          type="button"
          onClick={() => void handleVerifyOtp()}
          disabled={isLoading || otp.length !== 6}
          className={cn(
            'shrink-0 rounded-lg px-5 text-sm font-semibold text-white transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
            isLoading || otp.length !== 6
              ? 'bg-[var(--color-primary)]/40 cursor-not-allowed'
              : 'hover:bg-[var(--color-primary)]/90 bg-[var(--color-primary)] active:scale-[0.98]',
          )}
          aria-disabled={isLoading || otp.length !== 6}
        >
          {isLoading ? (
            <Loader2
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            'Verify'
          )}
        </button>
      </div>

      {errorNode}

      <div className="mt-2.5 flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
        <span>Didn&apos;t receive it?</span>
        <button
          type="button"
          onClick={() => {
            setOtp('')
            setError(null)
            void handleSendOtp()
          }}
          disabled={isLoading || resendCooldown > 0}
          className={cn(
            'underline underline-offset-2 transition-opacity',
            'rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]',
            resendCooldown > 0 || isLoading
              ? 'cursor-not-allowed no-underline opacity-40'
              : 'text-[var(--color-primary)] hover:opacity-80',
          )}
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
        </button>
      </div>
    </div>
  )
}
