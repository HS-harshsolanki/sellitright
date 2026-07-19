import { NextRequest, NextResponse } from 'next/server'

import { createNotification } from '@/lib/notifications'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/dashboard/interests/:id
// Allows the seller to accept or decline a buyer interest request.
// Body: { action: 'ACCEPTED' | 'DECLINED' }
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params

  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    return NextResponse.json({ error: 'Sign in to manage buyer requests.' }, { status: 401 })
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to manage buyer requests.' }, { status: 401 })
  }

  // Check suspension — seller must not be suspended to accept/decline requests
  const adminCheck = createServiceClient()
  if (adminCheck) {
    const { data: suspensionFlag } = await adminCheck
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const action = (body as { action?: unknown })?.action
  if (action !== 'ACCEPTED' && action !== 'DECLINED') {
    return NextResponse.json({ error: 'action must be "ACCEPTED" or "DECLINED".' }, { status: 400 })
  }

  // Verify the interest exists and belongs to this seller
  const { data: interest, error: fetchErr } = await supabase
    .from('buyer_interest')
    .select('id, seller_id, buyer_id, status')
    .eq('id', id)
    .single()

  if (fetchErr || !interest) {
    if (fetchErr && fetchErr.code !== 'PGRST116') {
      console.error('[dashboard/interests/[id]] fetch error:', fetchErr.message, fetchErr.code)
      return NextResponse.json(
        { error: 'Failed to load request. Please try again.' },
        { status: 500 },
      )
    }
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 })
  }

  if (interest.seller_id !== user.id) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 403 })
  }

  if (interest.status !== 'PENDING') {
    return NextResponse.json(
      { error: `This request is already ${String(interest.status).toLowerCase()}.` },
      { status: 409 },
    )
  }

  // No seller UPDATE RLS policy exists — use service role to bypass
  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'Service not configured. Cannot update request status.' },
      { status: 503 },
    )
  }

  const updatedAt = new Date().toISOString()
  const { error: updateErr } = await admin
    .from('buyer_interest')
    .update({ status: action, updated_at: updatedAt })
    .eq('id', id)
    .eq('seller_id', user.id)

  if (updateErr) {
    console.error('[dashboard/interests/[id]] update error:', updateErr.message)
    return NextResponse.json({ error: 'Failed to update request.' }, { status: 500 })
  }

  // Notify buyer — fire-and-forget, never block the response
  createNotification({
    admin,
    userId: interest.buyer_id as string,
    title: action === 'ACCEPTED' ? 'Request accepted' : 'Request declined',
    message:
      action === 'ACCEPTED'
        ? 'The owner accepted your request. They will share their contact details with you shortly.'
        : 'The owner declined your contact request.',
    type: action === 'ACCEPTED' ? 'Accepted' : 'Rejected',
    entityType: 'interest',
    entityId: id,
  }).catch((err: unknown) => {
    console.error('[dashboard/interests/[id]] notification failed (non-fatal):', err)
  })

  return NextResponse.json({ id, status: action, updatedAt })
}
