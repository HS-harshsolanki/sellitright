'use client'

import { useSellFormStore } from '@/stores/sell-form.store'

interface StepAreaProps {
  showErrors: boolean
}

export function StepArea({ showErrors }: StepAreaProps) {
  const { details, setDetails } = useSellFormStore()

  const handleBuiltUpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    setDetails({ builtUpArea: value })
  }

  const handleCarpetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    setDetails({ carpetArea: value })
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">What&apos;s the built-up area?</h2>
        <p className="mt-2 text-[var(--color-muted-foreground)]">In square feet</p>
      </div>

      <div className="mt-16 flex w-full flex-col items-center gap-8">
        <div className="flex items-center justify-center gap-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={details.builtUpArea}
            onChange={handleBuiltUpChange}
            placeholder="0"
            className="placeholder:text-[var(--color-muted-foreground)]/30 w-72 border-b-2 border-[var(--color-foreground)] bg-transparent text-center text-7xl font-bold outline-none"
            aria-label="Built-up area in square feet"
          />
          <span className="text-3xl text-[var(--color-muted-foreground)]">sq ft</span>
        </div>

        {showErrors && !details.builtUpArea && (
          <p className="text-sm text-red-500">Please enter the built-up area.</p>
        )}

        <div className="mt-4 flex flex-col items-center gap-2">
          <label
            htmlFor="carpet-area"
            className="text-sm font-medium text-[var(--color-muted-foreground)]"
          >
            Carpet area (optional)
          </label>
          <div className="flex items-center gap-3">
            <input
              id="carpet-area"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={details.carpetArea}
              onChange={handleCarpetChange}
              placeholder="0"
              className="placeholder:text-[var(--color-muted-foreground)]/30 w-40 border-b-2 border-[var(--color-border)] bg-transparent text-center text-2xl font-bold outline-none transition-colors focus:border-[var(--color-foreground)]"
              aria-label="Carpet area in square feet"
            />
            <span className="text-lg text-[var(--color-muted-foreground)]">sq ft</span>
          </div>
        </div>
      </div>
    </div>
  )
}
