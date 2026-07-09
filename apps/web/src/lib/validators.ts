import { z } from 'zod'

// ---------------------------------------------------------------------------
// Enums — mirror Prisma schema so we get runtime validation without importing
// the Prisma client on the edge / in shared code.
// ---------------------------------------------------------------------------

export const PropertyTypeEnum = z.enum([
  'APARTMENT',
  'VILLA',
  'PLOT',
  'INDEPENDENT_HOUSE',
  'PENTHOUSE',
])

export const BHKTypeEnum = z.enum(['ONE_BHK', 'TWO_BHK', 'THREE_BHK', 'FOUR_BHK', 'FIVE_PLUS_BHK'])

export const FacingEnum = z.enum([
  'NORTH',
  'SOUTH',
  'EAST',
  'WEST',
  'NORTH_EAST',
  'NORTH_WEST',
  'SOUTH_EAST',
  'SOUTH_WEST',
])

export const FurnishingEnum = z.enum(['FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED'])

export const ParkingEnum = z.enum(['COVERED', 'OPEN', 'BOTH', 'NONE'])

export const ListingStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'SOLD', 'INACTIVE', 'PENDING_REVIEW'])

// ---------------------------------------------------------------------------
// Listing create schema
// ---------------------------------------------------------------------------

export const listingCreateSchema = z.object({
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(120, 'Title must be under 120 characters'),
  description: z
    .string()
    .min(30, 'Description must be at least 30 characters')
    .max(2000, 'Description must be under 2000 characters'),
  // Price stored in paise — pass as number from the frontend, we coerce to bigint in the API
  price: z
    .number({ required_error: 'Price is required' })
    .int('Price must be a whole number')
    .positive('Price must be positive'),
  propertyType: PropertyTypeEnum,
  bhkType: BHKTypeEnum.optional(),
  negotiable: z.boolean().optional(),
  builtUpArea: z.number().int().positive('Built-up area must be positive'),
  carpetArea: z.number().int().positive().optional(),
  floor: z.number().int().min(0).optional(),
  totalFloors: z.number().int().positive().optional(),
  facing: FacingEnum.optional(),
  furnishing: FurnishingEnum.optional(),
  ageOfProperty: z.number().int().min(0).max(100).optional(),
  bathrooms: z.number().int().min(1).max(10),
  balconies: z.number().int().min(0).max(10).optional(),
  parking: ParkingEnum.optional(),
  address: z.string().min(5).max(300),
  city: z.string().min(2).max(100),
  locality: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  amenities: z.array(z.string()).default([]),
  imageUrls: z
    .array(z.string().url('Each image must be a valid URL').startsWith('https://'))
    .max(20)
    .default([]),
})

export type ListingCreateInput = z.infer<typeof listingCreateSchema>

// ---------------------------------------------------------------------------
// Listing filter / search schema (query params — all optional)
// ---------------------------------------------------------------------------

const sortValues = ['price_asc', 'price_desc', 'newest', 'oldest'] as const

export const listingFilterSchema = z.object({
  city: z.string().optional(),
  locality: z.string().optional(),
  bhkType: BHKTypeEnum.optional(),
  propertyType: PropertyTypeEnum.optional(),
  furnishing: FurnishingEnum.optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  sort: z.enum(sortValues).default('newest'),
})

export type ListingFilterInput = z.infer<typeof listingFilterSchema>

// ---------------------------------------------------------------------------
// Buyer Interest (Handshake Model)
// ---------------------------------------------------------------------------

export const InterestPurposeEnum = z.enum(['SELF', 'INVESTMENT'])
export const InterestTimelineEnum = z.enum([
  'IMMEDIATELY',
  'WITHIN_30_DAYS',
  'ONE_TO_THREE_MONTHS',
  'EXPLORING',
])
export const InterestFundingEnum = z.enum(['CASH_READY', 'LOAN_APPROVED', 'LOAN_IN_PROGRESS'])
export const InterestStatusEnum = z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN'])

export const buyerInterestSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be under 100 characters')
    .trim(),
  purpose: InterestPurposeEnum,
  timeline: InterestTimelineEnum,
  funding: InterestFundingEnum,
  message: z
    .string()
    .max(250, 'Message must be under 250 characters')
    .trim()
    .optional()
    .or(z.literal('')),
})

export type BuyerInterestInput = z.infer<typeof buyerInterestSchema>
export type InterestPurpose = z.infer<typeof InterestPurposeEnum>
export type InterestTimeline = z.infer<typeof InterestTimelineEnum>
export type InterestFunding = z.infer<typeof InterestFundingEnum>
export type InterestStatus = z.infer<typeof InterestStatusEnum>

export interface BuyerInterestRecord {
  id: string
  listingId: string
  buyerId: string
  sellerId: string
  fullName: string
  purpose: InterestPurpose
  timeline: InterestTimeline
  funding: InterestFunding
  message: string | null
  status: InterestStatus
  createdAt: string
}

// ---------------------------------------------------------------------------
// Auth / login schema
// ---------------------------------------------------------------------------

export const loginSchema = z.union([
  z.object({
    type: z.literal('phone'),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
    otp: z.string().length(6, 'OTP must be 6 digits').optional(),
  }),
  z.object({
    type: z.literal('email'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
])

export type LoginInput = z.infer<typeof loginSchema>

// ---------------------------------------------------------------------------
// Trust & Safety
// ---------------------------------------------------------------------------

// Buyer reporting a listing
export const buyerListingReportReasonEnum = z.enum([
  'ALREADY_SOLD',
  'WRONG_INFORMATION',
  'SPAM_LISTING',
  'OTHER',
])

// Seller reporting a buyer
export const sellerBuyerReportReasonEnum = z.enum([
  'SPAM_REQUESTS',
  'ABUSIVE_BEHAVIOR',
  'BROKER_SUSPECTED',
  'FAKE_DETAILS',
  'OTHER',
])

export const buyerReportListingSchema = z.object({
  reason: buyerListingReportReasonEnum,
  details: z.string().max(500).trim().optional(),
})

export const sellerReportBuyerSchema = z.object({
  targetUserId: z.string().uuid('Invalid user ID'),
  reason: sellerBuyerReportReasonEnum,
  details: z.string().max(500).trim().optional(),
})

export const blockUserSchema = z.object({
  reason: z.string().max(200).trim().optional(),
})

export const adminFlagUserSchema = z.object({
  flag: z.enum(['SPAM', 'BROKER_SUSPECTED', 'NEEDS_REVIEW', 'SUSPENDED', 'CLEARED']),
  reason: z.string().max(500).trim().optional(),
})

export type BuyerReportListingInput = z.infer<typeof buyerReportListingSchema>
export type SellerReportBuyerInput = z.infer<typeof sellerReportBuyerSchema>
export type BlockUserInput = z.infer<typeof blockUserSchema>
export type AdminFlagUserInput = z.infer<typeof adminFlagUserSchema>
