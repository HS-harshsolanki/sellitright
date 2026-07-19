'use client'

import { AlertCircle, CheckCircle2, Edit2, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { InlinePhoneVerification } from '@/components/forms/inline-phone-verification'
import { cn } from '@/lib/utils'
import { useSellFormStore } from '@/stores/sell-form.store'

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Apartment',
  PENTHOUSE: 'Penthouse',
}

const BHK_LABELS: Record<string, string> = {
  ONE_BHK: '1 BHK',
  TWO_BHK: '2 BHK',
  THREE_BHK: '3 BHK',
  FOUR_BHK: '4 BHK',
  FIVE_PLUS_BHK: '5+ BHK',
}

const FURNISHING_LABELS: Record<string, string> = {
  FURNISHED: 'Furnished',
  SEMI_FURNISHED: 'Semi-Furnished',
  UNFURNISHED: 'Unfurnished',
}

const PARKING_LABELS: Record<string, string> = {
  COVERED: 'Covered',
  OPEN: 'Open',
  BOTH: 'Covered + Open',
  NONE: 'None',
}

const FACING_FULL: Record<string, string> = {
  NORTH: 'North',
  SOUTH: 'South',
  EAST: 'East',
  WEST: 'West',
  NORTH_EAST: 'North East',
  NORTH_WEST: 'North West',
  SOUTH_EAST: 'South East',
  SOUTH_WEST: 'South West',
}

function getLakhCroreLabel(rawFormatted: string): string {
  const val = Number(rawFormatted.replace(/,/g, ''))
  if (!val) return '—'
  const CRORE = 10_000_000
  const LAKH = 100_000
  if (val >= CRORE) {
    const cr = val / CRORE
    return `₹ ${parseFloat(cr.toFixed(2))} Cr`
  }
  const l = val / LAKH
  return `₹ ${parseFloat(l.toFixed(1))} L`
}

interface SectionHeaderProps {
  title: string
  stepIndex: number
}

function SectionHeader({ title, stepIndex }: SectionHeaderProps) {
  const { goToStep } = useSellFormStore()
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">
        {title}
      </h3>
      <button
        type="button"
        onClick={() => goToStep(stepIndex)}
        className={cn(
          'text-primary flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
          'hover:bg-primary/5 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
        )}
      >
        <Edit2 className="h-3 w-3" />
        Edit
      </button>
    </div>
  )
}

interface ReviewRowProps {
  label: string
  value: string | null | undefined
}

function ReviewRow({ label, value }: ReviewRowProps) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-right font-medium">{value || '—'}</span>
    </div>
  )
}

/** Build an auto-generated title when the user left it blank. */
function buildAutoTitle(
  bhkLabel: string,
  propertyLabel: string,
  locality: string,
  city: string,
): string {
  const parts = [bhkLabel, propertyLabel]
  if (locality) parts.push(`in ${locality}`)
  if (city && city !== locality) parts.push(city)
  return parts.join(' ')
}

/** Build an auto-generated description when the user left it blank. */
function buildAutoDescription(
  bhkLabel: string,
  propertyLabel: string,
  builtUpArea: string,
  locality: string,
  city: string,
): string {
  const area = builtUpArea ? ` (${Number(builtUpArea).toLocaleString('en-IN')} sq ft)` : ''
  const location = [locality, city].filter(Boolean).join(', ')
  return `${bhkLabel} ${propertyLabel}${area} available for sale${location ? ` in ${location}` : ''}. Well-maintained property — contact for more details.`
}

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

interface IncompleteField {
  label: string
  stepIndex: number
}

interface StepReviewProps {
  /** If a draft was autosaved, we patch it to PENDING_REVIEW instead of creating a new record */
  draftId?: string | null
  /** Whether the seller has a verified phone number on file. Blocks submission if false. */
  hasPhone?: boolean
  /** Called after inline OTP verification completes so the parent can update its state */
  onPhoneVerified?: () => void
}

export function StepReview({ draftId, hasPhone = true, onPhoneVerified }: StepReviewProps) {
  const { propertyType, location, details, photos, pricing, goToStep, reset, setSubmitted } =
    useSellFormStore()

  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Build a list of everything that would fail Zod validation at submit time
  function getIncompleteFields(): IncompleteField[] {
    const issues: IncompleteField[] = []
    if (!propertyType) issues.push({ label: 'Property type not selected', stepIndex: 0 })
    if (!location.city) issues.push({ label: 'City missing', stepIndex: 1 })
    if (!location.locality.trim()) issues.push({ label: 'Locality / area missing', stepIndex: 1 })
    if (location.pincode.length !== 6)
      issues.push({ label: 'Pincode must be 6 digits', stepIndex: 1 })
    if (!location.state) issues.push({ label: 'State missing', stepIndex: 1 })
    if (!details.bhkType) issues.push({ label: 'BHK configuration not selected', stepIndex: 2 })
    if (!details.builtUpArea) issues.push({ label: 'Built-up area missing', stepIndex: 2 })
    if (!details.furnishing) issues.push({ label: 'Furnishing status not selected', stepIndex: 2 })
    const rawPrice = Number(pricing.price.replace(/,/g, ''))
    if (rawPrice < 100_000)
      issues.push({
        label: rawPrice <= 0 ? 'Asking price missing' : 'Price below ₹1 Lakh minimum',
        stepIndex: 4,
      })
    return issues
  }

  const incompleteFields = getIncompleteFields()
  const isReadyToSubmit = incompleteFields.length === 0

  const bhkLabel = details.bhkType ? (BHK_LABELS[details.bhkType] ?? '') : ''
  const propertyLabel = propertyType ? (PROPERTY_TYPE_LABELS[propertyType] ?? '') : ''

  async function handleSubmit() {
    setSubmitState('loading')
    setErrorMessage(null)

    const rawPrice = Number(pricing.price.replace(/,/g, ''))

    const title =
      pricing.title.trim().length >= 10
        ? pricing.title.trim()
        : buildAutoTitle(bhkLabel, propertyLabel, location.locality, location.city)

    const description =
      pricing.description.trim().length >= 30
        ? pricing.description.trim()
        : buildAutoDescription(
            bhkLabel,
            propertyLabel,
            details.builtUpArea,
            location.locality,
            location.city,
          )

    const payload = {
      title: title.slice(0, 120),
      description: description.slice(0, 2000),
      price: rawPrice,
      propertyType,
      bhkType: details.bhkType,
      builtUpArea: details.builtUpArea ? parseInt(details.builtUpArea, 10) : undefined,
      carpetArea: details.carpetArea ? parseInt(details.carpetArea, 10) : undefined,
      floor: details.floor ? parseInt(details.floor, 10) : undefined,
      totalFloors: details.totalFloors ? parseInt(details.totalFloors, 10) : undefined,
      facing: details.facing ?? undefined,
      furnishing: details.furnishing,
      ageOfProperty: details.ageOfProperty ? parseInt(details.ageOfProperty, 10) : undefined,
      bathrooms: details.bathrooms,
      balconies: details.balconies,
      parking: details.parking ?? undefined,
      address: location.address || `${location.locality}, ${location.city}`,
      city: location.city,
      locality: location.locality,
      state: location.state,
      pincode: location.pincode,
      amenities: details.amenities,
      imageUrls: photos,
      // Pass draftId so the API can update the existing row instead of inserting a new one
      ...(draftId ? { draftId } : {}),
    }

    try {
      const res = await fetch('/api/listings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        console.error('[step-review] submit failed, status:', res.status)
        const body = (await res.json().catch(() => ({}))) as { error?: string; action?: string }
        if (res.status === 401) {
          setErrorMessage('You are not signed in. Please sign in and try again.')
        } else if (res.status === 403) {
          setErrorMessage('Your account is suspended. Please contact support.')
        } else if (res.status === 422 && body.action === 'profile') {
          setErrorMessage(
            body.error ??
              'Verify your phone number before submitting. Use the verification box above.',
          )
        } else if (res.status === 400) {
          setErrorMessage(
            body.error ?? 'One or more fields failed validation. Please review each section.',
          )
        } else {
          setErrorMessage('Something went wrong on our end. Please try again in a moment.')
        }
        setSubmitState('error')
        return
      }

      setSubmitState('success')
      // Mark as submitted so autosave stops firing (prevents "Draft save failed" on success screen)
      setSubmitted(true)
      useSellFormStore.getState().setSaveStatus('idle')
      // reset() is deferred — called when user navigates away so the success screen stays visible
    } catch {
      setErrorMessage('Network error — please check your connection and try again.')
      setSubmitState('error')
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitState === 'success') {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-foreground text-2xl font-bold tracking-tight">
            Your listing has been submitted for review.
          </h2>
          <p className="text-muted-foreground max-w-sm">
            We&apos;ll notify you once it&apos;s approved.
          </p>
        </div>

        {/* What happens next */}
        <div className="border-border bg-muted/40 w-full max-w-sm rounded-xl border px-5 py-4 text-left">
          <p className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
            What happens next
          </p>
          <ol className="space-y-2.5">
            {[
              'Our team reviews your listing for accuracy',
              'You get notified once it goes live',
              'Buyers can contact you directly',
            ].map((step, i) => (
              <li key={i} className="text-foreground flex items-start gap-3 text-sm">
                <span className="bg-primary/10 text-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-3">
          <a
            href="/dashboard"
            onClick={() => reset()}
            className={cn(
              'bg-primary rounded-xl px-8 py-3 text-center text-sm font-bold text-white shadow-sm',
              'hover:bg-primary/90 transition-all active:scale-[0.98]',
              'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            )}
          >
            View my listings
          </a>
          <a
            href="/sell"
            onClick={() => reset()}
            className={cn(
              'border-border text-foreground rounded-xl border px-8 py-3 text-center text-sm font-semibold',
              'hover:bg-muted transition-all active:scale-[0.98]',
              'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            )}
          >
            Post another property
          </a>
        </div>
      </div>
    )
  }

  // ── Review screen ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Review your listing
        </h2>
        <p className="text-muted-foreground">Check all the details before submitting.</p>
      </div>

      {/* Property Type */}
      <section className="border-border space-y-3 rounded-xl border p-4">
        <SectionHeader title="Property Type" stepIndex={0} />
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg text-lg">
            {propertyType === 'APARTMENT' && '🏢'}
            {propertyType === 'PENTHOUSE' && '✨'}
          </div>
          <p className="text-foreground font-semibold">
            {propertyType ? PROPERTY_TYPE_LABELS[propertyType] : '—'}
          </p>
        </div>
      </section>

      {/* Location */}
      <section className="border-border space-y-3 rounded-xl border p-4">
        <SectionHeader title="Location" stepIndex={1} />
        <div className="divide-border divide-y">
          <ReviewRow label="City" value={location.city} />
          <ReviewRow label="State" value={location.state} />
          <ReviewRow label="Locality" value={location.locality} />
          <ReviewRow label="Pincode" value={location.pincode} />
          {location.address && <ReviewRow label="Address" value={location.address} />}
        </div>
      </section>

      {/* Photos */}
      <section className="border-border space-y-3 rounded-xl border p-4">
        <SectionHeader title="Photos" stepIndex={3} />
        {photos.length === 0 ? (
          <button
            type="button"
            onClick={() => goToStep(3)}
            className="border-border text-muted-foreground hover:border-primary/50 hover:text-primary w-full rounded-lg border-2 border-dashed py-4 text-sm"
          >
            No photos added — tap to add photos
          </button>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.slice(0, 6).map((url, index) => (
              <div
                key={url}
                className="border-border relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Property photo ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
            {photos.length > 6 && (
              <div className="border-border bg-muted text-muted-foreground flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border text-sm font-medium">
                +{photos.length - 6}
              </div>
            )}
          </div>
        )}
        <p className="text-muted-foreground text-xs">
          {photos.length} photo{photos.length !== 1 ? 's' : ''} added
        </p>
      </section>

      {/* Details */}
      <section className="border-border space-y-3 rounded-xl border p-4">
        <SectionHeader title="Property Details" stepIndex={2} />
        <div className="divide-border divide-y">
          <ReviewRow
            label="Configuration"
            value={details.bhkType ? BHK_LABELS[details.bhkType] : null}
          />
          <ReviewRow
            label="Built-up Area"
            value={
              details.builtUpArea
                ? `${Number(details.builtUpArea).toLocaleString('en-IN')} sq ft`
                : null
            }
          />
          {details.carpetArea && (
            <ReviewRow
              label="Carpet Area"
              value={`${Number(details.carpetArea).toLocaleString('en-IN')} sq ft`}
            />
          )}
          <ReviewRow
            label="Floor"
            value={
              details.floor && details.totalFloors
                ? `${details.floor} / ${details.totalFloors}`
                : details.floor || null
            }
          />
          <ReviewRow label="Facing" value={details.facing ? FACING_FULL[details.facing] : null} />
          <ReviewRow
            label="Furnishing"
            value={details.furnishing ? FURNISHING_LABELS[details.furnishing] : null}
          />
          <ReviewRow label="Bathrooms" value={String(details.bathrooms)} />
          <ReviewRow label="Balconies" value={String(details.balconies)} />
          <ReviewRow
            label="Parking"
            value={details.parking ? PARKING_LABELS[details.parking] : null}
          />
          {details.ageOfProperty && (
            <ReviewRow
              label="Age"
              value={`${details.ageOfProperty} year${Number(details.ageOfProperty) !== 1 ? 's' : ''}`}
            />
          )}
        </div>

        {details.amenities.length > 0 && (
          <div className="pt-2">
            <p className="text-muted-foreground mb-2 text-xs">Amenities</p>
            <div className="flex flex-wrap gap-1.5">
              {details.amenities.map((a) => (
                <span
                  key={a}
                  className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Pricing */}
      <section className="border-border space-y-3 rounded-xl border p-4">
        <SectionHeader title="Pricing" stepIndex={4} />
        <div className="flex items-end gap-3">
          <p className="text-foreground text-2xl font-bold">
            {pricing.price ? getLakhCroreLabel(pricing.price) : '—'}
          </p>
          {pricing.negotiable && (
            <span className="mb-0.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              Negotiable
            </span>
          )}
        </div>
        {pricing.title && <ReviewRow label="Title" value={pricing.title} />}
        {pricing.description && (
          <div className="pt-1">
            <p className="text-muted-foreground text-xs">Description</p>
            <p className="text-foreground mt-1 line-clamp-3 text-sm">{pricing.description}</p>
          </div>
        )}
      </section>

      {/* Submit CTA */}
      <div className="space-y-3 pt-2">
        {/* Missing fields banner — shown before first submit attempt */}
        {!isReadyToSubmit && (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/5 space-y-2 rounded-xl border px-4 py-3"
          >
            <p className="text-destructive flex items-center gap-2 text-sm font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Please fix the following before submitting:
            </p>
            <ul className="space-y-1">
              {incompleteFields.map((f) => (
                <li key={f.label} className="flex items-center justify-between text-xs">
                  <span className="text-destructive/90">{f.label}</span>
                  <button
                    type="button"
                    onClick={() => goToStep(f.stepIndex)}
                    className="text-primary ml-4 shrink-0 font-medium underline underline-offset-2 hover:opacity-75"
                  >
                    Fix →
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* No-phone — inline verification widget */}
        {!hasPhone && (
          <InlinePhoneVerification
            onVerified={() => {
              onPhoneVerified?.()
            }}
          />
        )}

        {/* Review notice */}
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="text-xs text-amber-800">
            Your listing will be reviewed by our team before going live. This usually takes less
            than 24 hours.
          </p>
        </div>

        {/* API error */}
        {errorMessage && (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border px-4 py-3 text-sm"
          >
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitState === 'loading' || !hasPhone || !isReadyToSubmit}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-bold text-white shadow-sm',
            'focus-visible:ring-ring transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            submitState === 'loading' || !hasPhone || !isReadyToSubmit
              ? 'bg-primary/50 cursor-not-allowed'
              : 'bg-primary hover:bg-primary/90 active:scale-[0.99]',
          )}
        >
          {submitState === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitState === 'loading' ? 'Submitting…' : 'Submit for Review'}
        </button>

        <p className="text-muted-foreground text-center text-xs">
          By submitting, you agree to our{' '}
          <a href="/terms" className="hover:text-foreground underline">
            Terms of Service
          </a>
          .
        </p>
      </div>
    </div>
  )
}
