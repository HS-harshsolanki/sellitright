import { NextRequest, NextResponse } from 'next/server'
import { getListingByIdFromStore, deleteListing } from '@/lib/listing-store'
import { auditLog } from '@/lib/audit-log'
import { createServiceClient } from '@/lib/supabase/server'
import { mapSupabaseListingToMock } from '@/lib/listing-mapper'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_KEY) return false
  return request.headers.get('x-admin-key') === ADMIN_KEY
}

interface DeleteBody {
  reason?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: DeleteBody = {}
  try {
    body = (await request.json()) as DeleteBody
  } catch {
    // body is optional
  }

  const reason = body.reason?.trim() || null

  // ── Supabase path ────────────────────────────────────────────────────────
  const supabase = createServiceClient()
  if (supabase) {
    // Fetch current status first so audit log captures the real previous_status
    const { data: existing, error: fetchError } = await supabase
      .from('listings')
      .select('id, title, status')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('listings')
      .update({ status: 'DELETED', rejection_reason: null })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[admin/delete] Supabase error:', error.message, error.code)
      return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 })
    }

    await supabase.from('audit_log').insert({
      listing_id: id,
      listing_title: data.title,
      action: 'deleted',
      previous_status: existing.status,
      new_status: 'DELETED',
      actor_id: 'api_key',
      actor_role: 'reviewer',
      reason,
    })

    return NextResponse.json(mapSupabaseListingToMock(data))
  }

  // ── In-memory fallback ───────────────────────────────────────────────────
  const existing = getListingByIdFromStore(id)
  if (!existing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  const previousStatus = existing.status
  const updated = deleteListing(id)!

  auditLog.add({
    listing_id: id,
    listing_title: updated.title,
    action: 'deleted',
    previous_status: previousStatus,
    new_status: 'DELETED',
    actor_id: 'api_key',
    actor_role: 'reviewer',
    reason,
  })

  return NextResponse.json(updated)
}
