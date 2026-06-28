import { NextRequest, NextResponse } from 'next/server'

import { isAuthorized } from '@/lib/admin-auth'
import { auditLog } from '@/lib/audit-log'
import { mapSupabaseListingToMock } from '@/lib/listing-mapper'
import { approveListing } from '@/lib/listing-store'
import { createNotification } from '@/lib/notifications'
import { createServiceClient } from '@/lib/supabase/server'

interface ApproveBody {
  note?: string
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: ApproveBody = {}
  try {
    body = (await request.json()) as ApproveBody
  } catch {
    // body is optional
  }

  // ── Supabase path ────────────────────────────────────────────────────────
  const supabase = createServiceClient()
  if (supabase) {
    // Fetch current status first for accurate audit log
    const { data: current } = await supabase.from('listings').select('status').eq('id', id).single()

    const { data, error } = await supabase
      .from('listings')
      .update({ status: 'ACTIVE', rejection_reason: null })
      .eq('id', id)
      .in('status', ['PENDING_REVIEW', 'REJECTED'])
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }
      console.error('[admin/approve] Supabase error:', error.message, error.code)
      return NextResponse.json({ error: 'Failed to approve listing' }, { status: 500 })
    }

    // Notify seller their listing was approved
    void createNotification({
      admin: supabase,
      userId: data.seller_id,
      title: 'Listing approved',
      message: 'Your listing is now live and visible to buyers.',
      type: 'System',
      entityType: 'listing',
      entityId: id,
    })

    // Write audit log to Supabase
    await supabase.from('audit_log').insert({
      listing_id: id,
      listing_title: data.title,
      action: 'approved',
      previous_status: current?.status ?? 'PENDING_REVIEW',
      new_status: 'ACTIVE',
      actor_id: 'api_key',
      actor_role: 'reviewer',
      reason: body.note?.trim() || null,
    })

    return NextResponse.json(mapSupabaseListingToMock(data))
  }

  // ── In-memory fallback ───────────────────────────────────────────────────
  const updated = approveListing(id)
  if (!updated) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  auditLog.add({
    listing_id: id,
    listing_title: updated.title,
    action: 'approved',
    previous_status: 'PENDING_REVIEW',
    new_status: 'ACTIVE',
    actor_id: 'api_key',
    actor_role: 'reviewer',
    reason: body.note?.trim() || null,
  })

  return NextResponse.json(updated)
}
