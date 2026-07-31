import { NextRequest, NextResponse } from 'next/server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getImprovementActions, type QualityBreakdown } from '@/lib/quality-score'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const admin = createServiceClient()
    if (!admin) {
      return NextResponse.json({ error: 'Service not available' }, { status: 503 })
    }

    // Fetch listing — verify seller ownership
    const { data: listing, error: listingErr } = await admin
      .from('listings')
      .select(
        'id, quality_score, quality_breakdown, quality_scored_at, quality_v2_scored, city, locality, property_type, built_up_area, price, bhk_type, seller_id',
      )
      .eq('id', id)
      .single()

    if (listingErr || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (listing.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const breakdown = listing.quality_breakdown as QualityBreakdown | null

    // Fetch price benchmark (to pass price/sqft context to improvement actions)
    let medianPriceSqft: number | undefined
    if (listing.city && listing.locality && listing.property_type) {
      const { data: benchmark } = await admin
        .from('locality_price_benchmarks')
        .select('median_price_sqft, sample_count')
        .eq('city', listing.city)
        .eq('locality', listing.locality)
        .eq('property_type', listing.property_type)
        .maybeSingle()
      if (benchmark && benchmark.sample_count >= 10) {
        medianPriceSqft = Number(benchmark.median_price_sqft)
      }
    }

    const priceSqft =
      listing.price && listing.built_up_area && listing.built_up_area > 0
        ? listing.price / listing.built_up_area
        : undefined

    const actions = breakdown
      ? getImprovementActions(
          breakdown,
          listing.id,
          listing.bhk_type ?? undefined,
          listing.locality ?? undefined,
          priceSqft,
          medianPriceSqft,
        )
      : []

    // Peer percentile: % of similar active listings in same city+bhk with a lower score
    let peerPercentile = 0
    if (listing.city && listing.bhk_type) {
      const [{ count: lowerCount }, { count: totalCount }] = await Promise.all([
        admin
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('city', listing.city)
          .eq('bhk_type', listing.bhk_type)
          .eq('status', 'ACTIVE')
          .lt('quality_score', listing.quality_score ?? 0),
        admin
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('city', listing.city)
          .eq('bhk_type', listing.bhk_type)
          .eq('status', 'ACTIVE'),
      ])
      if (totalCount && totalCount > 0) {
        peerPercentile = Math.round(((lowerCount ?? 0) / totalCount) * 100)
      }
    }

    // Score history (last 5 events)
    const { data: history } = await admin
      .from('listing_quality_history')
      .select('score, reason, scored_at')
      .eq('listing_id', id)
      .order('scored_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      score: listing.quality_score ?? 0,
      breakdown,
      actions,
      peerPercentile,
      history: history ?? [],
      scoredAt: listing.quality_scored_at,
      v2Scored: listing.quality_v2_scored,
    })
  } catch (err) {
    console.error('[listings/[id]/quality-score] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
