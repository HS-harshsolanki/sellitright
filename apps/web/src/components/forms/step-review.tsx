'use client'

import { cn } from '@/lib/utils'
import { useSellFormStore } from '@/stores/sell-form.store'
import { CheckCircle2, Edit2, Loader2 } from 'lucide-react'
import { useState } from 'react'

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
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <button
        type="button"
        onClick={() => goToStep(stepIndex)}
        className={cn(
          'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary',
          'hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
      <span className="text-right font-medium text-foreground">{value || '—'}</span>
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
  const { propertyType, location, details, photos, pricing, goToStep, reset } =
    useSellFormStore()

  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const bhkLabel = details.bhkType ? BHK_LABELS[details.bhkType] ?? '' : ''
  const propertyLabel = propertyType ? PROPERTY_TYPE_LABELS[propertyType] ?? '' : ''

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
      reset()
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
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Listing submitted for review
          </h2>
          <p className="max-w-sm text-muted-foreground">
            Our team will review your listing and publish it within{' '}
            <span className="font-medium text-foreground">24 hours</span>. You&apos;ll receive an
            SMS confirmation once it goes live.
          </p>
        </div>
        <a
          href="/dashboard"
          className={cn(
            'rounded-xl bg-primary px-8 py-3 text-sm font-bold text-white shadow-sm',
            'transition-all hover:bg-primary/90 active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          )}
        >
          Go to Dashboard
        </a>
      </div>
    )
  }

  // ── Review screen ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Review your listing
        </h2>
        <p className="text-muted-foreground">Check all the details before submitting.</p>
      </div>

      {/* Property Type */}
      <section className="space-y-3 rounded-xl border border-border p-4">
        <SectionHeader title="Property Type" stepIndex={0} />
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg">
            {propertyType === 'APARTMENT' && '🏢'}
            {propertyType === 'VILLA' && '🏡'}
            {propertyType === 'INDEPENDENT_HOUSE' && '🏠'}
            {propertyType === 'PLOT' && '🟫'}
            {propertyType === 'PENTHOUSE' && '✨'}
          </div>
          <p className="font-semibold text-foreground">
            {propertyType ? PROPERTY_TYPE_LABELS[propertyType] : '—'}
          </p>
        </div>
      </section>

      {/* Location */}
      <section className="space-y-3 rounded-xl border border-border p-4">
        <SectionHeader title="Location" stepIndex={1} />
        <div className="divide-y divide-border">
          <ReviewRow label="City" value={location.city} />
          <ReviewRow label="State" value={location.state} />
          <ReviewRow label="Locality" value={location.locality} />
          <ReviewRow label="Pincode" value={location.pincode} />
          {location.address && <ReviewRow label="Address" value={location.address} />}
        </div>
      </section>

      {/* Photos */}
      <section className="space-y-3 rounded-xl border border-border p-4">
        <SectionHeader title="Photos" stepIndex={3} />
        {photos.length === 0 ? (
          <button
            type="button"
            onClick={() => goToStep(3)}
            className="w-full rounded-lg border-2 border-dashed border-border py-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary"
          >
            No photos added — tap to add photos
          </button>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.slice(0, 6).map((url, index) => (
              <div
                key={url}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border"
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
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-sm font-medium text-muted-foreground">
                +{photos.length - 6}
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {photos.length} photo{photos.length !== 1 ? 's' : ''} added
        </p>
      </section>

      {/* Details */}
      <section className="space-y-3 rounded-xl border border-border p-4">
        <SectionHeader title="Property Details" stepIndex={2} />
        <div className="divide-y divide-border">
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
          <ReviewRow
            label="Facing"
            value={details.facing ? FACING_FULL[details.facing] : null}
          />
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
            <p className="mb-2 text-xs text-muted-foreground">Amenities</p>
            <div className="flex flex-wrap gap-1.5">
              {details.amenities.map((a) => (
                <span
                  key={a}
                  className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Pricing */}
      <section className="space-y-3 rounded-xl border border-border p-4">
        <SectionHeader title="Pricing" stepIndex={4} />
        <div className="flex items-end gap-3">
          <p className="text-2xl font-bold text-foreground">
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
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="mt-1 line-clamp-3 text-sm text-foreground">{pricing.description}</p>
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
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
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
            'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            submitState === 'loading'
              ? 'cursor-not-allowed bg-primary/70'
              : 'bg-primary hover:bg-primary/90 active:scale-[0.99]',
          )}
        >
          {submitState === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitState === 'loading' ? 'Submitting…' : 'Submit for Review'}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          By submitting, you agree to our{' '}
          <a href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </a>
          .
        </p>
      </div>
    </div>
  )
}
