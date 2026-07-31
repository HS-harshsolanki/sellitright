'use client'

import { Home } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  BHK_OPTIONS,
  FURNISHING_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  type BHKType,
  type Furnishing,
  type PropertyType,
} from '../smart-search-types'

interface WhatSegmentProps {
  bhkTypes: BHKType[]
  propertyType: PropertyType | null
  furnishing: Furnishing | null
  aiFilledFields: boolean
  onBHKChange: (types: BHKType[]) => void
  onPropertyTypeChange: (type: PropertyType | null) => void
  onFurnishingChange: (f: Furnishing | null) => void
}

export function WhatSegment({
  bhkTypes,
  propertyType,
  furnishing,
  aiFilledFields,
  onBHKChange,
  onPropertyTypeChange,
  onFurnishingChange,
}: WhatSegmentProps) {
  function toggleBHK(v: BHKType) {
    if (bhkTypes.includes(v)) {
      onBHKChange(bhkTypes.filter((b) => b !== v))
    } else {
      onBHKChange([...bhkTypes, v])
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── BHK ─────────────────────────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <Home className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
            BHK
            {aiFilledFields && bhkTypes.length > 0 && (
              <span className="ml-1 text-[10px] font-bold text-[var(--color-primary)]">✦ AI</span>
            )}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BHK_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggleBHK(opt)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                bhkTypes.includes(opt)
                  ? 'border-[var(--color-primary)] bg-gray-50 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-gray-600 hover:border-gray-400 hover:bg-gray-50',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* ── Property Type ────────────────────────────────────────── */}
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Type
          {aiFilledFields && propertyType && (
            <span className="ml-1 text-[10px] font-bold text-[var(--color-primary)]">✦ AI</span>
          )}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PROPERTY_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onPropertyTypeChange(propertyType === opt ? null : opt)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                propertyType === opt
                  ? 'border-[var(--color-primary)] bg-gray-50 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-gray-600 hover:border-gray-400 hover:bg-gray-50',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* ── Furnishing ───────────────────────────────────────────── */}
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Furnishing
        </span>
        <div className="flex flex-wrap gap-1.5">
          {FURNISHING_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onFurnishingChange(furnishing === opt ? null : opt)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                furnishing === opt
                  ? 'border-[var(--color-primary)] bg-gray-50 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-gray-600 hover:border-gray-400 hover:bg-gray-50',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
