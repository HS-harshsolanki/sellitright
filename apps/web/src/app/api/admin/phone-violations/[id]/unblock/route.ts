import { NextRequest, NextResponse } from 'next/server'

import { isAuthorized, logAdminAction } from '@/lib/admin-auth'
import { createNotification } from '@/lib/notifications'
import { createServiceClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/admin/phone-violations/[id]/unblock
// Lifts the active phone_block_flag for the user associated with a violation.
// Only an admin can call this — the user cannot unblock themselves.
// Idempotent: if the user has no active block, returns 200 with no change.
export async function POST(request: NextRequest, { params }: RouteContext) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  // Fetch the violation to get the sender_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: violation, error: fetchError } = await (admin as any)
    .from('chat_violations')
    .select('id, sender_id, reviewed_at')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    console.error('[admin/phone-violations/unblock] fetch error:', fetchError.message)
    return NextResponse.json({ error: 'Failed to fetch violation.' }, { status: 500 })
  }

  if (!violation) {
    return NextResponse.json({ error: 'Violation not found.' }, { status: 404 })
  }

  // Deactivate all active phone_block_flags for this user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: unblockError } = await (admin as any)
    .from('phone_block_flags')
    .update({ is_active: false })
    .eq('user_id', violation.sender_id)
    .eq('is_active', true)

  if (unblockError) {
    console.error('[admin/phone-violations/unblock] unblock error:', unblockError.message)
    return NextResponse.json({ error: 'Failed to unblock user.' }, { status: 500 })
  }

  // Mark violation as reviewed if not already
  if (!violation.reviewed_at) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('chat_violations')
      .update({ reviewed_at: new Date().toISOString() })
      .eq('id', id)
  }

  // Notify the user that their access has been restored
  await createNotification({
    admin,
    userId: violation.sender_id,
    title: 'Account Access Restored',
    message:
      'Your chat access has been restored by an admin. Please ensure you follow our platform guidelines — further violations may result in a permanent ban.',
    type: 'System',
  })

  void logAdminAction(admin, {
    action: 'phone_violation_unblocked',
    entityType: 'user',
    entityId: violation.sender_id,
  })

  return NextResponse.json({ success: true })
}
