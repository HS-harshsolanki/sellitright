'use client'

import { Minus, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSellFormStore, type BHKType } from '@/stores/sell-form.store'

const BHK_OPTIONS: { value: BHKType; label: string; num: number }[] = [
  { value: 'ONE_BHK', label: '1 BHK', num: 1 },
  { value: 'TWO_BHK', label: '2 BHK', num: 2 },
  { value: 'THREE_BHK', label: '3 BHK', num: 3 },
  { value: 'FOUR_BHK', label: '4 BHK', num: 4 },
  { value: 'FIVE_PLUS_BHK', label: '5+ BHK', num: 5 },
]

interface StepBhkProps {
  showErrors: boolean
}

export function StepBhk({ showErrors }: StepBhkProps) {
  const { details, setDetails } = useSellFormStore()

  // Default to TWO_BHK if null
  const currentValue: BHKType = details.bhkType ?? 'TWO_BHK'
  const DEFAULT_OPTION = { value: 'TWO_BHK' as BHKType, label: '2 BHK', num: 2 }
  const currentOption = BHK_OPTIONS.find((o) => o.value === currentValue) ?? DEFAULT_OPTION
  const currentIndex = BHK_OPTIONS.findIndex((o) => o.value === currentValue)

  const handleDecrement = () => {
    if (currentIndex > 0) {
      const prev = BHK_OPTIONS[currentIndex - 1]
      if (prev) setDetails({ bhkType: prev.value })
    }
  }

  const handleIncrement = () => {
    if (currentIndex < BHK_OPTIONS.length - 1) {
      const next = BHK_OPTIONS[currentIndex + 1]
      if (next) setDetails({ bhkType: next.value })
    }
  }

  const isAtMin = currentIndex === 0
  const isAtMax = currentIndex === BHK_OPTIONS.length - 1

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">How many bedrooms?</h2>
        <p className="mt-2 text-[var(--color-muted-foreground)]">
          Including living room configurations
        </p>
      </div>

      <div className="mt-16 flex items-center justify-center gap-8">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={isAtMin}
          className={`flex h-14 w-14 items-center justify-center rounded-full border-2 border-[var(--color-border)] transition-all ${
            isAtMin
              ? 'cursor-not-allowed opacity-30'
              : 'hover:border-[var(--color-foreground)]/50 hover:bg-[var(--color-foreground)]/5 cursor-pointer'
          }`}
          aria-label="Decrease bedrooms"
        >
          <Minus className="h-5 w-5" />
        </button>

        <div className="w-32 text-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={currentOption.num}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="block text-8xl font-bold tabular-nums"
            >
              {currentOption.num === 5 ? '5+' : currentOption.num}
            </motion.span>
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={isAtMax}
          className={`flex h-14 w-14 items-center justify-center rounded-full border-2 border-[var(--color-border)] transition-all ${
            isAtMax
              ? 'cursor-not-allowed opacity-30'
              : 'hover:border-[var(--color-foreground)]/50 hover:bg-[var(--color-foreground)]/5 cursor-pointer'
          }`}
          aria-label="Increase bedrooms"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <p className="text-xl text-[var(--color-muted-foreground)]">{currentOption.label}</p>

      {showErrors && details.bhkType === null && (
        <p className="text-sm text-red-500">Please select a bedroom count.</p>
      )}
    </div>
  )
}
