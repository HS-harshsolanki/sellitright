import { NextRequest, NextResponse } from 'next/server'
import { getListingById } from '@/lib/mock-data'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { createServiceClient } from '@/lib/supabase/server'
import { mapSupabaseListingToMock } from '@/lib/listing-mapper'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // ── Supabase path ──────────────────────────────────────────────────────────
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()
    if (supabase) {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
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
        return NextResponse.json(mapSupabaseListingToMock(data))
      }
    }
  }

  // ── Mock fallback ────────────────────────────────────────────────────────
  const listing = getListingById(id)
  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }
  return NextResponse.json(listing)
}
