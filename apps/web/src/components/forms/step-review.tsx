'use client'

import { CheckCircle2, Edit2, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import { useSellFormStore } from '@/stores/sell-form.store'

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Apartment',
  VILLA: 'Villa',
  INDEPENDENT_HOUSE: 'Independent House',
  PLOT: 'Plot / Land',
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

interface StepReviewProps {
  /** If a draft was autosaved, we patch it to PENDING_REVIEW instead of creating a new record */
  draftId?: string | null
}

export function StepReview({ draftId }: StepReviewProps) {
  const { propertyType, location, details, photos, pricing, goToStep, reset } = useSellFormStore()

  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
        if (res.status === 401) {
          setErrorMessage('Please sign in to submit your listing.')
        } else if (res.status === 400) {
          setErrorMessage('Some details are missing or invalid. Please review your listing.')
        } else {
          setErrorMessage('Something went wrong. Please try again.')
        }
        setSubmitState('error')
        return
      }

      setSubmitState('success')
      // Clear any autosave error banner so it doesn't show on the success screen
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
          <h2 className="text-foreground text-2xl font-bold tracking-tight">Sent for review!</h2>
          <p className="text-muted-foreground max-w-sm">
            Your listing is now under review. It will go live within{' '}
            <span className="text-foreground font-medium">24 hours</span> once approved by our team.
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
            {propertyType === 'VILLA' && '🏡'}
            {propertyType === 'INDEPENDENT_HOUSE' && '🏠'}
            {propertyType === 'PLOT' && '🟫'}
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
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-xs text-amber-800">
            Your listing will be reviewed by our team before going live. This usually takes less
            than 24 hours.
          </p>
        </div>

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
          disabled={submitState === 'loading'}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-bold text-white shadow-sm',
            'focus-visible:ring-ring transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            submitState === 'loading'
              ? 'bg-primary/70 cursor-not-allowed'
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
