import { NextRequest, NextResponse } from 'next/server'

import { isAuthorized } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/admin/users/:id
// Returns full user detail: profile, listings, interests, payments, risk score, flag history.
export async function GET(request: NextRequest, { params }: RouteContext) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: userId } = await params

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  const { data: userRecord, error: userErr } = await admin.auth.admin.getUserById(userId)
  if (userErr || !userRecord?.user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  }

  const user = userRecord.user

  const [listingsRes, interestsRes, paymentsRes, riskRes, flagRes] = await Promise.all([
    admin
      .from('listings')
      .select('id, title, status, price, city, created_at')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('buyer_interest')
      .select('id, listing_id, status, contact_unlocked, created_at')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('payments')
      .select('id, status, amount, razorpay_order_id, paid_at, created_at')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('risk_scores')
      .select('score, level, signals, last_computed_at')
      .eq('user_id', userId)
      .maybeSingle(),
    admin
      .from('user_flags')
      .select('id, flag, reason, flagged_by, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return NextResponse.json({
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? (user.user_metadata?.phone as string | undefined) ?? null,
    name: (user.user_metadata?.full_name as string | undefined) ?? null,
    createdAt: user.created_at,
    listings: listingsRes.data ?? [],
    interests: interestsRes.data ?? [],
    payments: paymentsRes.data ?? [],
    risk: riskRes.data ?? null,
    flagHistory: flagRes.data ?? [],
  })
}
