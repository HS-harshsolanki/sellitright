import { NextRequest, NextResponse } from 'next/server'

import { isAuthorized, logAdminAction } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const verified = (body as { verified?: unknown })?.verified
  if (typeof verified !== 'boolean') {
    return NextResponse.json({ error: '{ verified: boolean } required.' }, { status: 400 })
  }

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 })
  }

  const { data, error } = await admin
    .from('listings')
    .update({ is_verified: verified })
    .eq('id', id)
    .select('id, title, seller_id, is_verified')
    .single()

  if (error || !data) {
    console.error('[admin/listings/verify]', error?.message)
    if (error?.code === 'PGRST116') {
      return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to update listing.' }, { status: 500 })
  }

  void logAdminAction(admin, {
    action: verified ? 'verified' : 'unverified',
    entityType: 'listing',
    entityId: id,
    listingId: id,
    listingTitle: data.title,
    newValue: { is_verified: verified, title: data.title },
  })

  return NextResponse.json(data)
}
