'use client'

import { CheckCircle2, Loader2, MessageSquare } from 'lucide-react'
import { useState, useId } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useAuth } from '@/lib/supabase/auth-context'
import { cn } from '@/lib/utils'
import type { InterestPurpose, InterestTimeline, InterestFunding } from '@/lib/validators'

// ─── Option sets ─────────────────────────────────────────────────────────────

const PURPOSE_OPTIONS: { value: InterestPurpose; label: string }[] = [
  { value: 'SELF', label: 'Buying for Self' },
  { value: 'INVESTMENT', label: 'Investment' },
]

const TIMELINE_OPTIONS: { value: InterestTimeline; label: string }[] = [
  { value: 'IMMEDIATELY', label: 'Immediately' },
  { value: 'WITHIN_30_DAYS', label: 'Within 30 Days' },
  { value: 'ONE_TO_THREE_MONTHS', label: '1–3 Months' },
  { value: 'EXPLORING', label: 'Exploring' },
]

const FUNDING_OPTIONS: { value: InterestFunding; label: string }[] = [
  { value: 'CASH_READY', label: 'Cash Ready' },
  { value: 'LOAN_APPROVED', label: 'Loan Approved' },
  { value: 'LOAN_IN_PROGRESS', label: 'Loan in Progress' },
]

// ─── Chip toggle component ────────────────────────────────────────────────────

function ChipGroup<T extends string>({
  id,
  label,
  options,
  value,
  onChange,
  error,
  disabled,
}: {
  id: string
  label: string
  options: { value: T; label: string }[]
  value: T | null
  onChange: (v: T) => void
  error?: string | null
  disabled?: boolean
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-[var(--color-foreground)]">
        {label}
        <span className="ml-0.5 text-red-500" aria-hidden="true">
          {' '}
          *
        </span>
      </legend>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={id}>
        {options.map((opt) => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(opt.value)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1',
                selected
                  ? 'border-[var(--color-foreground)] bg-[var(--color-foreground)] text-[var(--color-background)]'
                  : 'border-[var(--color-border)] bg-transparent text-[var(--color-foreground)] hover:border-[var(--color-foreground)] hover:bg-[var(--color-muted)]',
                disabled && 'pointer-events-none opacity-60',
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  fullName: string
  purpose: InterestPurpose | null
  timeline: InterestTimeline | null
  funding: InterestFunding | null
  message: string
}

interface FormErrors {
  fullName?: string
  purpose?: string
  timeline?: string
  funding?: string
  message?: string
}

type SubmitState = 'idle' | 'loading' | 'success' | 'error' | 'duplicate'

interface RequestContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called immediately when the request is successfully submitted */
  onSuccess?: () => void
  /** Called after a successful withdraw so the parent can reset its requested state */
  onWithdraw?: () => void
  listingId: string
  listingTitle: string
  /** When true, opens directly to the "already requested" screen instead of the form */
  viewExisting?: boolean
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function RequestContactModal({
  open,
  onOpenChange,
  onSuccess,
  onWithdraw,
  listingId,
  listingTitle,
  viewExisting = false,
}: RequestContactModalProps) {
  const { user } = useAuth()
  const nameId = useId()
  const msgId = useId()

  const defaultName: string =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.email ? (user.email.includes('@') ? user.email.split('@')[0] : user.email) : '') ??
    ''

  const [form, setForm] = useState<FormState>({
    fullName: defaultName,
    purpose: null,
    timeline: null,
    funding: null,
    message: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitState, setSubmit] = useState<SubmitState>(viewExisting ? 'duplicate' : 'idle')
  const [apiError, setApiError] = useState<string | null>(null)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  // Reset form when modal closes
  function handleOpenChange(next: boolean) {
    if (!next && submitState !== 'success') {
      setErrors({})
      setApiError(null)
      setSubmit('idle')
    }
    onOpenChange(next)
  }

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  function validate(): boolean {
    const next: FormErrors = {}
    if (!form.fullName.trim()) next.fullName = 'Full name is required.'
    else if (form.fullName.trim().length < 2) next.fullName = 'Name must be at least 2 characters.'
    if (!form.purpose) next.purpose = 'Please select a purpose.'
    if (!form.timeline) next.timeline = 'Please select a timeline.'
    if (!form.funding) next.funding = 'Please select a funding option.'
    if (form.message.length > 250) next.message = 'Message must be under 250 characters.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmit('loading')
    setApiError(null)

    try {
      const res = await fetch(`/api/listings/${listingId}/interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          purpose: form.purpose,
          timeline: form.timeline,
          funding: form.funding,
          message: form.message.trim() || undefined,
        }),
      })

      if (res.status === 201) {
        setSubmit('success')
        onSuccess?.()
        return
      }

      const json = (await res.json()) as { error?: string }

      if (res.status === 409) {
        setSubmit('duplicate')
        return
      }

      if (res.status === 401) {
        setApiError('Please sign in to submit your request.')
      } else {
        setApiError(json.error ?? 'Something went wrong. Please try again.')
      }
      setSubmit('error')
    } catch {
      setApiError('Network error — please check your connection.')
      setSubmit('error')
    }
  }

  const charCount = form.message.length
  const isLoading = submitState === 'loading'

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitState === 'success') {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-5 px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-[var(--color-foreground)]">Request sent!</h2>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                The seller will review your interest in{' '}
                <span className="font-medium text-[var(--color-foreground)]">{listingTitle}</span>{' '}
                and reach out to you.
              </p>
            </div>
            <Button
              type="button"
              className="mt-2 h-11 w-full rounded-xl font-semibold"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ── Duplicate / existing-request screen ────────────────────────────────────
  if (submitState === 'duplicate') {
    async function handleWithdraw() {
      setWithdrawing(true)
      setWithdrawError(null)
      try {
        const res = await fetch(`/api/listings/${listingId}/interest`, {
          method: 'DELETE',
        })
        if (res.ok || res.status === 404) {
          onWithdraw?.()
          onOpenChange(false)
        } else {
          setWithdrawError('Could not withdraw request. Please try again.')
        }
      } catch {
        setWithdrawError('Network error — please try again.')
      } finally {
        setWithdrawing(false)
      }
    }

    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-5 px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <MessageSquare className="h-8 w-8 text-amber-600" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-[var(--color-foreground)]">Request pending</h2>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                You have a pending interest request for{' '}
                <span className="font-medium text-[var(--color-foreground)]">{listingTitle}</span>.
                The seller will contact you soon.
              </p>
            </div>
            {withdrawError && (
              <p className="text-xs text-red-600" role="alert">
                {withdrawError}
              </p>
            )}
            <div className="flex w-full flex-col gap-2">
              <Button
                type="button"
                className="h-11 w-full rounded-xl font-semibold"
                onClick={() => onOpenChange(false)}
              >
                Got it
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl font-semibold text-red-600 hover:border-red-200 hover:bg-red-50"
                onClick={() => void handleWithdraw()}
                disabled={withdrawing}
              >
                {withdrawing ? 'Withdrawing…' : 'Withdraw request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Contact</DialogTitle>
          <DialogDescription>
            Tell the seller a bit about yourself. Your contact details stay hidden until the seller
            responds.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-5 px-6 pb-2">
            {/* Full Name */}
            <div>
              <label
                htmlFor={nameId}
                className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]"
              >
                Full Name
                <span className="ml-0.5 text-red-500" aria-hidden="true">
                  {' '}
                  *
                </span>
              </label>
              <input
                id={nameId}
                type="text"
                autoComplete="name"
                value={form.fullName}
                onChange={(e) => patch('fullName', e.target.value)}
                placeholder="Your full name"
                disabled={isLoading}
                aria-invalid={!!errors.fullName}
                aria-describedby={errors.fullName ? `${nameId}-err` : undefined}
                className={cn(
                  'h-11 w-full rounded-lg border px-3.5 text-sm outline-none',
                  'bg-[var(--color-background)] text-[var(--color-foreground)]',
                  'placeholder:text-[var(--color-muted-foreground)]',
                  'transition-colors focus:ring-2 focus:ring-[var(--color-ring)]',
                  errors.fullName
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-[var(--color-border)] focus:border-[var(--color-ring)]',
                )}
              />
              {errors.fullName && (
                <p id={`${nameId}-err`} className="mt-1 text-xs text-red-600" role="alert">
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Purpose */}
            <ChipGroup
              id="purpose-group"
              label="Purpose"
              options={PURPOSE_OPTIONS}
              value={form.purpose}
              onChange={(v) => patch('purpose', v)}
              error={errors.purpose}
              disabled={isLoading}
            />

            {/* Timeline */}
            <ChipGroup
              id="timeline-group"
              label="Timeline"
              options={TIMELINE_OPTIONS}
              value={form.timeline}
              onChange={(v) => patch('timeline', v)}
              error={errors.timeline}
              disabled={isLoading}
            />

            {/* Funding */}
            <ChipGroup
              id="funding-group"
              label="Funding"
              options={FUNDING_OPTIONS}
              value={form.funding}
              onChange={(v) => patch('funding', v)}
              error={errors.funding}
              disabled={isLoading}
            />

            {/* Message (optional) */}
            <div>
              <label
                htmlFor={msgId}
                className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]"
              >
                Message{' '}
                <span className="font-normal text-[var(--color-muted-foreground)]">(optional)</span>
              </label>
              <textarea
                id={msgId}
                rows={3}
                maxLength={250}
                value={form.message}
                onChange={(e) => patch('message', e.target.value)}
                placeholder="Any specific questions about the property…"
                disabled={isLoading}
                aria-invalid={!!errors.message}
                aria-describedby={`${msgId}-count${errors.message ? ` ${msgId}-err` : ''}`}
                className={cn(
                  'w-full resize-none rounded-lg border px-3.5 py-2.5 text-sm outline-none',
                  'bg-[var(--color-background)] text-[var(--color-foreground)]',
                  'placeholder:text-[var(--color-muted-foreground)]',
                  'transition-colors focus:ring-2 focus:ring-[var(--color-ring)]',
                  errors.message
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-[var(--color-border)] focus:border-[var(--color-ring)]',
                )}
              />
              <div className="mt-1 flex items-center justify-between">
                {errors.message ? (
                  <p id={`${msgId}-err`} className="text-xs text-red-600" role="alert">
                    {errors.message}
                  </p>
                ) : (
                  <span />
                )}
                <p
                  id={`${msgId}-count`}
                  className={cn(
                    'text-xs tabular-nums',
                    charCount > 230 ? 'text-amber-600' : 'text-[var(--color-muted-foreground)]',
                  )}
                  aria-live="polite"
                >
                  {charCount}/250
                </p>
              </div>
            </div>

            {/* API-level error */}
            {submitState === 'error' && apiError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {apiError}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full rounded-xl text-sm font-bold"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Sending…
                </span>
              ) : (
                'Send Request'
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-[var(--color-muted-foreground)]">
              Seller details remain hidden until they respond.
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
