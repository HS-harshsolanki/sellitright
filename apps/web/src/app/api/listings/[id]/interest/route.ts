import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { createNotification } from '@/lib/notifications'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { interestPreflight, logActivity } from '@/lib/trust'
import { buyerInterestSchema } from '@/lib/validators'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/listings/:id/interest
// Creates a buyer interest request for a listing.
// Enforces: authenticated, listing is ACTIVE, buyer != seller, one PENDING per (listing, buyer).
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id: listingId } = await params

  // ── Auth ──────────────────────────────────────────────────────────────────
  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    return NextResponse.json({ error: 'Sign in to request contact.' }, { status: 401 })
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to request contact.' }, { status: 401 })
  }

  // ── Validate body ─────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  let validated: ReturnType<typeof buyerInterestSchema.parse>
  try {
    validated = buyerInterestSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', issues: err.errors }, { status: 400 })
    }
    throw err
  }

  // ── Fetch listing — must be ACTIVE ────────────────────────────────────────
  const { data: listing, error: listingErr } = await supabase
    .from('listings')
    .select('id, seller_id, status')
    .eq('id', listingId)
    .eq('status', 'ACTIVE')
    .single()

  if (listingErr || !listing) {
    return NextResponse.json({ error: 'Listing not found or not available.' }, { status: 404 })
  }

  // ── Prevent self-request ──────────────────────────────────────────────────
  if (listing.seller_id === user.id) {
    return NextResponse.json(
      { error: 'You cannot request contact on your own listing.' },
      { status: 422 },
    )
  }

  // ── Trust & Safety pre-flight ─────────────────────────────────────────────
  // Checks: block (either direction), spam detection, rate limits.
  const adminForTrust = createServiceClient()
  if (!adminForTrust) {
    return NextResponse.json(
      { error: 'Service temporarily unavailable. Please try again later.' },
      { status: 503 },
    )
  }
  const preflight = await interestPreflight(
    supabase,
    adminForTrust,
    user.id,
    listing.seller_id,
    listingId,
    validated.message,
  )
  if (!preflight.allowed) {
    return NextResponse.json({ error: preflight.reason }, { status: preflight.statusCode })
  }

  // ── Check for existing PENDING request ───────────────────────────────────
  // The unique partial index handles this at the DB level too, but we return a
  // clean error before hitting it so the client can show the right UI state.
  const { data: existing } = await supabase
    .from('buyer_interest')
    .select('id, status')
    .eq('listing_id', listingId)
    .eq('buyer_id', user.id)
    .eq('status', 'PENDING')
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'You already have a pending request for this property.', existingId: existing.id },
      { status: 409 },
    )
  }

  // ── Insert ────────────────────────────────────────────────────────────────
  const { data: interest, error: insertErr } = await supabase
    .from('buyer_interest')
    .insert({
      listing_id: listingId,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      full_name: validated.fullName,
      purpose: validated.purpose,
      timeline: validated.timeline,
      funding: validated.funding,
      message: validated.message || null,
      status: 'PENDING',
    })
    .select('id, status, created_at')
    .single()

  if (insertErr || !interest) {
    // Unique-index violation means a concurrent duplicate request snuck through
    if (insertErr?.code === '23505') {
      return NextResponse.json(
        { error: 'You already have a pending request for this property.' },
        { status: 409 },
      )
    }
    console.error('[interest] insert error:', insertErr?.message)
    return NextResponse.json(
      { error: 'Failed to submit request. Please try again.' },
      { status: 500 },
    )
  }

  // Notify seller + log activity — fire-and-forget, never block the response
  const admin = createServiceClient()
  if (admin) {
    try {
      await createNotification({
        admin,
        userId: listing.seller_id,
        title: 'New interest request',
        message: `${validated.fullName} is interested in your property.`,
        type: 'InterestRequest',
        entityType: 'interest',
        entityId: interest.id,
      })
    } catch (err) {
      console.error('[interest] notification fire failed:', err)
    }

    // Log the activity so rate-limit counters and risk scoring work
    try {
      await logActivity(admin, {
        userId: user.id,
        action: 'interest_request',
        entityType: 'listing',
        entityId: listingId,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
        metadata: { message: validated.message ?? '' },
      })
    } catch (err) {
      console.error('[interest] logActivity failed:', err)
    }
  }

  return NextResponse.json(
    { id: interest.id, status: interest.status, createdAt: interest.created_at },
    { status: 201 },
  )
}

// DELETE /api/listings/:id/interest
// Withdraws the authenticated buyer's pending interest request for this listing.
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id: listingId } = await params

  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    return NextResponse.json({ error: 'Sign in to withdraw your request.' }, { status: 401 })
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to withdraw your request.' }, { status: 401 })
  }

  const { error } = await supabase
    .from('buyer_interest')
    .update({ status: 'WITHDRAWN' })
    .eq('listing_id', listingId)
    .eq('buyer_id', user.id)
    .eq('status', 'PENDING')

  if (error) {
    console.error('[interest] withdraw error:', error.message)
    return NextResponse.json({ error: 'Failed to withdraw request.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// GET /api/listings/:id/interest
// Returns whether the authenticated buyer has a pending request for this listing.
// Used to hydrate the "already requested" state on page load.
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id: listingId } = await params

  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    return NextResponse.json({ hasPending: false })
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ hasPending: false })
  }

  type InterestRow = {
    id: string
    status: string
    contact_unlocked: boolean | null
    seller_phone: string | null
    seller_email: string | null
  }

  const { data } = (await supabase
    .from('buyer_interest')
    .select('id, status, contact_unlocked, seller_phone, seller_email')
    .eq('listing_id', listingId)
    .eq('buyer_id', user.id)
    .in('status', ['PENDING', 'ACCEPTED'])
    .maybeSingle()) as { data: InterestRow | null; error: unknown }

  const unlocked = data?.contact_unlocked === true

  return NextResponse.json({
    hasPending: data?.status === 'PENDING',
    hasAccepted: data?.status === 'ACCEPTED',
    interestId: data?.id ?? null,
    contactUnlocked: unlocked,
    sellerPhone: unlocked ? (data?.seller_phone ?? null) : null,
    sellerEmail: unlocked ? (data?.seller_email ?? null) : null,
  })
}
