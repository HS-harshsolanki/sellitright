import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { listingCreateSchema } from '@/lib/validators'

// Accept all listingCreateSchema fields + optional draftId for upsert
const bodySchema = listingCreateSchema.extend({
  draftId: z.string().uuid().optional(),
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

    // Block suspended users from posting listings
    const admin = createServiceClient()
    if (!admin) {
      return NextResponse.json({ error: 'Service not available.' }, { status: 503 })
    }
    const { data: latestFlag } = await admin
      .from('latest_user_flag')
      .select('flag')
      .eq('user_id', user.id)
      .maybeSingle()
    if (latestFlag?.flag === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Your account is suspended. Contact support.' },
        { status: 403 },
      )
    }

    // Phone gate — seller must have a verified phone number before posting
    const { data: sellerAuth } = await admin.auth.admin.getUserById(user.id)
    const phoneVerified = sellerAuth.user?.user_metadata?.phone_verified === true
    const rawPhone = sellerAuth.user?.user_metadata?.phone ?? sellerAuth.user?.phone ?? null
    const normalizePhone = (raw: string) => {
      const digits = raw.replace(/\D/g, '')
      if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
      if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
      return digits
    }
    const sellerPhone = rawPhone ? normalizePhone(rawPhone) : null

    if (!sellerPhone || !/^[6-9]\d{9}$/.test(sellerPhone)) {
      return NextResponse.json(
        {
          error: 'Verify your phone number in your profile before posting a property.',
          action: 'profile',
        },
        { status: 422 },
      )
    }

    if (!phoneVerified) {
      return NextResponse.json(
        {
          error:
            'Your phone number is not yet verified. Complete phone verification in your profile.',
          action: 'profile',
        },
        { status: 422 },
      )
    }

    const raw: unknown = await request.json()
    const { draftId, ...validated } = bodySchema.parse(raw)

    const record = {
      seller_id: user.id,
      title: validated.title,
      description: validated.description,
      price: validated.price,
      property_type: validated.propertyType,
      bhk_type: validated.bhkType,
      built_up_area: validated.builtUpArea,
      carpet_area: validated.carpetArea ?? null,
      floor: validated.floor ?? null,
      total_floors: validated.totalFloors ?? null,
      facing: validated.facing ?? null,
      furnishing: validated.furnishing,
      age_of_property: validated.ageOfProperty ?? null,
      bathrooms: validated.bathrooms,
      balconies: validated.balconies ?? 0,
      parking: validated.parking ?? null,
      address: validated.address,
      city: validated.city,
      locality: validated.locality,
      state: validated.state,
      pincode: validated.pincode,
      latitude: validated.latitude ?? null,
      longitude: validated.longitude ?? null,
      amenities: validated.amenities,
      image_urls: validated.imageUrls,
      status: 'PENDING_REVIEW',
    }

    let data, error

    if (draftId) {
      // Promote existing draft → PENDING_REVIEW
      ;({ data, error } = await supabase
        .from('listings')
        .update(record)
        .eq('id', draftId)
        .eq('seller_id', user.id)
        .select('id, status, created_at')
        .single())
    } else {
      // New listing
      ;({ data, error } = await supabase
        .from('listings')
        .insert(record)
        .select('id, status, created_at')
        .single())
    }

    if (error) {
      console.error('[listings/create] supabase error:', error.message, error.code)
      return NextResponse.json({ error: 'Failed to save listing' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: error.errors.map((i) => ({ field: i.path.join('.'), message: i.message })),
        },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
