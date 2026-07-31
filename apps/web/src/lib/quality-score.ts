export interface PriceBenchmark {
  medianPriceSqft: number
  stddevPriceSqft: number
}

export interface QualityScoreInput {
  propertyType: string
  imageUrls: string[]
  description: string
  bhkType: string | null
  builtUpArea: number | null
  carpetArea?: number | null
  floor: number | null
  totalFloors: number | null
  facing: string | null
  furnishing: string | null
  bathrooms: number | null
  balconies?: number | null
  parking: string | null
  ageOfProperty: number | null
  amenities: string[]
  price: number
  locality: string
  city: string
  address?: string | null
  pincode?: string | null
  isVerified: boolean
  priceBenchmark?: PriceBenchmark | null
  // Forward hooks — not yet scored but accepted without breaking callers
  updatedAt?: Date | string | null
  title?: string | null
}

// --- Dimension interfaces ---

export interface PhotosDimension {
  score: number
  max: 25
  count: number
}

export interface DescriptionDimension {
  score: number
  max: 20
  wordCount: number
}

export interface DetailsDimension {
  score: number
  max: 25
  missing: string[]
  filled: string[]
}

export interface PriceDimension {
  score: number
  max: 15
  benchmarkAvailable: boolean
  percentDiff?: number // absolute % deviation from benchmark median
}

export interface LocationDimension {
  score: number
  max: 10
  hasLocality: boolean
  hasPincode: boolean
  hasAddress: boolean
}

export interface TrustDimension {
  score: number
  max: 5
}

export interface QualityBreakdown {
  photos: PhotosDimension
  description: DescriptionDimension
  details: DetailsDimension
  price: PriceDimension
  location: LocationDimension
  trust: TrustDimension
}

export interface QualityScoreResult {
  score: number
  breakdown: QualityBreakdown
}

export interface ImprovementAction {
  dimension: keyof QualityBreakdown
  message: string
  /** Short bold headline shown in the action card (falls back to message) */
  title?: string
  /** Supporting detail shown below the title */
  subtitle?: string
  pointsGain: number
  ctaLink?: string
}

// --- Internal constants ---

const PLOT_TYPES = ['PLOT', 'LAND']

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

// --- Dimension scorers ---

/**
 * Photos — max 25 pts
 * Tiers reflect Indian portal benchmarks: top-quartile listings carry 10–15 photos.
 */
function scorePhotos(imageUrls: string[]): PhotosDimension {
  const count = imageUrls.length
  let score = 0
  if (count >= 11) score = 25
  else if (count >= 8) score = 22
  else if (count >= 5) score = 18
  else if (count >= 3) score = 12
  else if (count >= 1) score = 6
  // count === 0 → score stays 0
  return { score, max: 25, count }
}

/**
 * Description — max 20 pts
 * AI-generated descriptions (~65 words) score 16/20 — fair reward without full marks.
 * Full marks require 100+ words of deliberate, specific content.
 */
function scoreDescription(description: string): DescriptionDimension {
  const wordCount = countWords(description)
  let score = 0
  if (wordCount >= 100) score = 20
  else if (wordCount >= 60) score = 16
  else if (wordCount >= 30) score = 12
  else if (wordCount >= 1) score = 5
  // wordCount === 0 → score stays 0
  return { score, max: 20, wordCount }
}

/**
 * Listing Details — max 25 pts
 *
 * Non-PLOT: 8 fields weighted by Indian buyer decision impact, summing to 25.
 * PLOT: bhkType and furnishing are irrelevant; remaining 6 fields sum to 17 and
 *       are scaled up to 25.
 */
function scoreDetails(input: QualityScoreInput): DetailsDimension {
  const isPlot = PLOT_TYPES.includes(input.propertyType?.toUpperCase() ?? '')
  const missing: string[] = []
  const filled: string[] = []
  let earned = 0

  if (isPlot) {
    // Fields applicable to plot/land listings
    const plotFields: Array<{ key: string; passes: boolean; pts: number }> = [
      { key: 'builtUpArea', passes: (input.builtUpArea ?? 0) > 0, pts: 4 },
      { key: 'bathrooms', passes: (input.bathrooms ?? 0) > 0, pts: 3 },
      { key: 'floor', passes: input.floor !== null && input.floor !== undefined, pts: 3 },
      { key: 'facing', passes: !!input.facing, pts: 3 },
      {
        key: 'ageOfProperty',
        passes: input.ageOfProperty !== null && input.ageOfProperty !== undefined,
        pts: 2,
      },
      { key: 'parking', passes: !!input.parking, pts: 2 },
    ]
    // Max raw = 17
    const rawMax = 17
    for (const f of plotFields) {
      if (f.passes) {
        earned += f.pts
        filled.push(f.key)
      } else missing.push(f.key)
    }
    const score = Math.round((earned / rawMax) * 25)
    return { score: Math.min(score, 25), max: 25, missing, filled }
  }

  // Standard property (Apartment, Villa, Studio, Penthouse, Row House, Independent House, etc.)
  const stdFields: Array<{ key: string; passes: boolean; pts: number }> = [
    { key: 'bhkType', passes: !!input.bhkType, pts: 4 },
    { key: 'builtUpArea', passes: (input.builtUpArea ?? 0) > 0, pts: 4 },
    { key: 'furnishing', passes: !!input.furnishing, pts: 4 },
    { key: 'bathrooms', passes: (input.bathrooms ?? 0) > 0, pts: 3 },
    { key: 'floor', passes: input.floor !== null && input.floor !== undefined, pts: 3 },
    { key: 'facing', passes: !!input.facing, pts: 3 },
    {
      key: 'ageOfProperty',
      passes: input.ageOfProperty !== null && input.ageOfProperty !== undefined,
      pts: 2,
    },
    { key: 'parking', passes: !!input.parking, pts: 2 },
  ]
  // Max raw = 25 — no scaling needed
  for (const f of stdFields) {
    if (f.passes) {
      earned += f.pts
      filled.push(f.key)
    } else missing.push(f.key)
  }
  return { score: Math.min(earned, 25), max: 25, missing, filled }
}

/**
 * Price Signal — max 15 pts
 *
 * Compares listing price/sqft against local benchmark using percentage deviation.
 * No benchmark (tier-2/3 cities) → honest 12/15 rather than false 15/15.
 */
function scorePrice(input: QualityScoreInput): PriceDimension {
  const benchmark = input.priceBenchmark

  if (!benchmark || benchmark.medianPriceSqft === 0) {
    return { score: 12, max: 15, benchmarkAvailable: false }
  }

  const builtUpArea = input.builtUpArea
  if (!builtUpArea || builtUpArea <= 0) {
    // Cannot compute price/sqft — treat same as no-benchmark
    return { score: 12, max: 15, benchmarkAvailable: true }
  }

  const listingPriceSqft = input.price / builtUpArea
  const percentDiff = Math.abs(
    (listingPriceSqft - benchmark.medianPriceSqft) / benchmark.medianPriceSqft,
  )

  let score: number
  if (percentDiff <= 0.2) score = 15
  else if (percentDiff <= 0.4) score = 10
  else if (percentDiff <= 0.6) score = 5
  else score = 2 // Outlier — never 0; price deviation may be intentional

  return {
    score,
    max: 15,
    benchmarkAvailable: true,
    percentDiff: Math.round(percentDiff * 1000) / 10, // store as %, e.g. 18.5
  }
}

/**
 * Location Quality — max 10 pts
 *
 * Granular location data is the #1 click-through driver in urban markets.
 * city+locality (5) + pincode (2) + street address (3) = 10.
 */
function scoreLocation(input: QualityScoreInput): LocationDimension {
  const hasLocality =
    typeof input.locality === 'string' &&
    input.locality.trim().length > 0 &&
    typeof input.city === 'string' &&
    input.city.trim().length > 0
  const hasPincode = typeof input.pincode === 'string' && input.pincode.trim().length > 0
  const hasAddress = typeof input.address === 'string' && input.address.trim().length > 0

  const score = (hasLocality ? 5 : 0) + (hasPincode ? 2 : 0) + (hasAddress ? 3 : 0)
  return { score, max: 10, hasLocality, hasPincode, hasAddress }
}

/**
 * Trust / Verified — max 5 pts
 *
 * Binary: verified = 5, unverified = 0.
 * Reduced from 10 so listing quality factors dominate.
 */
function scoreTrust(isVerified: boolean): TrustDimension {
  return { score: isVerified ? 5 : 0, max: 5 }
}

// --- Main export ---

export function computeQualityScore(input: QualityScoreInput): QualityScoreResult {
  const photos = scorePhotos(input.imageUrls)
  const description = scoreDescription(input.description)
  const details = scoreDetails(input)
  const price = scorePrice(input)
  const location = scoreLocation(input)
  const trust = scoreTrust(input.isVerified)

  const score =
    photos.score + description.score + details.score + price.score + location.score + trust.score

  return {
    score: Math.min(score, 100),
    breakdown: { photos, description, details, price, location, trust },
  }
}

// --- Improvement action generator ---

const FIELD_LABELS: Record<string, string> = {
  bhkType: 'BHK type',
  builtUpArea: 'built-up area',
  floor: 'floor number',
  totalFloors: 'total floors',
  facing: 'facing direction',
  furnishing: 'furnishing status',
  bathrooms: 'number of bathrooms',
  parking: 'parking type',
  ageOfProperty: 'age of property',
  amenities: 'at least 3 amenities',
  balconies: 'number of balconies',
  carpetArea: 'carpet area',
}

export function getImprovementActions(
  breakdown: QualityBreakdown,
  listingId?: string,
  bhkType?: string,
  locality?: string,
  priceSqft?: number,
  benchmarkSqft?: number,
): ImprovementAction[] {
  const actions: ImprovementAction[] = []
  const editBase = listingId ? `/sell?edit=${listingId}` : '/sell'

  // Photos — next meaningful tier is 8 (22 pts); max is 11+ (25 pts)
  if (breakdown.photos.score < breakdown.photos.max) {
    const count = breakdown.photos.count
    if (count === 0) {
      actions.push({
        dimension: 'photos',
        title: 'Add photos to your listing',
        subtitle: 'Listings with photos get significantly more views',
        message: 'Add at least 1 photo to list your property',
        pointsGain: 6,
        ctaLink: `${editBase}&step=photos`,
      })
    } else if (count < 8) {
      const gain = 22 - breakdown.photos.score
      const needed = 8 - count
      actions.push({
        dimension: 'photos',
        title: `Add ${needed} more photo${needed > 1 ? 's' : ''} to reach the recommended 8`,
        subtitle: 'High-quality photos attract more buyers',
        message: `Add ${needed} more photo${needed > 1 ? 's' : ''} to reach the recommended 8 (+${gain} pts)`,
        pointsGain: gain,
        ctaLink: `${editBase}&step=photos`,
      })
    } else {
      const gain = breakdown.photos.max - breakdown.photos.score
      const needed = 11 - count
      actions.push({
        dimension: 'photos',
        title: `Add ${needed} more photo${needed > 1 ? 's' : ''} for maximum impact`,
        subtitle: '11+ photos puts your listing in the top tier',
        message: `Add ${needed} more photo${needed > 1 ? 's' : ''} to reach maximum score (+${gain} pts)`,
        pointsGain: gain,
        ctaLink: `${editBase}&step=photos`,
      })
    }
  }

  // Description — target 60+ words (16 pts)
  if (breakdown.description.score < 16) {
    const wc = breakdown.description.wordCount
    const gain = 16 - breakdown.description.score
    if (wc === 0) {
      actions.push({
        dimension: 'description',
        title: 'Write a short description',
        subtitle: 'Even 2–3 sentences help buyers decide faster',
        message: 'Add a description — even 2–3 sentences help buyers decide',
        pointsGain: 5,
        ctaLink: `${editBase}&step=pricing`,
      })
    } else {
      actions.push({
        dimension: 'description',
        title: 'Expand your description to 60+ words',
        subtitle: 'Give buyers a complete picture of your property',
        message: `Expand your description to 60+ words (+${gain} pts)`,
        pointsGain: gain,
        ctaLink: `${editBase}&step=pricing`,
      })
    }
  } else if (breakdown.description.score < breakdown.description.max) {
    const gain = breakdown.description.max - breakdown.description.score
    actions.push({
      dimension: 'description',
      title: 'Expand your description to 100+ words for maximum detail',
      subtitle: 'Give buyers a complete picture',
      message: `Expand your description to 100+ words for maximum detail (+${gain} pts)`,
      pointsGain: gain,
      ctaLink: `${editBase}&step=pricing`,
    })
  }

  // Details — push toward 20+ pts
  if (breakdown.details.score < 20 && breakdown.details.missing.length > 0) {
    const gain = Math.min(
      20 - breakdown.details.score,
      breakdown.details.max - breakdown.details.score,
    )
    const missing = breakdown.details.missing
    if (missing.length === 1) {
      const label = missing[0] ? (FIELD_LABELS[missing[0]] ?? missing[0]) : ''
      actions.push({
        dimension: 'details',
        title: `Add ${label} to complete your listing`,
        subtitle: 'Buyers filter by these details — more info = more matches',
        message: `Add ${label} to complete your listing (+${gain} pts)`,
        pointsGain: gain,
        ctaLink: `${editBase}&step=details`,
      })
    } else {
      const labels = missing
        .slice(0, 2)
        .map((f) => FIELD_LABELS[f] ?? f)
        .join(', ')
      actions.push({
        dimension: 'details',
        title: `Fill in ${labels}${missing.length > 2 ? ` and ${missing.length - 2} more` : ''}`,
        subtitle: 'Buyers filter by these details — more info = more matches',
        message: `Fill in ${labels}${missing.length > 2 ? ` and ${missing.length - 2} more` : ''} (+${gain} pts)`,
        pointsGain: gain,
        ctaLink: `${editBase}&step=details`,
      })
    }
  }

  // Location — street address (+3) if missing
  if (!breakdown.location.hasAddress) {
    actions.push({
      dimension: 'location',
      title: 'Add your street address to help buyers find the property',
      subtitle: 'Improves trust and saves time during site visits',
      message: 'Add your street address to help buyers find the property (+3 pts)',
      pointsGain: 3,
      ctaLink: `${editBase}&step=location`,
    })
  }

  // Price — suggest adjustment when benchmark available and score is low
  if (
    breakdown.price.benchmarkAvailable &&
    breakdown.price.score < 10 &&
    priceSqft &&
    benchmarkSqft
  ) {
    const gain = 15 - breakdown.price.score
    actions.push({
      dimension: 'price',
      title: 'Review your asking price',
      subtitle: `₹${Math.round(priceSqft).toLocaleString('en-IN')}/sqft vs ₹${Math.round(benchmarkSqft).toLocaleString('en-IN')}/sqft median in ${locality ?? 'your area'}`,
      message: `Your price/sqft deviates from similar listings. Adjust or explain the premium in your description (+${gain} pts)`,
      pointsGain: gain,
      ctaLink: `${editBase}&step=pricing`,
    })
  }

  // Trust — verification
  if (breakdown.trust.score === 0) {
    actions.push({
      dimension: 'trust',
      title: 'Verify your phone number to build buyer confidence',
      subtitle: 'Takes less than a minute',
      message: 'Verify your phone number to build buyer confidence (+5 pts)',
      pointsGain: 5,
      ctaLink: `${editBase}&step=review`,
    })
  }

  // Sort by highest point gain first, cap at 4 actions
  actions.sort((a, b) => b.pointsGain - a.pointsGain)
  return actions.slice(0, 4)
}
