import { NextRequest, NextResponse } from 'next/server'
import { rejectListing } from '@/lib/listing-store'
import { auditLog } from '@/lib/audit-log'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_KEY) return false
  return request.headers.get('x-admin-key') === ADMIN_KEY
}

interface RejectBody {
  reason: string
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

  let body: RejectBody
  try {
    body = (await request.json()) as RejectBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length === 0) {
    return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
  }

  const updated = rejectListing(id, body.reason.trim())

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
    reason: body.reason.trim(),
  })

  // Log additional verification note if provided separately
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
