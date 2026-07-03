import { NextRequest, NextResponse } from 'next/server'

import { isAuthorized } from '@/lib/admin-auth'
import { auditLog } from '@/lib/audit-log'
import { mapSupabaseListingToMock } from '@/lib/listing-mapper'
import { rejectListing } from '@/lib/listing-store'
import { createNotification } from '@/lib/notifications'
import { createServiceClient } from '@/lib/supabase/server'

interface RejectBody {
  reason: string
  note?: string
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: RejectBody
  try {
    body = (await request.json()) as RejectBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length === 0) {
    return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
  }

  if (body.reason.length > 1000) {
    return NextResponse.json({ error: 'Reason must be 1000 characters or fewer' }, { status: 400 })
  }

  if (body.note && body.note.length > 2000) {
    return NextResponse.json({ error: 'Note must be 2000 characters or fewer' }, { status: 400 })
  }

  const reason = body.reason.trim()

  // ── Supabase path ────────────────────────────────────────────────────────
  const supabase = createServiceClient()
  if (supabase) {
    // Fetch current status first for accurate audit log
    const { data: current } = await supabase.from('listings').select('status').eq('id', id).single()

    const { data, error } = await supabase
      .from('listings')
      .update({ status: 'REJECTED', rejection_reason: reason })
      .eq('id', id)
      .in('status', ['PENDING_REVIEW', 'ACTIVE'])
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }
      console.error('[admin/reject] Supabase error:', error.message, error.code)
      return NextResponse.json({ error: 'Failed to reject listing' }, { status: 500 })
    }

    // Notify seller their listing was rejected
    void createNotification({
      admin: supabase,
      userId: data.seller_id,
      title: 'Listing rejected',
      message: `Your listing was not approved. ${body.reason ? `Reason: ${body.reason}` : 'Please review our listing guidelines and resubmit.'}`,
      type: 'System',
      entityType: 'listing',
      entityId: id,
    })

    // Write reject + optional note to audit_log
    await supabase.from('audit_log').insert({
      listing_id: id,
      listing_title: data.title,
      action: 'rejected',
      previous_status: current?.status ?? 'PENDING_REVIEW',
      new_status: 'REJECTED',
      actor_id: 'api_key',
      actor_role: 'reviewer',
      reason,
    })

    if (body.note?.trim()) {
      await supabase.from('audit_log').insert({
        listing_id: id,
        listing_title: data.title,
        action: 'note_added',
        previous_status: 'REJECTED',
        new_status: 'REJECTED',
        actor_id: 'api_key',
        actor_role: 'reviewer',
        reason: body.note.trim(),
      })
    }

    return NextResponse.json(mapSupabaseListingToMock(data))
  }

  // ── In-memory fallback ───────────────────────────────────────────────────
  const updated = rejectListing(id, reason)
  if (!updated) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  auditLog.add({
    listing_id: id,
    listing_title: updated.title,
    action: 'rejected',
    previous_status: 'PENDING_REVIEW',
    new_status: 'REJECTED',
    actor_id: 'api_key',
    actor_role: 'reviewer',
    reason,
  })

  if (body.note?.trim()) {
    auditLog.add({
      listing_id: id,
      listing_title: updated.title,
      action: 'note_added',
      previous_status: 'REJECTED',
      new_status: 'REJECTED',
      actor_id: 'api_key',
      actor_role: 'reviewer',
      reason: body.note.trim(),
    })
  }

  return NextResponse.json(updated)
}
