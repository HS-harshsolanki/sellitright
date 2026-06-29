import { NextRequest, NextResponse } from 'next/server'

import { isAuthorized } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase/server'

export interface PaymentAdminItem {
  id: string
  buyerId: string
  sellerId: string
  buyerEmail: string | null
  sellerEmail: string | null
  listingId: string
  interestId: string
  razorpayOrderId: string
  razorpayPaymentId: string | null
  status: string
  amount: number
  paidAt: string | null
  createdAt: string
  contactUnlocked: boolean
}

// GET /api/admin/payments
// Search and list payments.
// Params: q, status (PENDING|SUCCESS|FAILED), sort (newest|oldest), page, limit
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  const VALID_STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'] as const

  const { searchParams } = new URL(request.url)
  // Strip characters that would break the PostgREST filter string syntax
  const q = (searchParams.get('q') ?? '').trim().replace(/[%_,()\\.]/g, '')
  const status = searchParams.get('status') ?? ''
  const sort = searchParams.get('sort') ?? 'newest'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') ?? '25', 10)))
  const offset = (page - 1) * limit

  // Validate status against allowed enum values before passing to Supabase
  const statusParam =
    status && VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])
      ? status
      : undefined

  let query = admin
    .from('payments')
    .select(
      'id, buyer_id, seller_id, listing_id, interest_id, razorpay_order_id, razorpay_payment_id, status, amount, paid_at, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: sort === 'oldest' })
    .range(offset, offset + limit - 1)

  if (statusParam) query = query.eq('status', statusParam)

  // Text search on IDs
  if (q) {
    query = query.or(
      `razorpay_order_id.ilike.%${q}%,razorpay_payment_id.ilike.%${q}%,id.ilike.%${q}%`,
    )
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[admin/payments] fetch error:', error.message)
    return NextResponse.json({ error: 'Failed to load payments.' }, { status: 500 })
  }

  const rows = data ?? []

  // Fetch buyer/seller emails and contact unlock status.
  const interestIds = rows.map((r) => (r as { interest_id: string }).interest_id).filter(Boolean)

  const userIds = [
    ...new Set([
      ...rows.map((r) => (r as { buyer_id: string }).buyer_id).filter(Boolean),
      ...rows.map((r) => (r as { seller_id: string }).seller_id).filter(Boolean),
    ]),
  ] as string[]

  const [profileRes, interestRes] = await Promise.all([
    userIds.length > 0
      ? admin.from('profiles').select('id, email, full_name').in('id', userIds)
      : Promise.resolve({ data: [] }),
    interestIds.length > 0
      ? admin.from('buyer_interest').select('id, contact_unlocked').in('id', interestIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileMap = new Map(
    (
      (
        profileRes as {
          data: Array<{ id: string; email: string | null; full_name: string | null }>
        }
      ).data ?? []
    ).map((p) => [p.id, { email: p.email, name: p.full_name }]),
  )

  const unlockedMap = new Map<string, boolean>(
    (
      (interestRes as { data: Array<{ id: string; contact_unlocked: boolean | null }> }).data ?? []
    ).map((r) => [r.id, r.contact_unlocked === true]),
  )

  const payments: PaymentAdminItem[] = rows.map((r) => {
    const row = r as {
      id: string
      buyer_id: string
      seller_id: string
      listing_id: string
      interest_id: string
      razorpay_order_id: string
      razorpay_payment_id: string | null
      status: string
      amount: number
      paid_at: string | null
      created_at: string
    }
    return {
      id: row.id,
      buyerId: row.buyer_id,
      sellerId: row.seller_id,
      buyerEmail: profileMap.get(row.buyer_id)?.email ?? null,
      sellerEmail: profileMap.get(row.seller_id)?.email ?? null,
      listingId: row.listing_id,
      interestId: row.interest_id,
      razorpayOrderId: row.razorpay_order_id,
      razorpayPaymentId: row.razorpay_payment_id ?? null,
      status: row.status,
      amount: row.amount,
      paidAt: row.paid_at ?? null,
      createdAt: row.created_at,
      contactUnlocked: unlockedMap.get(row.interest_id) ?? false,
    }
  })

  const total = count ?? rows.length
  return NextResponse.json({
    payments,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  })
}
