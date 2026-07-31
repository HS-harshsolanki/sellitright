import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { computeQualityScore } from '@/lib/quality-score'
import { FacingEnum, ParkingEnum } from '@/lib/validators'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .eq('seller_id', user.id)
      .in('status', ['DRAFT', 'REJECTED', 'PENDING_REVIEW'])
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const PROPERTY_TYPES = ['APARTMENT', 'PENTHOUSE'] as const
const BHK_TYPES = ['ONE_BHK', 'TWO_BHK', 'THREE_BHK', 'FOUR_BHK', 'FIVE_PLUS_BHK'] as const
const FURNISHING_TYPES = ['UNFURNISHED', 'SEMI_FURNISHED', 'FURNISHED'] as const

// Partial schema — all fields optional for draft autosave
const draftSchema = z.object({
  id: z.string().uuid().optional(), // present on update, absent on first save
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  bhkType: z.enum(BHK_TYPES).optional(),
  builtUpArea: z.number().int().positive().optional(),
  carpetArea: z.number().int().positive().optional(),
  floor: z.number().int().min(0).optional(),
  totalFloors: z.number().int().positive().optional(),
  facing: FacingEnum.optional(),
  furnishing: z.enum(FURNISHING_TYPES).optional(),
  ageOfProperty: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(1).optional(),
  balconies: z.number().int().min(0).optional(),
  parking: ParkingEnum.optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  locality: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  imageUrls: z
    .array(
      z
        .string()
        .url()
        .refine((u) => u.startsWith('https://'), { message: 'Image URL must use HTTPS' }),
    )
    .optional(),
  price: z.number().int().positive().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  currentStep: z.string().optional(),
  negotiable: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // Check suspension
    const adminClient = createServiceClient()
    if (adminClient) {
      const { data: suspensionFlag } = await adminClient
        .from('user_flags')
        .select('flag')
        .eq('user_id', user.id)
        .eq('flag', 'SUSPENDED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (suspensionFlag) {
        return NextResponse.json(
          { error: 'Your account is suspended. Contact support.' },
          { status: 403 },
        )
      }
    }

    const body: unknown = await request.json()
    const input = draftSchema.parse(body)

    const record = {
      seller_id: user.id,
      property_type: input.propertyType ?? undefined,
      bhk_type: input.bhkType ?? null,
      built_up_area: input.builtUpArea ?? null,
      carpet_area: input.carpetArea ?? null,
      floor: input.floor ?? null,
      total_floors: input.totalFloors ?? null,
      facing: input.facing ?? null,
      furnishing: input.furnishing ?? null,
      age_of_property: input.ageOfProperty ?? null,
      bathrooms: input.bathrooms ?? 2,
      balconies: input.balconies ?? 0,
      parking: input.parking ?? null,
      address: input.address ?? null,
      city: input.city ?? '',
      locality: input.locality ?? '',
      state: input.state ?? null,
      pincode: input.pincode ?? null,
      amenities: input.amenities ?? [],
      image_urls: input.imageUrls ?? [],
      price: input.price ?? 0,
      title: input.title ?? '',
      description: input.description ?? '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      negotiable: input.negotiable ?? false,
      status: 'DRAFT',
    } as any

    // Compute quality score for the current draft state (no history insert for drafts)
    const qualityResult = computeQualityScore({
      propertyType: record.property_type ?? 'APARTMENT',
      imageUrls: record.image_urls,
      description: record.description,
      bhkType: record.bhk_type,
      builtUpArea: record.built_up_area,
      carpetArea: record.carpet_area,
      floor: record.floor,
      totalFloors: record.total_floors,
      facing: record.facing,
      furnishing: record.furnishing,
      bathrooms: record.bathrooms,
      balconies: record.balconies,
      parking: record.parking,
      ageOfProperty: record.age_of_property,
      amenities: record.amenities,
      price: record.price,
      locality: record.locality,
      city: record.city,
      isVerified: false,
      priceBenchmark: null, // Drafts skip benchmark lookup to keep autosave fast
    })

    const recordWithScore = {
      ...record,
      quality_score: qualityResult.score,
      quality_breakdown:
        qualityResult.breakdown as unknown as import('@/lib/supabase/database.types').Json,
      quality_scored_at: new Date().toISOString(),
    }

    if (input.id) {
      // Update existing listing (draft or edit) — verify ownership.
      // Exclude `status` from the update so we never downgrade ACTIVE → DRAFT on autosave.
      // Use service client so RLS doesn't block updates to non-DRAFT rows.
      const updateClient = createServiceClient() ?? supabase
      const { status: _status, ...recordWithoutStatus } = recordWithScore
      const { data, error } = await updateClient
        .from('listings')
        .update(recordWithoutStatus)
        .eq('id', input.id)
        .eq('seller_id', user.id)
        .in('status', ['DRAFT', 'REJECTED', 'ACTIVE', 'INACTIVE', 'PENDING_REVIEW'])
        .select('id, status, updated_at')
        .single()

      if (error) {
        console.error('[draft] update error:', error.message, error.code)
        if (error.code === 'PGRST116') {
          return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
        }
        return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      // Create new draft — property_type required by DB; default to APARTMENT for partial drafts
      const insertRecord = {
        ...recordWithScore,
        property_type: recordWithScore.property_type ?? 'APARTMENT',
      }
      const { data, error } = await supabase
        .from('listings')
        .insert(insertRecord)
        .select('id, status, created_at')
        .single()

      if (error) {
        console.error('[draft] insert error:', error.message, error.code)
        return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
      }

      return NextResponse.json(data, { status: 201 })
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', issues: error.errors },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
