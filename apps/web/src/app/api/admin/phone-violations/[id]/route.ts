import { NextRequest, NextResponse } from 'next/server'

import { isAuthorized } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function svc(client: ReturnType<typeof createServiceClient>, table: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).from(table)
}

// DELETE /api/admin/phone-violations/[id]
// Unblock a user: sets phone_block_flags.is_active = false for the given block record.
// [id] is the phone_block_flags row id (UUID).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const admin = createServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })

  const { data: existing, error: fetchError } = await svc(admin, 'phone_block_flags')
    .select('id, user_id, is_active')
    .eq('id', id)
    .maybeSingle()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Block record not found.' }, { status: 404 })
  }

  if (!existing.is_active) {
    return NextResponse.json({ error: 'User is not currently blocked.' }, { status: 409 })
  }

  const { error } = await svc(admin, 'phone_block_flags')
    .update({ is_active: false, unblocked_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to unblock user.' }, { status: 500 })
  }

  await admin.from('notifications').insert({
    user_id: existing.user_id,
    title: 'Account restriction lifted',
    message:
      'Your messaging restriction has been lifted by an admin. You can now send messages again.',
    type: 'AdminAction',
    entity_type: 'phone_block_flags',
    entity_id: id,
  })

  return NextResponse.json({ success: true, userId: existing.user_id })
}
