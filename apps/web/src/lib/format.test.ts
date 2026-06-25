import { describe, it, expect } from 'vitest'
import {
  formatPrice,
  formatArea,
  formatBHK,
  formatFacing,
  formatFurnishing,
  formatFloor,
  formatAge,
  maskPhone,
} from './format'

describe('formatPrice', () => {
  it('should format crores with no decimal when whole', () => {
    expect(formatPrice(10_00_00_000)).toBe('₹10 Cr')
  })

  it('should format crores with 2 decimal places when fractional', () => {
    expect(formatPrice(1_25_00_000)).toBe('₹1.25 Cr')
  })

  it('should format lakhs with no decimal when whole', () => {
    expect(formatPrice(75_00_000)).toBe('₹75 L')
  })

  it('should format lakhs with 1 decimal place when fractional', () => {
    expect(formatPrice(52_50_000)).toBe('₹52.5 L')
  })

  it('should convert paise to rupees when paise option is true', () => {
    expect(formatPrice(1_00_00_000 * 100, { paise: true })).toBe('₹1 Cr')
  })

  it('should handle bigint values', () => {
    expect(formatPrice(BigInt(5_00_00_000))).toBe('₹5 Cr')
  })

  it('should handle string values', () => {
    expect(formatPrice('7500000')).toBe('₹75 L')
  })
})

describe('formatArea', () => {
  it('should format with sq ft suffix', () => {
    expect(formatArea(1200)).toBe('1,200 sq ft')
  })

  it('should use Indian locale for thousands separator', () => {
    expect(formatArea(1000)).toBe('1,000 sq ft')
  })
})

describe('formatBHK', () => {
  it('should convert ONE_BHK to 1 BHK', () => {
    expect(formatBHK('ONE_BHK')).toBe('1 BHK')
  })

  it('should convert TWO_BHK to 2 BHK', () => {
    expect(formatBHK('TWO_BHK')).toBe('2 BHK')
  })

  it('should convert FIVE_PLUS_BHK to 5+ BHK', () => {
    expect(formatBHK('FIVE_PLUS_BHK')).toBe('5+ BHK')
  })

  it('should return the raw value when unknown', () => {
    expect(formatBHK('UNKNOWN')).toBe('UNKNOWN')
  })
})

describe('formatFacing', () => {
  it('should convert NORTH to North', () => {
    expect(formatFacing('NORTH')).toBe('North')
  })

  it('should convert NORTH_EAST to North East', () => {
    expect(formatFacing('NORTH_EAST')).toBe('North East')
  })
})

describe('formatFurnishing', () => {
  it('should map SEMI_FURNISHED correctly', () => {
    expect(formatFurnishing('SEMI_FURNISHED')).toBe('Semi Furnished')
  })

  it('should return raw value when unknown', () => {
    expect(formatFurnishing('OTHER')).toBe('OTHER')
  })
})

describe('formatFloor', () => {
  it('should return Ground when floor is null', () => {
    expect(formatFloor(null, null)).toBe('Ground')
  })

  it('should return floor of total when both provided', () => {
    expect(formatFloor(7, 14)).toBe('7 of 14')
  })

  it('should return floor number when total is null', () => {
    expect(formatFloor(3, null)).toBe('3')
  })
})

describe('formatAge', () => {
  it('should return N/A when null', () => {
    expect(formatAge(null)).toBe('N/A')
  })

  it('should return New when 0 years', () => {
    expect(formatAge(0)).toBe('New')
  })

  it('should return 1 year singular', () => {
    expect(formatAge(1)).toBe('1 year')
  })

  it('should return plural for > 1 year', () => {
    expect(formatAge(5)).toBe('5 years')
  })
})

describe('maskPhone', () => {
  it('should mask the last 5 digits of a +91 number', () => {
    expect(maskPhone('+919876543210')).toBe('+91 98765 XXXXX')
  })
})
