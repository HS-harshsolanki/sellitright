import { describe, it, expect } from 'vitest'
import { listingCreateSchema, loginSchema, listingFilterSchema } from './validators'

const VALID_LISTING = {
  title: 'Spacious 2 BHK in Bandra West with sea view',
  description: 'A beautiful and well-maintained flat in the heart of Bandra with all modern amenities.',
  price: 15000000,
  propertyType: 'APARTMENT' as const,
  bhkType: 'TWO_BHK' as const,
  builtUpArea: 900,
  furnishing: 'SEMI_FURNISHED' as const,
  bathrooms: 2,
  address: 'Plot 12, Hill Road, Bandra West',
  city: 'Mumbai',
  locality: 'Bandra West',
  state: 'Maharashtra',
  pincode: '400050',
}

describe('listingCreateSchema', () => {
  it('should accept a valid listing', () => {
    const result = listingCreateSchema.safeParse(VALID_LISTING)
    expect(result.success).toBe(true)
  })

  it('should reject title shorter than 10 characters', () => {
    const result = listingCreateSchema.safeParse({ ...VALID_LISTING, title: 'Short' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain('10 characters')
  })

  it('should reject an invalid pincode', () => {
    const result = listingCreateSchema.safeParse({ ...VALID_LISTING, pincode: '12345' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain('6 digits')
  })

  it('should default imageUrls to empty array when not provided', () => {
    const result = listingCreateSchema.safeParse(VALID_LISTING)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.imageUrls).toEqual([])
  })

  it('should reject negative price', () => {
    const result = listingCreateSchema.safeParse({ ...VALID_LISTING, price: -1 })
    expect(result.success).toBe(false)
  })

  it('should accept optional facing field', () => {
    const result = listingCreateSchema.safeParse({ ...VALID_LISTING, facing: 'NORTH' })
    expect(result.success).toBe(true)
  })

  it('should reject invalid facing value', () => {
    const result = listingCreateSchema.safeParse({ ...VALID_LISTING, facing: 'DIAGONAL' })
    expect(result.success).toBe(false)
  })

  it('should reject image URLs that are not valid URLs', () => {
    const result = listingCreateSchema.safeParse({
      ...VALID_LISTING,
      imageUrls: ['not-a-url'],
    })
    expect(result.success).toBe(false)
  })
})

describe('loginSchema — phone type', () => {
  it('should accept a valid 10-digit Indian number', () => {
    const result = loginSchema.safeParse({ type: 'phone', phone: '9876543210' })
    expect(result.success).toBe(true)
  })

  it('should reject a number starting with 5 (not a valid Indian mobile)', () => {
    const result = loginSchema.safeParse({ type: 'phone', phone: '5876543210' })
    expect(result.success).toBe(false)
  })

  it('should reject a number with fewer than 10 digits', () => {
    const result = loginSchema.safeParse({ type: 'phone', phone: '987654' })
    expect(result.success).toBe(false)
  })
})

describe('listingFilterSchema', () => {
  it('should default page to 1 when not provided', () => {
    const result = listingFilterSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.page).toBe(1)
  })

  it('should default sort to newest when not provided', () => {
    const result = listingFilterSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.sort).toBe('newest')
  })

  it('should coerce string page to number', () => {
    const result = listingFilterSchema.safeParse({ page: '2' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.page).toBe(2)
  })

  it('should reject limit above 50', () => {
    const result = listingFilterSchema.safeParse({ limit: 100 })
    expect(result.success).toBe(false)
  })
})
