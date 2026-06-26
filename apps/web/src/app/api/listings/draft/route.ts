import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'

// Partial schema — all fields optional for draft autosave
const draftSchema = z.object({
  id: z.string().uuid().optional(),          // present on update, absent on first save
  propertyType: z.string().optional(),
  bhkType: z.string().optional(),
  builtUpArea: z.number().int().positive().optional(),
  carpetArea: z.number().int().positive().optional(),
  floor: z.number().int().min(0).optional(),
  totalFloors: z.number().int().positive().optional(),
  facing: z.string().optional(),
  furnishing: z.string().optional(),
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
  imageUrls: z.array(z.string()).optional(),
  price: z.number().int().positive().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  currentStep: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body: unknown = await request.json()
    const input = draftSchema.parse(body)

    const record = {
      seller_id: user.id,
      property_type: input.propertyType ?? null,
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
      // Create new draft
      const { data, error } = await supabase
        .from('listings')
        .insert(record)
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
      return NextResponse.json({ error: 'Validation failed', issues: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
