import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isAuthorized, logAdminAction } from '@/lib/admin-auth'
import { computeAndStoreRiskScore } from '@/lib/trust'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/admin/users/:id/suspend
// Body: { reason?: string }
export async function POST(request: NextRequest, { params }: RouteContext) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: userId } = await params

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  let reason: string | undefined
  try {
    const body = (await request.json()) as { reason?: string }
    reason = body.reason?.trim() || undefined
  } catch {
    // reason is optional
  }

  const { data: userRecord, error: userErr } = await admin.auth.admin.getUserById(userId)
  if (userErr || !userRecord?.user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  }

  const { error: flagErr } = await admin.from('user_flags').insert({
    user_id: userId,
    flag: 'SUSPENDED',
    reason: reason ?? null,
    flagged_by: 'api_key',
  })

  if (flagErr) {
    console.error('[admin/suspend] insert error:', flagErr.message)
    return NextResponse.json({ error: 'Failed to suspend user.' }, { status: 500 })
  }

  void computeAndStoreRiskScore(admin, userId)
  void logAdminAction(admin, {
    action: 'user_suspended',
    entityType: 'user',
    entityId: userId,
    newValue: { flag: 'SUSPENDED', reason: reason ?? null },
    reason,
  })

  return NextResponse.json({ success: true })
}
