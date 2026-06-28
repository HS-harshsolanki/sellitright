import { NextRequest, NextResponse } from 'next/server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET /api/payments/status?interestId=<uuid>
// Returns contact details for an already-paid interest, so the UI can recover
// contact details without calling verify with a sentinel order ID.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const interestId = searchParams.get('interestId')

  if (!interestId) {
    return NextResponse.json({ error: 'interestId is required.' }, { status: 400 })
  }

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  // Confirm the buyer owns this interest and it is unlocked
  const { data: interest, error } = await admin
    .from('buyer_interest')
    .select('id, buyer_id, contact_unlocked, seller_phone, seller_email')
    .eq('id', interestId)
    .single()

  if (error || !interest) {
    return NextResponse.json({ error: 'Interest not found.' }, { status: 404 })
  }

  if (interest.buyer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  if (!interest.contact_unlocked) {
    return NextResponse.json({ unlocked: false }, { status: 200 })
  }

  return NextResponse.json({
    unlocked: true,
    sellerPhone: interest.seller_phone ?? null,
    sellerEmail: interest.seller_email ?? null,
  })
}
