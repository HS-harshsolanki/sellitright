import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getListingByIdFromStore } from '@/lib/listing-store'
import { auditLog } from '@/lib/audit-log'
import { createServiceClient } from '@/lib/supabase/server'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_KEY) return false
  const provided = request.headers.get('x-admin-key') ?? ''
  if (provided.length !== ADMIN_KEY.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(ADMIN_KEY))
  } catch {
    return false
  }
}

interface NoteBody {
  note: string
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  if (body.note.length > 2000) {
    return NextResponse.json({ error: 'Note must be 2000 characters or fewer' }, { status: 400 })
  }

  const note = body.note.trim()

  // ── Supabase path ────────────────────────────────────────────────────────
  const supabase = createServiceClient()
  if (supabase) {
    // Verify listing exists
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('id, title, status')
      .eq('id', id)
      .single()

    if (fetchError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const { error } = await supabase.from('audit_log').insert({
      listing_id: id,
      listing_title: listing.title,
      action: 'note_added',
      previous_status: listing.status,
      new_status: listing.status,
      actor_id: 'api_key',
      actor_role: 'reviewer',
      reason: note,
    })

    if (error) {
      console.error('[admin/note] Supabase error:', error.message, error.code)
      return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  // ── In-memory fallback ───────────────────────────────────────────────────
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
    reason: note,
  })

  return NextResponse.json({ ok: true })
}
