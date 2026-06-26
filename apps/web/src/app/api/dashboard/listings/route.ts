import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    let supabase: Awaited<ReturnType<typeof createClient>>
    try {
      supabase = await createClient()
    } catch {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('listings')
      .select(
        'id, title, price, property_type, bhk_type, built_up_area, city, locality, image_urls, status, is_verified, view_count, rejection_reason, created_at, updated_at',
      )
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[dashboard/listings] select error:', error?.message)
      return NextResponse.json({ error: 'Failed to load listings' }, { status: 500 })
    }

    return NextResponse.json({ listings: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
