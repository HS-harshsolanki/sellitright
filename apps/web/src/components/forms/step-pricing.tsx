'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/supabase/auth-context'
import { useSellFormStore } from '@/stores/sell-form.store'

const LAKH = 100_000
const CRORE = 10_000_000

function parseRawPrice(formatted: string): number {
  return Number(formatted.replace(/,/g, ''))
}

function getPriceLabel(rupees: number): string {
  if (!rupees || isNaN(rupees)) return ''
  if (rupees >= CRORE) {
    const cr = rupees / CRORE
    const formatted = cr % 1 === 0 ? cr.toFixed(0) : parseFloat(cr.toFixed(2)).toString()
    return `₹ ${formatted} Crores`
  }
  const l = rupees / LAKH
  const formatted = l % 1 === 0 ? l.toFixed(0) : parseFloat(l.toFixed(1)).toString()
  return `₹ ${formatted} Lakhs`
}

function getPricePerSqFt(rupees: number, builtUpArea: string): string | null {
  const area = Number(builtUpArea)
  if (!area || !rupees) return null
  const ppsf = Math.round(rupees / area)
  return `₹ ${ppsf.toLocaleString('en-IN')} / sq ft`
}

const inputBase = cn(
  'w-full rounded-lg border bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground',
  'transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
)

const labelClass = 'block text-sm font-medium text-foreground'

interface StepPricingProps {
  showErrors?: boolean
}

export function StepPricing({ showErrors = false }: StepPricingProps) {
  const {
    propertyType,
    location,
    pricing,
    details,
    setPricing,
    aiGenerationCount,
    aiCooldownUntil,
    descriptionSource,
    titleSource,
    descriptionGenerationInFlight,
    setAiRateLimit,
    setDescriptionSource,
    setTitleSource,
    setDescriptionGeneratedFromHash,
    descriptionGeneratedFromHash,
  } = useSellFormStore()

  const { user } = useAuth()

  const rawPrice = parseRawPrice(pricing.price)
  const priceLabel = getPriceLabel(rawPrice)
  const pricePerSqFt = getPricePerSqFt(rawPrice, details.builtUpArea)

  const priceMissing = showErrors && rawPrice <= 0
  const priceTooLow = showErrors && rawPrice > 0 && rawPrice < 100_000

  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [tone, setTone] = useState<'warm' | 'professional' | 'luxury' | 'concise'>('warm')

  // Hash of detail fields used during last generation — to detect stale AI description
  const currentDetailsHash = [
    details.bhkType,
    details.builtUpArea,
    details.floor,
    details.totalFloors,
    details.facing,
    details.furnishing,
    details.bathrooms,
    details.balconies,
    details.parking,
    details.ageOfProperty,
    details.amenities.join(','),
    location.city,
    location.locality,
  ].join('|')
  const isAiStale =
    descriptionSource === 'ai' &&
    !!descriptionGeneratedFromHash &&
    descriptionGeneratedFromHash !== currentDetailsHash

  const MAX_GENERATIONS = 5
  const COOLDOWN_MS = 10_000

  const isCoolingDown = Date.now() < aiCooldownUntil
  const isLimitReached = aiGenerationCount >= MAX_GENERATIONS
  const canGenerate =
    !isGenerating && !isCoolingDown && !isLimitReached && !!user && !descriptionGenerationInFlight

  async function handleGenerate() {
    if (!canGenerate) return
    if (descriptionSource === 'manual' && pricing.description.trim().length > 0) {
      if (!window.confirm('Replace your description with AI-generated text?')) return
    }
    setIsGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/listings/ai-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyType: propertyType ?? 'APARTMENT',
          bhkType: details.bhkType,
          builtUpArea: details.builtUpArea ? parseInt(details.builtUpArea, 10) : null,
          city: location.city,
          locality: location.locality,
          furnishing: details.furnishing,
          bathrooms: details.bathrooms,
          balconies: details.balconies,
          floor: details.floor ? parseInt(details.floor, 10) : null,
          totalFloors: details.totalFloors ? parseInt(details.totalFloors, 10) : null,
          facing: details.facing,
          parking: details.parking,
          ageOfProperty: details.ageOfProperty ? parseInt(details.ageOfProperty, 10) : null,
          amenities: details.amenities,
          tone,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setGenerateError(body.error ?? 'Failed to generate. Try again.')
        return
      }
      const data = (await res.json()) as { title: string; description: string }
      if (data.description) {
        setPricing({ description: data.description })
        setDescriptionSource('ai')
        setDescriptionGeneratedFromHash(currentDetailsHash)
      }
      if (data.title && (titleSource !== 'manual' || !pricing.title.trim())) {
        setPricing({ title: data.title })
        setTitleSource('ai')
      }
      setAiRateLimit(aiGenerationCount + 1, Date.now() + COOLDOWN_MS)
    } catch {
      setGenerateError('Network error — check your connection.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    const formatted = digits ? Number(digits).toLocaleString('en-IN') : ''
    setPricing({ price: formatted })
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Set your asking price
        </h2>
        <p className="text-muted-foreground">You can always change this later.</p>
      </div>

      {/* Price input */}
      <div className="space-y-3">
        <label htmlFor="price" className={labelClass}>
          Asking Price (₹) <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <span className="text-muted-foreground pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold">
            ₹
          </span>
          <input
            id="price"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={pricing.price}
            onChange={handlePriceChange}
            aria-invalid={priceMissing || priceTooLow ? 'true' : undefined}
            aria-describedby={priceMissing || priceTooLow ? 'price-error' : undefined}
            className={cn(
              inputBase,
              'pl-8 text-xl font-semibold tracking-tight',
              priceMissing || priceTooLow
                ? 'border-destructive focus:border-destructive'
                : 'border-border focus:border-primary',
            )}
          />
        </div>

        {priceMissing && (
          <p id="price-error" role="alert" className="text-destructive text-xs">
            Please enter your asking price.
          </p>
        )}
        {priceTooLow && (
          <p id="price-error" role="alert" className="text-destructive text-xs">
            Minimum listing price is ₹1 Lakh. Please check your entry.
          </p>
        )}

        {/* Live conversions */}
        {priceLabel && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-primary/10 rounded-lg px-4 py-2">
              <p className="text-primary text-base font-bold">{priceLabel}</p>
            </div>
            {pricePerSqFt && (
              <div className="bg-muted rounded-lg px-4 py-2">
                <p className="text-muted-foreground text-sm font-medium">{pricePerSqFt}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Negotiable toggle */}
      <div className="border-border flex items-center justify-between rounded-xl border px-4 py-4">
        <div>
          <p className="text-foreground text-sm font-medium">Price Negotiable</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Let buyers know you&apos;re open to offers
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={pricing.negotiable}
          onClick={() => setPricing({ negotiable: !pricing.negotiable })}
          className={cn(
            'relative h-6 w-11 rounded-full transition-colors',
            'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            pricing.negotiable ? 'bg-primary' : 'bg-border',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
              pricing.negotiable ? 'left-5' : 'left-0.5',
            )}
          />
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          Optional — Listing Details
        </p>
        <p className="text-muted-foreground text-xs">
          A custom title and description help your listing stand out in search.
        </p>
      </div>

      {/* Optional title */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <label htmlFor="listing-title" className={labelClass}>
            Listing Title
          </label>
          {titleSource === 'ai' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
              <Sparkles className="h-2.5 w-2.5" />
              AI-suggested
            </span>
          )}
        </div>
        <input
          id="listing-title"
          type="text"
          placeholder="e.g. Spacious 3 BHK with garden view in Koramangala"
          value={pricing.title}
          onChange={(e) => {
            setPricing({ title: e.target.value })
            if (titleSource !== 'manual') setTitleSource('manual')
          }}
          className={cn(inputBase, 'border-border focus:border-primary')}
          maxLength={100}
        />
        <p className="text-muted-foreground text-right text-xs">{pricing.title.length}/100</p>
      </div>

      {/* Optional description */}
      <div className="space-y-2">
        {/* Label row */}
        <div className="flex items-center gap-2">
          <label htmlFor="listing-desc" className={labelClass}>
            Description
          </label>
          {descriptionSource === 'ai' && !isAiStale && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
              <Sparkles className="h-2.5 w-2.5" />
              AI-generated
            </span>
          )}
        </div>

        {/* Stale nudge */}
        {isAiStale && (
          <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <Sparkles className="h-3 w-3 shrink-0" />
            You updated your listing details — regenerate to reflect the changes.
          </p>
        )}

        {/* Tone selector + generate button */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--color-muted-foreground)]">Tone:</span>
          {(['warm', 'professional', 'luxury', 'concise'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                tone === t
                  ? 'border-[var(--color-foreground)] bg-[var(--color-foreground)] text-white'
                  : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-foreground)] hover:text-[var(--color-foreground)]',
              )}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={!canGenerate}
            className={cn(
              'ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              'bg-[var(--color-foreground)] text-white hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            {isGenerating || descriptionGenerationInFlight ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-3 w-3" aria-hidden="true" />
            )}
            {isGenerating
              ? 'Generating…'
              : descriptionGenerationInFlight
                ? 'Writing…'
                : isLimitReached
                  ? 'Limit reached'
                  : !user
                    ? 'Sign in'
                    : isCoolingDown
                      ? 'Please wait…'
                      : descriptionSource === 'ai'
                        ? 'Regenerate'
                        : 'Generate'}
          </button>
        </div>

        <textarea
          id="listing-desc"
          rows={8}
          placeholder="Describe what makes your property special — highlights, neighbourhood, nearby landmarks…"
          value={pricing.description}
          onChange={(e) => {
            setPricing({ description: e.target.value })
            if (descriptionSource !== 'manual') setDescriptionSource('manual')
          }}
          className={cn(
            inputBase,
            'border-border focus:border-primary resize-none overflow-y-auto',
          )}
          maxLength={1000}
        />
        {generateError && <p className="text-xs text-red-600">{generateError}</p>}
        <p className="text-muted-foreground text-right text-xs">
          {pricing.description.length}/1000
        </p>
      </div>
    </div>
  )
}
