import { NextRequest, NextResponse } from 'next/server'
import { auditLog } from '@/lib/audit-log'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_KEY) return false
  return request.headers.get('x-admin-key') === ADMIN_KEY
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') ?? '25', 10)))
  const action = searchParams.get('action') ?? ''
  const listingId = searchParams.get('listing_id') ?? ''

  const entries = auditLog.getAll({ action: action || undefined, listingId: listingId || undefined })
  const total = entries.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const offset = (page - 1) * limit
  const items = entries.slice(offset, offset + limit)

  return NextResponse.json({ entries: items, total, page, totalPages })
}
