'use client'

import { useRef, useEffect } from 'react'

import { useSellFormStore } from '@/stores/sell-form.store'

function formatIndianNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('en-IN')
}

function getPriceLabel(price: string): string {
  const num = Number(price.replace(/,/g, ''))
  if (!num) return ''
  if (num >= 10_000_000) return `₹ ${(num / 10_000_000).toFixed(2)} Crores`
  if (num >= 100_000) return `₹ ${(num / 100_000).toFixed(0)} Lakhs`
  return ''
}

interface Props {
  showErrors: boolean
}

export function StepPrice({ showErrors }: Props) {
  const price = useSellFormStore((s) => s.pricing.price)
  const negotiable = useSellFormStore((s) => s.pricing.negotiable)
  const setPricing = useSellFormStore((s) => s.setPricing)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatIndianNumber(e.target.value)
    setPricing({ price: formatted })
  }

  const priceLabel = getPriceLabel(price)
  const hasError = showErrors && !price

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-center text-3xl font-bold sm:text-4xl">What&apos;s your asking price?</h1>
      <p className="mt-2 text-center text-[var(--color-muted-foreground)]">
        You can always change this later
      </p>

      <div className="mt-16 flex flex-col items-center gap-4">
        {/* Price input row */}
        <div className="flex items-end gap-2">
          <span className="pb-1 text-5xl font-bold leading-none text-[var(--color-muted-foreground)]">
            ₹
          </span>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={price}
            onChange={handleChange}
            placeholder="0"
            className={[
              'w-64 border-none bg-transparent text-center text-6xl font-bold outline-none',
              'border-b-2',
              hasError ? 'border-red-500' : 'border-[var(--color-foreground)]',
            ].join(' ')}
          />
        </div>

        {/* Live conversion chip */}
        {priceLabel && (
          <span className="rounded-full bg-[var(--color-muted)] px-4 py-2 text-sm font-medium">
            {priceLabel}
          </span>
        )}

        {/* Error message */}
        {hasError && <p className="mt-1 text-sm text-red-500">Please enter your asking price.</p>}

        {/* Negotiable toggle */}
        <label className="mt-4 flex cursor-pointer select-none items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={negotiable}
            onClick={() => setPricing({ negotiable: !negotiable })}
            className={[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none',
              negotiable ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]',
            ].join(' ')}
          >
            <span
              className={[
                'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
                negotiable ? 'translate-x-6' : 'translate-x-1',
              ].join(' ')}
            />
          </button>
          <span className="text-sm font-medium">Open to negotiation</span>
        </label>
      </div>
    </div>
  )
}
