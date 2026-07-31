import type { MockListing } from '@/lib/mock-data'

// Display string → enum value mappings (mirrors browse-client.tsx BHK_MAP / FURNISHING_MAP)
const BHK_DISPLAY_TO_ENUM: Record<string, string> = {
  '1 BHK': 'ONE_BHK',
  '2 BHK': 'TWO_BHK',
  '3 BHK': 'THREE_BHK',
  '4 BHK': 'FOUR_BHK',
  '5+ BHK': 'FIVE_PLUS_BHK',
}

const FURNISHING_DISPLAY_TO_ENUM: Record<string, string> = {
  Furnished: 'FURNISHED',
  'Semi Furnished': 'SEMI_FURNISHED',
  Unfurnished: 'UNFURNISHED',
}

export interface MatchPreferences {
  /** Display string ("2 BHK") or enum value ("TWO_BHK") — both accepted */
  bhkType?: string | null
  /** Display string ("Furnished") or enum value ("FURNISHED") — both accepted */
  furnishing?: string | null
  minPrice?: number | null
  maxPrice?: number | null
  /** City name (e.g. "Mumbai") */
  city?: string | null
  /** Locality name (e.g. "Bandra") */
  locality?: string | null
  /** Property type enum ("APARTMENT", "VILLA", etc.) */
  propertyType?: string | null
}

/**
 * Computes a 0–100 match score for how well a listing fits buyer preferences.
 * Returns undefined when no preferences are active — chip is not shown.
 *
 * Weights:
 *   BHK exact match          30 pts
 *   Price position in budget  25 pts  (lower in range = better deal)
 *   City match                15 pts  (+5 if locality also matches = 20 pts total)
 *   Furnishing match          15 pts  (8 pts partial: semi vs furnished/unfurnished)
 *   Property type match       10 pts
 *
 * Normalised: only active dimensions contribute to the denominator,
 * so partial filter sets still produce a meaningful 0–100 number.
 */
export function computeMatchScore(
  listing: MockListing,
  prefs: MatchPreferences,
): number | undefined {
  let totalWeight = 0
  let earned = 0

  // ── BHK (30 pts) ─────────────────────────────────────────────────────────────
  if (prefs.bhkType) {
    const target = BHK_DISPLAY_TO_ENUM[prefs.bhkType] ?? prefs.bhkType
    totalWeight += 30
    if (listing.bhkType === target) earned += 30
  }

  // ── Price position within budget (25 pts) ────────────────────────────────────
  if (prefs.minPrice != null || prefs.maxPrice != null) {
    const min = prefs.minPrice ?? 0
    const max = prefs.maxPrice ?? Infinity
    totalWeight += 25
    if (listing.price >= min && listing.price <= max) {
      if (!isFinite(max)) {
        // No upper bound — full score
        earned += 25
      } else {
        // Score highest when price is in lower third of range (great value for buyer)
        const range = max - min
        const position = range > 0 ? (listing.price - min) / range : 0
        if (position <= 0.33) earned += 25
        else if (position <= 0.66) earned += 18
        else earned += 12
      }
    }
  }

  // ── City match (15 pts) + locality bonus (5 pts = 20 pts total) ─────────────
  if (prefs.city?.trim() || prefs.locality?.trim()) {
    // City contributes 15 pts, locality adds 5 pts on top when city already matched
    if (prefs.city?.trim()) {
      totalWeight += 15
      const targetCity = prefs.city.trim().toLowerCase()
      const listingCity = listing.city.toLowerCase()
      if (
        listingCity === targetCity ||
        listingCity.includes(targetCity) ||
        targetCity.includes(listingCity)
      ) {
        earned += 15

        // Locality bonus — only when city matched
        if (prefs.locality?.trim()) {
          totalWeight += 5
          const targetLoc = prefs.locality.trim().toLowerCase()
          const listingLoc = listing.locality.toLowerCase()
          if (
            listingLoc === targetLoc ||
            listingLoc.includes(targetLoc) ||
            targetLoc.includes(listingLoc)
          ) {
            earned += 5
          }
        }
      } else if (prefs.locality?.trim()) {
        // City didn't match — still allocate locality weight so denominator is correct
        totalWeight += 5
        const targetLoc = prefs.locality.trim().toLowerCase()
        const listingLoc = listing.locality.toLowerCase()
        if (
          listingLoc === targetLoc ||
          listingLoc.includes(targetLoc) ||
          targetLoc.includes(listingLoc)
        ) {
          earned += 5
        }
      }
    } else if (prefs.locality?.trim()) {
      // Only locality provided — use the combined 20 pt bucket
      totalWeight += 20
      const targetLoc = prefs.locality.trim().toLowerCase()
      const listingLoc = listing.locality.toLowerCase()
      if (
        listingLoc === targetLoc ||
        listingLoc.includes(targetLoc) ||
        targetLoc.includes(listingLoc)
      ) {
        earned += 20
      } else {
        // Partial: locality substring in city
        const listingCity = listing.city.toLowerCase()
        if (listingCity.includes(targetLoc) || targetLoc.includes(listingCity)) {
          earned += 10
        }
      }
    }
  }

  // ── Furnishing (15 pts) ──────────────────────────────────────────────────────
  if (prefs.furnishing) {
    const target = FURNISHING_DISPLAY_TO_ENUM[prefs.furnishing] ?? prefs.furnishing
    totalWeight += 15
    if (listing.furnishing === target) {
      earned += 15
    } else if (
      (target === 'FURNISHED' && listing.furnishing === 'SEMI_FURNISHED') ||
      (target === 'UNFURNISHED' && listing.furnishing === 'SEMI_FURNISHED')
    ) {
      // Semi-furnished is partial credit toward either extreme
      earned += 8
    }
  }

  // ── Property type (10 pts) ───────────────────────────────────────────────────
  if (prefs.propertyType) {
    totalWeight += 10
    if (listing.propertyType === prefs.propertyType) earned += 10
  }

  if (totalWeight === 0) return undefined
  return Math.round((earned / totalWeight) * 100)
}

/** Tailwind colour name for a match score chip */
export function matchScoreColor(score: number): string {
  if (score >= 80) return 'emerald'
  if (score >= 60) return 'blue'
  if (score >= 40) return 'amber'
  return 'gray'
}
