import { NextRequest, NextResponse } from 'next/server'
import { getListingByIdFromStore } from '@/lib/listing-store'
import { auditLog } from '@/lib/audit-log'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_KEY) return false
  return request.headers.get('x-admin-key') === ADMIN_KEY
}

interface NoteBody {
  note: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: NoteBody
  try {
    body = (await request.json()) as NoteBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.note || typeof body.note !== 'string' || body.note.trim().length === 0) {
    return NextResponse.json({ error: 'Note text is required' }, { status: 400 })
  }

  const listing = getListingByIdFromStore(id)
  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  auditLog.add({
    listing_id: id,
    listing_title: listing.title,
    action: 'note_added',
    previous_status: listing.status,
    new_status: listing.status,
    actor_id: 'api_key',
    actor_role: 'reviewer',
    reason: body.note.trim(),
  })

  return NextResponse.json({ ok: true })
}
