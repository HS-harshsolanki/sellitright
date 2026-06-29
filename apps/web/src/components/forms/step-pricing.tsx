'use client'

import { cn } from '@/lib/utils'
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
  const { pricing, details, setPricing } = useSellFormStore()

  const rawPrice = parseRawPrice(pricing.price)
  const priceLabel = getPriceLabel(rawPrice)
  const pricePerSqFt = getPricePerSqFt(rawPrice, details.builtUpArea)

  const priceMissing = showErrors && rawPrice <= 0

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
            aria-invalid={priceMissing ? 'true' : undefined}
            aria-describedby={priceMissing ? 'price-error' : undefined}
            className={cn(
              inputBase,
              'pl-8 text-xl font-semibold tracking-tight',
              priceMissing
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
        <label htmlFor="listing-title" className={labelClass}>
          Listing Title
        </label>
        <input
          id="listing-title"
          type="text"
          placeholder="e.g. Spacious 3 BHK with garden view in Koramangala"
          value={pricing.title}
          onChange={(e) => setPricing({ title: e.target.value })}
          className={cn(inputBase, 'border-border focus:border-primary')}
          maxLength={100}
        />
        <p className="text-muted-foreground text-right text-xs">{pricing.title.length}/100</p>
      </div>

      {/* Optional description */}
      <div className="space-y-1.5">
        <label htmlFor="listing-desc" className={labelClass}>
          Description
        </label>
        <textarea
          id="listing-desc"
          rows={5}
          placeholder="Describe what makes your property special — highlights, neighbourhood, nearby landmarks…"
          value={pricing.description}
          onChange={(e) => setPricing({ description: e.target.value })}
          className={cn(inputBase, 'border-border focus:border-primary resize-none')}
          maxLength={1000}
        />
        <p className="text-muted-foreground text-right text-xs">
          {pricing.description.length}/1000
        </p>
      </div>
    </div>
  )
}
