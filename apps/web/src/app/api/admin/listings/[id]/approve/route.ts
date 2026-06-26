import { NextRequest, NextResponse } from 'next/server'
import { approveListing } from '@/lib/listing-store'
import { auditLog } from '@/lib/audit-log'
import { createServiceClient } from '@/lib/supabase/server'
import { mapSupabaseListingToMock } from '@/lib/listing-mapper'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_KEY) return false
  return request.headers.get('x-admin-key') === ADMIN_KEY
}

interface ApproveBody {
  note?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { data, error } = await supabase
      .from('listings')
      .update({ status: 'ACTIVE', rejection_reason: null })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
      }
      console.error('[admin/approve] Supabase error:', error.message, error.code)
      return NextResponse.json({ error: 'Failed to approve listing' }, { status: 500 })
    }

    // Write audit log to Supabase
    await supabase.from('audit_log').insert({
      listing_id: id,
      listing_title: data.title,
      action: 'approved',
      previous_status: 'PENDING_REVIEW',
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
