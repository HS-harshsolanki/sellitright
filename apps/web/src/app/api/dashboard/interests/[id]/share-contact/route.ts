import { NextRequest, NextResponse } from 'next/server'

import { createNotification } from '@/lib/notifications'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/dashboard/interests/:id/share-contact
// Owner shares their contact details with the buyer. Sets contact_unlocked=true and
// populates seller_phone, seller_email, buyer_phone, buyer_email on the interest row.
export async function POST(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params

  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    return NextResponse.json({ error: 'Sign in to share contact details.' }, { status: 401 })
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to share contact details.' }, { status: 401 })
  }

  // Suspension check
  const adminClient = createServiceClient()
  if (adminClient) {
    const { data: suspensionFlag } = await adminClient
      .from('user_flags')
      .select('flag')
      .eq('user_id', user.id)
      .eq('flag', 'SUSPENDED')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (suspensionFlag) {
      return NextResponse.json(
        { error: 'Your account is suspended. Contact support.' },
        { status: 403 },
      )
    }
  }

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  // Fetch the interest, verify ownership and status
  const { data: interest, error: fetchErr } = await admin
    .from('buyer_interest')
    .select('id, seller_id, buyer_id, status, contact_unlocked')
    .eq('id', id)
    .single()

  if (fetchErr || !interest) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 })
  }

  if (interest.seller_id !== user.id) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 403 })
  }

  if (interest.status !== 'ACCEPTED') {
    return NextResponse.json(
      { error: 'You can only share contact for accepted requests.' },
      { status: 409 },
    )
  }

  // Idempotent — already shared
  if (interest.contact_unlocked) {
    return NextResponse.json({ success: true, alreadyShared: true })
  }

  // Resolve seller phone + email
  const { data: sellerAuthData, error: sellerAuthErr } = await admin.auth.admin.getUserById(user.id)
  if (sellerAuthErr) {
    console.error('[share-contact] failed to resolve seller auth data:', sellerAuthErr.message)
    return NextResponse.json({ error: 'Failed to resolve contact details.' }, { status: 500 })
  }
  const sellerMeta = sellerAuthData?.user?.user_metadata ?? {}
  const sellerPhone: string | null = (sellerMeta.phone as string | undefined) ?? null
  const sellerEmail: string | null = sellerAuthData?.user?.email ?? null

  // Resolve buyer phone + email
  const { data: buyerAuthData, error: buyerAuthErr } = await admin.auth.admin.getUserById(
    interest.buyer_id as string,
  )
  if (buyerAuthErr) {
    console.error('[share-contact] failed to resolve buyer auth data:', buyerAuthErr.message)
    return NextResponse.json({ error: 'Failed to resolve contact details.' }, { status: 500 })
  }
  const buyerMeta = buyerAuthData?.user?.user_metadata ?? {}
  const buyerPhone: string | null = (buyerMeta.phone as string | undefined) ?? null
  const buyerEmail: string | null = buyerAuthData?.user?.email ?? null

  const updatedAt = new Date().toISOString()
  const { error: updateErr } = await admin
    .from('buyer_interest')
    .update({
      contact_unlocked: true,
      seller_phone: sellerPhone,
      seller_email: sellerEmail,
      buyer_phone: buyerPhone,
      buyer_email: buyerEmail,
      updated_at: updatedAt,
    })
    .eq('id', id)
    .eq('seller_id', user.id)

  if (updateErr) {
    console.error('[share-contact] update error:', updateErr.message)
    return NextResponse.json({ error: 'Failed to share contact.' }, { status: 500 })
  }

  // Notify buyer — fire-and-forget
  createNotification({
    admin,
    userId: interest.buyer_id as string,
    title: 'Contact details shared',
    message:
      'The owner shared their contact details. You can now reach them directly on WhatsApp or phone.',
    type: 'Accepted',
    entityType: 'interest',
    entityId: id,
  }).catch((err: unknown) => {
    console.error('[share-contact] notification failed (non-fatal):', err)
  })

  return NextResponse.json({ success: true, updatedAt, buyerPhone, buyerEmail })
}
