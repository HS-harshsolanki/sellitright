/**
 * Formats a price to a human-readable Indian format.
 *
 * - Pass a `number` for rupees (used with mock data): formatPrice(12500000)
 * - Pass a `bigint` or numeric `string` for paise (used with DB values):
 *   formatPrice(BigInt('1250000000'), { paise: true })
 *
 * Output examples: "₹45 L", "₹1.2 Cr"
 */
export function formatPrice(value: number | bigint | string, opts?: { paise?: boolean }): string {
  let rupees: number
  if (typeof value === 'bigint') {
    rupees = opts?.paise ? Number(value) / 100 : Number(value)
  } else if (typeof value === 'string') {
    rupees = opts?.paise ? Number(BigInt(value)) / 100 : parseFloat(value)
  } else {
    rupees = opts?.paise ? value / 100 : value
  }

  const lakh = 1_00_000
  const crore = 1_00_00_000

  if (rupees >= crore) {
    const cr = rupees / crore
    const formatted = cr % 1 === 0 ? cr.toFixed(0) : parseFloat(cr.toFixed(2)).toString()
    return `₹${formatted} Cr`
  }

  const l = rupees / lakh
  const formatted = l % 1 === 0 ? l.toFixed(0) : parseFloat(l.toFixed(1)).toString()
  return `₹${formatted} L`
}

/**
 * Formats a square-footage number with thousands separator.
 * e.g. 1200 → "1,200 sq ft"
 */
export function formatArea(sqft: number): string {
  return `${sqft.toLocaleString('en-IN')} sq ft`
}

/**
 * Converts a BHKType enum value to a display string.
 * e.g. "TWO_BHK" → "2 BHK", "FIVE_PLUS_BHK" → "5+ BHK"
 */
export function formatBHK(bhkType: string): string {
  const map: Record<string, string> = {
    ONE_BHK: '1 BHK',
    TWO_BHK: '2 BHK',
    THREE_BHK: '3 BHK',
    FOUR_BHK: '4 BHK',
    FIVE_PLUS_BHK: '5+ BHK',
  }
  return map[bhkType] ?? bhkType
}

/**
 * Formats a Facing enum to a title-case display string.
 * e.g. "NORTH_EAST" → "North East"
 */
export function formatFacing(facing: string): string {
  return facing
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Formats a Furnishing enum to a display string.
 * e.g. "SEMI_FURNISHED" → "Semi Furnished"
 */
export function formatFurnishing(furnishing: string): string {
  const map: Record<string, string> = {
    FURNISHED: 'Furnished',
    SEMI_FURNISHED: 'Semi Furnished',
    UNFURNISHED: 'Unfurnished',
  }
  return map[furnishing] ?? furnishing
}

/**
 * Formats a Parking enum to a display string.
 */
export function formatParking(parking: string): string {
  const map: Record<string, string> = {
    COVERED: 'Covered',
    OPEN: 'Open',
    BOTH: 'Covered + Open',
    NONE: 'None',
  }
  return map[parking] ?? parking
}

/**
 * Formats floor information.
 * e.g. floor=7, totalFloors=14 → "7 of 14"
 */
export function formatFloor(floor: number | null, total: number | null): string {
  if (floor === null) return 'Ground'
  if (total !== null) return `${floor} of ${total}`
  return String(floor)
}

/**
 * Formats property age in years.
 * e.g. 3 → "3 years", 0 → "New"
 */
export function formatAge(years: number | null): string {
  if (years === null) return 'N/A'
  if (years === 0) return 'New'
  if (years === 1) return '1 year'
  return `${years} years`
}

/**
 * Masks a phone number for privacy.
 * e.g. "+919876543210" → "+91 98765 XXXXX"
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.slice(2)
    return `+91 ${local.slice(0, 5)} XXXXX`
  }
  return `${phone.slice(0, phone.length - 5)}XXXXX`
}
