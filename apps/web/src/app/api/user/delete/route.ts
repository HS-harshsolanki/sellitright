import { NextRequest, NextResponse } from 'next/server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Require confirmation in request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const confirm = (body as { confirm?: unknown })?.confirm
  if (confirm !== 'DELETE MY ACCOUNT') {
    return NextResponse.json(
      {
        error: 'To confirm deletion, send { "confirm": "DELETE MY ACCOUNT" } in the request body.',
      },
      { status: 400 },
    )
  }

  const admin = createServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  // Delete user data (in dependency order)
  await admin.from('notifications').delete().eq('user_id', user.id)
  await admin.from('reports').delete().eq('reporter_id', user.id)
  await admin.from('buyer_interest').delete().eq('buyer_id', user.id)
  // Anonymise seller listings (can't delete — historical record)
  await admin
    .from('listings')
    .update({
      title: '[Listing removed]',
      description: '[Content removed at user request]',
      address: null,
      seller_id: user.id, // keep FK but content is wiped
      status: 'DELETED',
    })
    .eq('seller_id', user.id)
    .neq('status', 'DELETED')
  // Delete auth account last
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('[user/delete] auth delete error:', error.message)
    return NextResponse.json({ error: 'Failed to delete account.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    message: 'Your account and personal data have been deleted.',
  })
}
