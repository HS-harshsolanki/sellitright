'use client'

import { IndianRupee } from 'lucide-react'

import { cn } from '@/lib/utils'
import { BUDGET_PRESETS, type BudgetRange } from '../smart-search-types'

interface BudgetSegmentProps {
  budget: BudgetRange | null
  aiFilledFields: boolean
  onBudgetChange: (budget: BudgetRange | null) => void
}

export function BudgetSegment({ budget, aiFilledFields, onBudgetChange }: BudgetSegmentProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <IndianRupee
          className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]"
          aria-hidden="true"
        />
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
          Budget
          {aiFilledFields && budget && (
            <span className="ml-1 text-[10px] font-bold text-violet-500">✦ AI</span>
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {BUDGET_PRESETS.map((p) => {
          const isActive = budget?.min === p.min && budget?.max === p.max
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onBudgetChange(isActive ? null : p)}
              className={cn(
                'rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors',
                isActive
                  ? 'border-[var(--color-primary)] bg-gray-50 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-gray-700 hover:border-gray-400 hover:bg-gray-50',
              )}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
