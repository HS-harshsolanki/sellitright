'use client'

import { useState } from 'react'
import { CheckSquare } from 'lucide-react'

const MAX_AMENITIES = 10

interface ShowAllAmenitiesProps {
  amenities: string[]
}

export function ShowAllAmenities({ amenities }: ShowAllAmenitiesProps) {
  const [showAll, setShowAll] = useState(false)

  const visibleAmenities = showAll ? amenities : amenities.slice(0, MAX_AMENITIES)
  const hiddenCount = amenities.length - MAX_AMENITIES

  return (
    <>
      {/* 2-column amenity grid */}
      <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-2 sm:gap-x-6">
        {visibleAmenities.map((amenity) => (
          <div key={amenity} className="flex items-center gap-3">
            <CheckSquare
              className="h-4 w-4 shrink-0 text-[var(--color-foreground)]"
              aria-hidden="true"
            />
            <span className="text-sm text-[var(--color-foreground)]">{amenity}</span>
          </div>
        ))}
      </div>

      {/* Toggle button — only when there are hidden ones */}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[var(--color-foreground)] px-5 py-2.5 text-sm font-semibold text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        >
          {showAll ? 'Show fewer amenities' : `Show all ${amenities.length} amenities`}
        </button>
      )}
    </>
  )
}
