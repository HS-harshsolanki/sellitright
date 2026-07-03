'use client'

import { AlertCircle, CheckCircle2, Loader2, Phone } from 'lucide-react'
import { useState } from 'react'

import { INDIAN_MOBILE_RE, normalizePhone } from '@/lib/phone'
import { cn } from '@/lib/utils'

type FlowState = 'idle' | 'sending' | 'otp_sent' | 'verified'

interface InlinePhoneVerificationProps {
  onVerified: (phone: string) => void
}

function maskPhone(normalized: string): string {
  return normalized.slice(0, 5) + ' ' + '*'.repeat(5)
}

export function InlinePhoneVerification({ onVerified }: InlinePhoneVerificationProps) {
  const [flowState, setFlowState] = useState<FlowState>('idle')
  const [inlinePhone, setInlinePhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const normalized = normalizePhone(inlinePhone)
  const phoneValid = INDIAN_MOBILE_RE.test(normalized)

  async function handleSendOtp() {
    if (!phoneValid) return
    setIsLoading(true)
    setFlowState('sending')
    setError(null)
    try {
      const res = await fetch('/api/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      })
      const data = (await res.json()) as { error?: string; message?: string }
      if (!res.ok) {
        setError(data.error ?? 'Failed to send OTP. Try again.')
        setFlowState('idle')
      } else {
        setFlowState('otp_sent')
      }
    } catch {
      setError('Network error. Check your connection and try again.')
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
      const data = (await res.json()) as { error?: string; message?: string; phone?: string }
      if (!res.ok) {
        setError(data.error ?? 'Wrong OTP. Please try again.')
      } else {
        setFlowState('verified')
        onVerified(data.phone ?? normalized)
      }
    } catch {
      setError('Network error. Check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Verified state ─────────────────────────────────────────────────────────
  if (flowState === 'verified') {
    return (
      // role="status" announces the success message to screen readers when it mounts
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

  // ── Idle / Sending states ──────────────────────────────────────────────────
  if (flowState === 'idle' || flowState === 'sending') {
    const isSending = flowState === 'sending'
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
        {/* sr-only live region announces loading state to screen readers */}
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {isSending ? 'Sending OTP, please wait.' : ''}
        </span>

        <div className="mb-3 flex items-start gap-2.5">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            {/* h3 for correct heading hierarchy under the page h2 */}
            <h3 className="text-sm font-semibold text-amber-900">Verify your phone to publish</h3>
            <p className="mt-0.5 text-xs text-amber-700">
              We&apos;ll send a quick OTP on WhatsApp — buyers need a way to reach you.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Visible label for the phone input */}
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
              // amber-600 placeholder passes contrast AA for UI components (~3.5:1 on white)
              className="h-11 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-amber-600 disabled:opacity-50"
              autoComplete="tel"
              inputMode="numeric"
              disabled={isSending}
              aria-label="Indian mobile number, 10 digits"
              aria-describedby={error ? 'phone-send-error' : undefined}
              aria-invalid={error ? 'true' : undefined}
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSendOtp()}
            disabled={isSending || !phoneValid}
            // py-3 = 12px top+bottom = 44px total height (touch target)
            className={cn(
              'shrink-0 rounded-lg px-3 py-3 text-xs font-semibold text-white transition-opacity',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
              isSending || !phoneValid
                ? // amber-200 bg + amber-700 text gives ~4:1 contrast for disabled appearance
                  'cursor-not-allowed bg-amber-200 text-amber-700'
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
              'Send OTP on WhatsApp'
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

  // ── OTP entry state ────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
      <p id="otp-hint" className="mb-3 text-xs text-amber-800">
        OTP sent to WhatsApp on{' '}
        <span className="font-semibold tracking-wide">+91 {maskPhone(normalized)}</span>
      </p>

      {/* sr-only live region for verifying state */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isLoading ? 'Verifying OTP, please wait.' : ''}
      </span>

      {/* Visible label for OTP input */}
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
          // py-3 = 44px touch target
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
              {/* sr-only label so the button always has an accessible name */}
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

      {/* py-2 + -mx-1 gives adequate touch target for text link */}
      <button
        type="button"
        onClick={() => void handleSendOtp()}
        disabled={isLoading}
        className={cn(
          'mt-2.5 block px-1 py-2 text-xs text-amber-700 underline underline-offset-2',
          'hover:text-amber-900 disabled:opacity-50',
          'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1',
        )}
      >
        Resend OTP
      </button>
    </div>
  )
}
