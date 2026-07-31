import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { computeQualityScore } from '@/lib/quality-score'
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
    const [{ data: latestFlag }, { data: sellerAuth }] = await Promise.all([
      admin.from('latest_user_flag').select('flag').eq('user_id', user.id).maybeSingle(),
      admin.auth.admin.getUserById(user.id),
    ])
    if (latestFlag?.flag === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Your account is suspended. Contact support.' },
        { status: 403 },
      )
    }

    // Phone gate — seller must have a verified phone number before posting
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      negotiable: validated.negotiable ?? false,
      status: 'PENDING_REVIEW',
    } as any

    // Fetch price benchmark for this locality (best-effort — no failure if missing)
    let priceBenchmark = null
    try {
      const { data: benchmarkRow } = await admin
        .from('locality_price_benchmarks')
        .select('median_price_sqft, stddev_price_sqft, sample_count')
        .eq('city', validated.city)
        .eq('locality', validated.locality)
        .eq('property_type', validated.propertyType)
        .maybeSingle()
      if (benchmarkRow && benchmarkRow.sample_count >= 10) {
        priceBenchmark = {
          medianPriceSqft: Number(benchmarkRow.median_price_sqft),
          stddevPriceSqft: Number(benchmarkRow.stddev_price_sqft),
        }
      }
    } catch {
      // Benchmark lookup failure is non-fatal — score will give full price sanity points
    }

    // Compute quality score (pure TypeScript, <1ms)
    const qualityResult = computeQualityScore({
      propertyType: validated.propertyType,
      imageUrls: validated.imageUrls,
      description: validated.description,
      bhkType: validated.bhkType ?? null,
      builtUpArea: validated.builtUpArea,
      carpetArea: validated.carpetArea ?? null,
      floor: validated.floor ?? null,
      totalFloors: validated.totalFloors ?? null,
      facing: validated.facing ?? null,
      furnishing: validated.furnishing ?? null,
      bathrooms: validated.bathrooms,
      balconies: validated.balconies ?? null,
      parking: validated.parking ?? null,
      ageOfProperty: validated.ageOfProperty ?? null,
      amenities: validated.amenities,
      price: validated.price,
      locality: validated.locality,
      city: validated.city,
      isVerified: false, // new listings are never verified on creation
      priceBenchmark,
    })

    const recordWithScore = {
      ...record,
      quality_score: qualityResult.score,
      quality_breakdown:
        qualityResult.breakdown as unknown as import('@/lib/supabase/database.types').Json,
      quality_scored_at: new Date().toISOString(),
      quality_v2_scored: false,
    }

    let data, error

    if (draftId) {
      // Update any owned listing → PENDING_REVIEW (re-submission for admin approval).
      // Allowed from all editable states: DRAFT, REJECTED, ACTIVE, INACTIVE, PENDING_REVIEW.
      // Using service client because RLS update policy excludes REJECTED/ACTIVE rows.
      // seller_id check is enforced explicitly so service-role bypass is safe.
      ;({ data, error } = await admin
        .from('listings')
        .update(recordWithScore)
        .eq('id', draftId)
        .eq('seller_id', user.id)
        .in('status', ['DRAFT', 'REJECTED', 'ACTIVE', 'INACTIVE', 'PENDING_REVIEW'])
        .select('id, status, created_at')
        .maybeSingle())
    } else {
      // New listing
      ;({ data, error } = await supabase
        .from('listings')
        .insert(recordWithScore)
        .select('id, status, created_at')
        .single())
    }

    if (error) {
      console.error('[listings/create] supabase error:', error.message, error.code)
      return NextResponse.json({ error: 'Failed to save listing' }, { status: 500 })
    }

    if (!data) {
      // draftId was not in DRAFT/REJECTED state — no row was updated
      return NextResponse.json(
        { error: 'Listing not found or cannot be submitted in its current state.' },
        { status: 404 },
      )
    }

    // Insert quality history row (fire-and-forget — non-critical)
    void admin
      .from('listing_quality_history')
      .insert({
        listing_id: data.id,
        score: qualityResult.score,
        breakdown:
          qualityResult.breakdown as unknown as import('@/lib/supabase/database.types').Json,
        reason: 'initial',
      })
      .then(({ error: histErr }) => {
        if (histErr)
          console.error('[listings/create] quality history insert error:', histErr.message)
      })

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
    console.error('[listings/create] unhandled exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
