import { NextRequest, NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function chatTable(client: ReturnType<typeof createServiceClient>, table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).from(table)
}

// GET /api/chat/by-interest/[interestId]
// Returns (or creates) the chat thread for this interest.
// Thread is only created if the interest is in ACCEPTED status.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ interestId: string }> },
) {
  const { interestId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to access chat.' }, { status: 401 })
  }

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  // Check if thread already exists
  const { data: existing } = await chatTable(admin, 'chat_threads')
    .select('id, buyer_id, seller_id, status')
    .eq('interest_id', interestId)
    .maybeSingle()

  if (existing) {
    const isBuyer = existing.buyer_id === user.id
    const isSeller = existing.seller_id === user.id
    if (!isBuyer && !isSeller) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
    }
    return NextResponse.json({ threadId: existing.id, created: false })
  }

  // Thread doesn't exist yet — verify interest state before creating
  // Use two separate queries to avoid join typing issues with unregistered tables
  const { data: interest, error: interestError } = await admin
    .from('buyer_interest')
    .select('id, buyer_id, listing_id, status')
    .eq('id', interestId)
    .maybeSingle()

  if (interestError || !interest) {
    return NextResponse.json({ error: 'Interest not found.' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const interestRow = interest as any
  const buyerId = interestRow.buyer_id as string
  const listingId = interestRow.listing_id as string

  // Look up the seller from the listing
  const { data: listing, error: listingError } = await admin
    .from('listings')
    .select('seller_id')
    .eq('id', listingId)
    .maybeSingle()

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sellerId = (listing as any).seller_id as string

  // Only buyer or seller of this interest may create the thread
  if (user.id !== buyerId && user.id !== sellerId) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  // Chat only available when interest is ACCEPTED
  if (interestRow.status !== 'ACCEPTED') {
    return NextResponse.json(
      { error: 'Chat is only available after the seller accepts your interest.' },
      { status: 403 },
    )
  }

  // Create the thread
  const { data: newThread, error: createError } = await chatTable(admin, 'chat_threads')
    .insert({
      interest_id: interestId,
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
    })
    .select('id')
    .single()

  if (createError || !newThread) {
    logger.error('[chat] thread creation failed', { error: createError?.message })
    return NextResponse.json({ error: 'Failed to start conversation.' }, { status: 500 })
  }

  return NextResponse.json({ threadId: (newThread as { id: string }).id, created: true })
}
