import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'

import { createClient } from '@/lib/supabase/server'

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
      .eq('status', 'DRAFT')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const PROPERTY_TYPES = ['APARTMENT', 'VILLA', 'PLOT', 'INDEPENDENT_HOUSE', 'PENTHOUSE'] as const
const BHK_TYPES = [
  'ONE_BHK',
  'TWO_BHK',
  'THREE_BHK',
  'FOUR_BHK',
  'FIVE_PLUS_BHK',
  'STUDIO',
] as const
const FURNISHING_TYPES = ['UNFURNISHED', 'SEMI_FURNISHED', 'FULLY_FURNISHED'] as const

// Partial schema — all fields optional for draft autosave
const draftSchema = z.object({
  id: z.string().uuid().optional(), // present on update, absent on first save
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  bhkType: z.enum(BHK_TYPES).optional(),
  builtUpArea: z.number().int().positive().optional(),
  carpetArea: z.number().int().positive().optional(),
  floor: z.number().int().min(0).optional(),
  totalFloors: z.number().int().positive().optional(),
  facing: z.string().optional(),
  furnishing: z.enum(FURNISHING_TYPES).optional(),
  ageOfProperty: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(1).optional(),
  balconies: z.number().int().min(0).optional(),
  parking: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  locality: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  imageUrls: z.array(z.string().url()).optional(),
  price: z.number().int().positive().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  currentStep: z.string().optional(),
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
      status: 'DRAFT',
    }

    if (input.id) {
      // Update existing draft — verify ownership
      const { data, error } = await supabase
        .from('listings')
        .update(record)
        .eq('id', input.id)
        .eq('seller_id', user.id)
        .eq('status', 'DRAFT')
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
        ...record,
        property_type: record.property_type ?? 'APARTMENT',
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
