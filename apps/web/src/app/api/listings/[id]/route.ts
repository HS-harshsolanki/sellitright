import { NextRequest, NextResponse } from 'next/server'

import { mapSupabaseListingToMock } from '@/lib/listing-mapper'
import { getListingById } from '@/lib/mock-data'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ACTION_STATUS_MAP: Record<string, string> = {
  SOLD: 'SOLD',
  PAUSE: 'PAUSED',
  REACTIVATE: 'ACTIVE',
  WITHDRAW_REVIEW: 'DRAFT',
}

// Statuses that are valid sources for each action.
// A transition is only allowed when the current listing status is in this set.
const ACTION_ALLOWED_FROM: Record<string, string[]> = {
  SOLD: ['ACTIVE', 'PAUSED'],
  PAUSE: ['ACTIVE'],
  REACTIVATE: ['PAUSED'],
  WITHDRAW_REVIEW: ['UNDER_REVIEW'],
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Not supported in mock mode' }, { status: 501 })
  }

  // Verify the caller owns this listing via the user client (RLS enforced)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Confirm the listing exists and belongs to this seller before deleting
  const { data: existing } = await supabase
    .from('listings')
    .select('id, status, seller_id')
    .eq('id', id)
    .eq('seller_id', user.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Listing not found or cannot be deleted' }, { status: 404 })
  }
  if (existing.status === 'SOLD') {
    return NextResponse.json({ error: 'Sold listings cannot be deleted' }, { status: 409 })
  }

  // Use service client to bypass the RLS WITH CHECK constraint on status='DELETED'
  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service client unavailable' }, { status: 503 })
  }

  const { data, error } = await admin
    .from('listings')
    .update({ status: 'DELETED' })
    .eq('id', id)
    .eq('seller_id', user.id)
    .select('id')
    .single()

  if (error || !data) {
    console.error('[api/listings/[id] DELETE]', error?.message, error?.code)
    return NextResponse.json({ error: 'Listing not found or cannot be deleted' }, { status: 404 })
  }

  return NextResponse.json({ id: data.id })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Not supported in mock mode' }, { status: 501 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as { action?: string }
  const newStatus = body.action ? ACTION_STATUS_MAP[body.action] : undefined
  if (!newStatus) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const allowedFrom = ACTION_ALLOWED_FROM[body.action!] ?? []
  const { data, error } = await supabase
    .from('listings')
    .update({ status: newStatus })
    .eq('id', id)
    .eq('seller_id', user.id)
    .in('status', allowedFrom)
    .select('id, status')
    .single()

  if (error || !data) {
    if (error && error.code !== 'PGRST116') {
      console.error('[api/listings/[id] PATCH]', error.message, error.code)
      return NextResponse.json(
        { error: 'Failed to update listing. Please try again.' },
        { status: 500 },
      )
    }
    return NextResponse.json({ error: 'Listing not found or update failed' }, { status: 404 })
  }

  return NextResponse.json({ id: data.id, status: data.status })
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // ── Supabase path ──────────────────────────────────────────────────────────
  // Use the service-role client so this public read is RLS-independent. If the
  // anon RLS policy is ever tightened (e.g. TO authenticated), an anon client
  // would silently fall through to stale mock data instead of returning an error.
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Service client unavailable' }, { status: 503 })
    }
    const { data, error } = await supabase
      .from('listings')
      .select(
        'id, title, price, property_type, bhk_type, built_up_area, carpet_area, floor, total_floors, facing, furnishing, bathrooms, balconies, parking, age_of_property, amenities, city, locality, address, pincode, state, image_urls, status, is_verified, view_count, created_at, seller_id, description',
      )
      .eq('id', id)
      .eq('status', 'ACTIVE')
      .single()

    if (error) {
      // PGRST116 = no rows — treat as 404
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }
      console.error('[api/listings/[id]] Supabase error:', error.message)
      // Fall through to mock on unexpected errors
    } else if (data) {
      return NextResponse.json(mapSupabaseListingToMock(data), {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
      })
    }
  }

  // ── Mock fallback ────────────────────────────────────────────────────────
  const listing = getListingById(id)
  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }
  return NextResponse.json(listing)
}
