import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkReportRateLimit, logActivity } from '@/lib/trust'
import { buyerReportListingSchema, sellerReportBuyerSchema } from '@/lib/validators'

// POST /api/reports
//
// Two modes based on reporter_role:
//   "buyer"  — reports a listing  → body: { reporter_role, listing_id, reason, details? }
//   "seller" — reports a buyer    → body: { reporter_role, target_user_id, reason, details? }
//
// Idempotent by unique constraint: same reporter + same target → 409.
export async function POST(request: NextRequest) {
  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    return NextResponse.json({ error: 'Sign in to submit a report.' }, { status: 401 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to submit a report.' }, { status: 401 })
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const body = rawBody as Record<string, unknown>
  const role = body?.reporter_role

  if (role !== 'buyer' && role !== 'seller') {
    return NextResponse.json(
      { error: 'reporter_role must be "buyer" or "seller".' },
      { status: 400 },
    )
  }

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  const { allowed, reason } = await checkReportRateLimit(admin, user.id)
  if (!allowed) {
    return NextResponse.json({ error: reason ?? 'Report limit reached.' }, { status: 429 })
  }

  // ── Buyer reports a listing ───────────────────────────────────────────────
  if (role === 'buyer') {
    const listingId = body?.listing_id as string | undefined

    if (!listingId) {
      return NextResponse.json({ error: 'listing_id is required.' }, { status: 400 })
    }

    let validated: ReturnType<typeof buyerReportListingSchema.parse>
    try {
      validated = buyerReportListingSchema.parse(body)
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', issues: err.errors },
          { status: 400 },
        )
      }
      throw err
    }

    // Verify listing exists and is ACTIVE
    const { data: listing } = await admin
      .from('listings')
      .select('id, seller_id, status')
      .eq('id', listingId)
      .maybeSingle()

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })
    }

    if (listing.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Listing is not available for reporting.' },
        { status: 422 },
      )
    }

    // Cannot report your own listing
    if (listing.seller_id === user.id) {
      return NextResponse.json({ error: 'You cannot report your own listing.' }, { status: 422 })
    }

    const { data: report, error: insertErr } = await admin
      .from('reports')
      .insert({
        reporter_id: user.id,
        reporter_role: 'buyer',
        target_listing_id: listingId,
        target_user_id: listing.seller_id,
        reason: validated.reason,
        details: validated.details ?? null,
      })
      .select('id, reason, status, created_at')
      .single()

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json(
          { error: 'You have already reported this listing.' },
          { status: 409 },
        )
      }
      console.error('[reports] buyer insert error:', insertErr.message)
      return NextResponse.json({ error: 'Failed to submit report.' }, { status: 500 })
    }

    await logActivity(admin, {
      userId: user.id,
      action: 'report',
      entityType: 'listing',
      entityId: listingId,
      metadata: { reason: validated.reason },
    })

    // Recompute seller's risk score since they received a new report (fire-and-forget)
    void import('@/lib/trust').then(({ computeAndStoreRiskScore }) =>
      computeAndStoreRiskScore(admin, listing.seller_id),
    )

    return NextResponse.json(report, { status: 201 })
  }

  // ── Seller reports a buyer ────────────────────────────────────────────────
  let validated: ReturnType<typeof sellerReportBuyerSchema.parse>
  try {
    validated = sellerReportBuyerSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', issues: err.errors }, { status: 400 })
    }
    throw err
  }

  if (validated.targetUserId === user.id) {
    return NextResponse.json({ error: 'You cannot report yourself.' }, { status: 422 })
  }

  // Verify the target user exists (has interacted with this seller as a buyer)
  const { data: targetUser } = await admin
    .from('buyer_interest')
    .select('id')
    .eq('buyer_id', validated.targetUserId)
    .eq('seller_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  }

  const { data: report, error: insertErr } = await admin
    .from('reports')
    .insert({
      reporter_id: user.id,
      reporter_role: 'seller',
      target_user_id: validated.targetUserId,
      reason: validated.reason,
      details: validated.details ?? null,
    })
    .select('id, reason, status, created_at')
    .single()

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json({ error: 'You have already reported this user.' }, { status: 409 })
    }
    console.error('[reports] seller insert error:', insertErr.message)
    return NextResponse.json({ error: 'Failed to submit report.' }, { status: 500 })
  }

  await logActivity(admin, {
    userId: user.id,
    action: 'report',
    entityType: 'user',
    entityId: validated.targetUserId,
    metadata: { reason: validated.reason },
  })

  // Auto-trigger risk score recompute for the reported user (fire-and-forget)
  void import('@/lib/trust').then(({ computeAndStoreRiskScore }) =>
    computeAndStoreRiskScore(admin, validated.targetUserId),
  )

  return NextResponse.json(report, { status: 201 })
}
