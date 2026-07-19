import {
  Bed,
  Maximize2,
  Building2,
  Compass,
  Sofa,
  Car,
  Layers,
  Calendar,
  Wind,
  CheckCircle2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import {
  formatBHK,
  formatArea,
  formatFacing,
  formatFurnishing,
  formatParking,
  formatFloor,
  formatAge,
} from '@/lib/format'
import type { MockListing } from '@/lib/mock-data'

interface HighlightItem {
  icon: LucideIcon
  title: string
  subtitle: string
}

interface PropertyHighlightsProps {
  listing: Pick<
    MockListing,
    | 'bhkType'
    | 'propertyType'
    | 'builtUpArea'
    | 'carpetArea'
    | 'floor'
    | 'totalFloors'
    | 'facing'
    | 'furnishing'
    | 'parking'
    | 'bathrooms'
    | 'balconies'
    | 'ageOfProperty'
  >
}

function buildHighlights(listing: PropertyHighlightsProps['listing']): HighlightItem[] {
  const items: HighlightItem[] = []

  // Bedrooms / configuration
  items.push({
    icon: Bed,
    title: formatBHK(listing.bhkType),
    subtitle: `${listing.bathrooms} ${listing.bathrooms === 1 ? 'bathroom' : 'bathrooms'}${listing.balconies ? ` · ${listing.balconies} ${listing.balconies === 1 ? 'balcony' : 'balconies'}` : ''}`,
  })

  // Built-up area
  items.push({
    icon: Maximize2,
    title: formatArea(listing.builtUpArea),
    subtitle: listing.carpetArea
      ? `${formatArea(listing.carpetArea)} carpet area`
      : 'Built-up area',
  })

  // Floor
  const floorStr = formatFloor(listing.floor, listing.totalFloors)
  items.push({
    icon: Building2,
    title: `Floor ${floorStr}`,
    subtitle:
      listing.floor !== null && listing.totalFloors !== null
        ? `${listing.floor} of ${listing.totalFloors} floors in the building`
        : 'Floor information',
  })

  // Furnishing
  items.push({
    icon: Sofa,
    title: formatFurnishing(listing.furnishing),
    subtitle:
      listing.furnishing === 'FURNISHED'
        ? 'Fully furnished with appliances and furniture'
        : listing.furnishing === 'SEMI_FURNISHED'
          ? 'Partially furnished — some fittings included'
          : 'Bare shell — bring your own fittings',
  })

  // Property age / move-in readiness
  const ageYears = listing.ageOfProperty
  items.push({
    icon: ageYears === 0 ? CheckCircle2 : Calendar,
    title: ageYears === 0 ? 'Ready to move' : `${formatAge(ageYears)} old`,
    subtitle:
      ageYears === 0
        ? 'Less than 1 year old — move-in ready'
        : ageYears !== null && ageYears <= 2
          ? 'Recently built — 1 to 2 years old'
          : 'Well-established property',
  })

  // Facing
  if (listing.facing) {
    items.push({
      icon: Compass,
      title: `${formatFacing(listing.facing)} facing`,
      subtitle: 'Unit orientation for natural light and ventilation',
    })
  }

  // Parking
  if (listing.parking && listing.parking !== 'NONE') {
    items.push({
      icon: Car,
      title: `${formatParking(listing.parking)} parking`,
      subtitle:
        listing.parking === 'COVERED'
          ? 'Dedicated covered parking included'
          : listing.parking === 'BOTH'
            ? 'Covered and open parking available'
            : 'Open parking space included',
    })
  }

  // Carpet area (only if not already shown as subtitle above)
  if (listing.carpetArea && listing.builtUpArea) {
    const efficiency = Math.round((listing.carpetArea / listing.builtUpArea) * 100)
    if (efficiency >= 80) {
      items.push({
        icon: Layers,
        title: 'High carpet efficiency',
        subtitle: `${efficiency}% usable carpet area ratio`,
      })
    }
  }

  // Ventilation note based on facing
  if (!listing.facing && listing.balconies && listing.balconies >= 2) {
    items.push({
      icon: Wind,
      title: 'Well ventilated',
      subtitle: `${listing.balconies} balconies provide good cross-ventilation`,
    })
  }

  // Keep max 6 for clean layout
  return items.slice(0, 6)
}

export function PropertyHighlights({ listing }: PropertyHighlightsProps) {
  const highlights = buildHighlights(listing)

  return (
    <section aria-labelledby="highlights-heading">
      <p
        id="highlights-heading"
        className="mb-6 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]"
      >
        What this property offers
      </p>

      {/*
        Airbnb-style: large icon (left, in a circle) + stacked text (right)
        Each row has prominent title + muted subtitle below it.
        Max 6 items in a single-column list with 24px between items.
      */}
      <div className="space-y-6">
        {highlights.map(({ icon: Icon, title, subtitle }) => (
          <div key={title} className="flex items-start gap-4">
            {/* Icon container */}
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-background)]"
              aria-hidden="true"
            >
              <Icon className="h-5 w-5 text-[var(--color-foreground)]" />
            </div>

            {/* Text */}
            <div className="pt-0.5">
              <p className="text-sm font-semibold leading-snug text-[var(--color-foreground)]">
                {title}
              </p>
              <p className="mt-0.5 text-sm leading-snug text-[var(--color-muted-foreground)]">
                {subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
