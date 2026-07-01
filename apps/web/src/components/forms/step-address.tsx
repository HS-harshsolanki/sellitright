'use client'

import { useSellFormStore } from '@/stores/sell-form.store'

interface Props {
  showErrors: boolean
}

export function StepAddress({ showErrors }: Props) {
  const city = useSellFormStore((s) => s.location.city)
  const locality = useSellFormStore((s) => s.location.locality)
  const pincode = useSellFormStore((s) => s.location.pincode)
  const address = useSellFormStore((s) => s.location.address)
  const setLocation = useSellFormStore((s) => s.setLocation)

  const inputClass = (hasError: boolean) =>
    [
      'rounded-xl border-2 px-4 py-4 text-base w-full outline-none transition-colors',
      hasError
        ? 'border-red-500 focus:border-red-500'
        : 'border-[var(--color-border)] focus:border-[var(--color-foreground)]',
    ].join(' ')

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-center text-3xl font-bold sm:text-4xl">Where exactly is it?</h1>

      {city && (
        <p className="mt-2 text-center text-[var(--color-muted-foreground)]">
          in <span className="font-medium text-[var(--color-primary)]">{city}</span>
        </p>
      )}

      <div className="mx-auto mt-10 w-full max-w-lg space-y-5">
        {/* Read-only city chip */}
        {city && (
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[var(--color-muted)] px-3 py-1.5 text-sm font-medium">
              {city}
            </span>
          </div>
        )}

        {/* Locality */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Locality / Area <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={locality}
            onChange={(e) => setLocation({ locality: e.target.value })}
            placeholder="e.g. Koramangala, Bandra West"
            className={inputClass(showErrors && !locality.trim())}
          />
          {showErrors && !locality.trim() && (
            <p className="mt-1 text-sm text-red-500">Please enter the locality or area.</p>
          )}
        </div>

        {/* Pincode */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Pincode <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={pincode}
            maxLength={6}
            onChange={(e) => setLocation({ pincode: e.target.value.replace(/\D/g, '') })}
            placeholder="6-digit pincode"
            className={inputClass(showErrors && !pincode.trim())}
          />
          {showErrors && !pincode.trim() && (
            <p className="mt-1 text-sm text-red-500">Please enter the pincode.</p>
          )}
        </div>

        {/* Full Address */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Full Address <span className="text-red-500">*</span>
          </label>
          <textarea
            value={address}
            onChange={(e) => setLocation({ address: e.target.value })}
            placeholder="House/flat number, building name, street"
            rows={3}
            className={[inputClass(showErrors && !address.trim()), 'resize-none'].join(' ')}
          />
          {showErrors && !address.trim() && (
            <p className="mt-1 text-sm text-red-500">Please enter the full address.</p>
          )}
        </div>
      </div>
    </div>
  )
}
