'use client'

import { Lock, Loader2, Phone, Mail, MessageCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

import { Button } from '@/components/ui/button'

// ── Razorpay type stubs ───────────────────────────────────────────────────────

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  order_id: string
  name: string
  description: string
  prefill?: { name?: string; email?: string; contact?: string }
  theme?: { color?: string }
  handler: (response: RazorpayResponse) => void
  modal?: { ondismiss?: () => void }
}

interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): { open: () => void }
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface UnlockContactSectionProps {
  interestId: string
  listingTitle: string
  onUnlocked: (phone: string, email: string | null) => void
}

type FlowState = 'idle' | 'ordering' | 'paying' | 'verifying' | 'error'
type ErrorType = 'order_creation' | 'verification' | 'generic'

// ── Helper: load Razorpay SDK ─────────────────────────────────────────────────

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// ── Component ────────────────────────────────────────────────────────────────

export function UnlockContactSection({
  interestId,
  listingTitle,
  onUnlocked,
}: UnlockContactSectionProps) {
  const [flowState, setFlowState] = useState<FlowState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<ErrorType>('generic')
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const popupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const verifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current)
      if (verifyTimeoutRef.current) clearTimeout(verifyTimeoutRef.current)
    }
  }, [])

  const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? ''

  // Guard: if Razorpay is not configured, show a clear error before opening the modal
  function assertRazorpayKey(): boolean {
    if (!razorpayKeyId) {
      setFlowState('error')
      setErrorType('generic')
      setErrorMessage(
        'Payment is not configured on this device. Please try again later or contact support.',
      )
      return false
    }
    return true
  }

  async function handleUnlock() {
    setFlowState('ordering')
    setErrorMessage(null)

    // ── Step 1: Create Razorpay order ───────────────────────────────────────
    let orderData: {
      orderId: string
      amount: number
      currency: string
      demo?: boolean
    }

    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestId }),
      })

      const json = (await res.json()) as typeof orderData & {
        error?: string
        alreadyPaid?: boolean
      }

      if (res.status === 409 && json.alreadyPaid) {
        // Already paid — fetch contact details from the dedicated status endpoint
        setFlowState('verifying')
        const statusRes = await fetch(
          `/api/payments/status?interestId=${encodeURIComponent(interestId)}`,
        )
        const statusData = (await statusRes.json()) as {
          unlocked?: boolean
          sellerPhone?: string | null
          sellerEmail?: string | null
          error?: string
        }
        if (statusData.unlocked) {
          onUnlocked(statusData.sellerPhone ?? '', statusData.sellerEmail ?? null)
          return
        }
        throw new Error(statusData.error ?? 'Could not retrieve contact details.')
      }

      if (!res.ok) {
        throw new Error(json.error ?? 'Failed to create payment order.')
      }

      orderData = json
    } catch (err) {
      setFlowState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Could not start payment. Try again.')
      setErrorType('order_creation')
      return
    }

    // ── Step 2: Demo mode bypass (no real Razorpay keys configured) ─────────
    if (orderData.demo) {
      setFlowState('verifying')
      try {
        const verifyRes = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpayOrderId: orderData.orderId,
            razorpayPaymentId: `demo_pay_${Date.now()}`,
            razorpaySignature: 'demo_signature',
            interestId,
          }),
        })
        const verifyData = (await verifyRes.json()) as {
          success?: boolean
          sellerPhone?: string | null
          sellerEmail?: string | null
        }
        if (verifyData.success) {
          onUnlocked(verifyData.sellerPhone ?? '', verifyData.sellerEmail ?? null)
          return
        }
        throw new Error('Unlock failed.')
      } catch (err) {
        setFlowState('error')
        setErrorMessage(err instanceof Error ? err.message : 'Unlock failed. Please try again.')
        setErrorType('generic')
        return
      }
    }

    // ── Step 3: Load Razorpay SDK and open checkout ──────────────────────────
    if (!assertRazorpayKey()) return
    setCurrentOrderId(orderData.orderId)
    setFlowState('paying')
    const loaded = await loadRazorpayScript()
    if (!loaded || !window.Razorpay) {
      setFlowState('error')
      setErrorType('generic')
      setErrorMessage('Could not load payment module. Check your connection and try again.')
      return
    }

    const rzp = new window.Razorpay({
      key: razorpayKeyId,
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.orderId,
      name: 'ChapterNew',
      description: `Unlock seller contact for: ${listingTitle.slice(0, 60)}`,
      theme: { color: '#222222' },
      handler: async (response: RazorpayResponse) => {
        // ── Step 4: Verify payment on server ──────────────────────────────
        if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current)

        setFlowState('verifying')

        // Safety timeout — if verify hangs, give the user an escape hatch
        verifyTimeoutRef.current = setTimeout(() => {
          setFlowState('error')
          setErrorType('verification')
          setErrorMessage(
            'Your payment was received but confirmation is taking too long. Check your email for a receipt — if charged, contact support.',
          )
        }, 20_000)

        try {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              interestId,
            }),
          })
          if (verifyTimeoutRef.current) clearTimeout(verifyTimeoutRef.current)

          const verifyData = (await verifyRes.json()) as {
            success?: boolean
            sellerPhone?: string | null
            sellerEmail?: string | null
            error?: string
          }
          if (verifyData.success) {
            onUnlocked(verifyData.sellerPhone ?? '', verifyData.sellerEmail ?? null)
            return
          }
          throw new Error(verifyData.error ?? 'Verification failed.')
        } catch (err) {
          if (verifyTimeoutRef.current) clearTimeout(verifyTimeoutRef.current)
          setFlowState('error')
          setErrorType('verification')
          setErrorMessage(
            err instanceof Error
              ? err.message
              : 'Payment received but verification failed. Contact support.',
          )
        }
      },
      modal: {
        ondismiss: () => {
          // User closed modal — reset to idle so they can retry
          // Clear popup timeout — user dismissed the modal
          if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current)
          setFlowState('idle')
        },
      },
    })

    rzp.open()

    // Popup-blocked guard — if the payment window never opens, recover after 30s
    popupTimeoutRef.current = setTimeout(() => {
      setFlowState('error')
      setErrorType('generic')
      setErrorMessage(
        'Payment window could not be opened. Please disable your popup blocker and try again.',
      )
    }, 30_000)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (flowState === 'verifying') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-5">
        <Loader2
          className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]"
          aria-hidden="true"
        />
        <p className="text-sm text-[var(--color-muted-foreground)]">Verifying payment…</p>
      </div>
    )
  }

  if (flowState === 'error') {
    const supportHref = `mailto:support@chapternew.com?subject=Payment%20verification%20failed&body=Order%20ID%3A%20${encodeURIComponent(currentOrderId ?? 'unknown')}`

    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
          <p className="text-sm text-red-700">{errorMessage ?? 'Something went wrong.'}</p>
        </div>
        {errorType === 'verification' ? (
          <a
            href={supportHref}
            className="border-input bg-background hover:bg-accent flex h-11 w-full items-center justify-center rounded-xl border px-4 text-sm font-semibold underline"
          >
            Contact support
          </a>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl font-semibold"
            onClick={() => {
              setFlowState('idle')
              setErrorMessage(null)
              setErrorType('generic')
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Acceptance notice */}
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <p className="text-sm font-semibold text-green-800">The owner accepted your request</p>
        <p className="mt-0.5 text-xs text-green-700">
          Pay ₹99 to unlock their contact details permanently.
        </p>
      </div>

      {/* Handshake model explainer */}
      <p className="text-sm text-[var(--color-muted-foreground)]">
        ChapterNew keeps your contact private until both sides agree. Pay a one-time fee to
        permanently unlock the owner&apos;s phone and WhatsApp — no broker, no subscription.
      </p>

      {/* Price breakdown */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--color-foreground)]">Contact unlock fee</p>
          <p className="text-sm font-bold text-[var(--color-foreground)]">
            ₹99{' '}
            <span className="text-xs font-normal text-[var(--color-muted-foreground)]">
              (all-inclusive)
            </span>
          </p>
        </div>
        <div className="mt-2 space-y-1.5 text-xs text-[var(--color-muted-foreground)]">
          <div className="flex items-center gap-1.5">
            <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
            Owner&apos;s phone number
          </div>
          <div className="flex items-center gap-1.5">
            <MessageCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
            WhatsApp-ready contact
          </div>
          <div className="flex items-center gap-1.5">
            <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
            Email (if available)
          </div>
        </div>
      </div>

      {/* CTA */}
      <Button
        type="button"
        onClick={() => void handleUnlock()}
        disabled={flowState === 'ordering' || flowState === 'paying'}
        className="h-12 w-full rounded-xl bg-[var(--color-foreground)] font-bold text-[var(--color-background)] hover:opacity-90"
      >
        {flowState === 'ordering' || flowState === 'paying' ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {flowState === 'ordering' ? 'Preparing…' : 'Opening payment…'}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4" aria-hidden="true" />
            Unlock Contact — ₹99
          </span>
        )}
      </Button>

      <p className="text-center text-xs text-[var(--color-muted-foreground)]">
        Secure payment via Razorpay · One-time fee · No subscription
      </p>
      <p className="text-center text-xs text-[var(--color-muted-foreground)]">
        <a
          href="/refund-policy"
          className="underline underline-offset-2 hover:text-[var(--color-foreground)]"
          target="_blank"
          rel="noopener noreferrer"
        >
          Refund policy
        </a>{' '}
        — full refund if listing removed within 24h of payment
      </p>
    </div>
  )
}

// ── Contact revealed view ────────────────────────────────────────────────────

interface ContactRevealedProps {
  sellerPhone: string
  sellerEmail: string | null
}

export function ContactRevealedCard({ sellerPhone, sellerEmail }: ContactRevealedProps) {
  return (
    <div className="space-y-3 rounded-xl border border-green-200 bg-green-50 p-4">
      <p className="text-sm font-semibold text-green-800">Contact unlocked</p>

      <div className="space-y-2">
        {sellerPhone && sellerPhone.trim().length > 0 ? (
          <>
            <a
              href={`tel:${sellerPhone.replace(/\s/g, '')}`}
              className="flex items-center gap-2.5 rounded-lg border border-green-200 bg-white px-3 py-2.5 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              <Phone className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
              {sellerPhone}
            </a>

            <a
              href={`https://wa.me/${sellerPhone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-lg border border-green-200 bg-white px-3 py-2.5 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              <MessageCircle className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
              WhatsApp
            </a>
          </>
        ) : (
          <p className="rounded-lg border border-green-200 bg-white px-3 py-2.5 text-sm text-[var(--color-muted-foreground)]">
            Phone number not available.{' '}
            <a
              href="mailto:support@chapternew.com"
              className="underline underline-offset-2 hover:text-[var(--color-foreground)]"
            >
              Contact support
            </a>
            .
          </p>
        )}

        {sellerEmail && (
          <a
            href={`mailto:${sellerEmail}`}
            className="flex items-center gap-2.5 rounded-lg border border-green-200 bg-white px-3 py-2.5 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          >
            <Mail className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
            {sellerEmail}
          </a>
        )}
      </div>

      <p className="text-xs text-green-700">
        Contact saved permanently — you can return to this page anytime.
      </p>
    </div>
  )
}
