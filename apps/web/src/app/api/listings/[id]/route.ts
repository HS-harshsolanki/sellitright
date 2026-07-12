import { NextRequest, NextResponse } from 'next/server'

import { mapSupabaseListingToMock } from '@/lib/listing-mapper'
import { getListingById } from '@/lib/mock-data'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { createClient } from '@/lib/supabase/server'

const ACTION_STATUS_MAP: Record<string, string> = {
  SOLD: 'SOLD',
  PAUSE: 'PAUSED',
  REACTIVATE: 'ACTIVE',
  WITHDRAW_REVIEW: 'DRAFT',
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Not supported in mock mode' }, { status: 501 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('listings')
    .delete()
    .eq('id', id)
    .eq('seller_id', user.id)
    .in('status', ['DRAFT', 'REJECTED'])
    .select('id')
    .single()

  if (error || !data) {
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

  const { data, error } = await supabase
    .from('listings')
    .update({ status: newStatus })
    .eq('id', id)
    .eq('seller_id', user.id)
    .select('id, status')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Listing not found or update failed' }, { status: 404 })
  }

  return NextResponse.json({ id: data.id, status: data.status })
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // ── Supabase path ──────────────────────────────────────────────────────────
  if (isSupabaseConfigured()) {
    const supabase = await createClient()
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
        headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
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
