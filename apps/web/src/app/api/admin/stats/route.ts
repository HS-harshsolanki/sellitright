import { NextRequest, NextResponse } from 'next/server'

import { isAuthorized } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/admin/stats
// Returns aggregate counts for the admin dashboard.
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({
      listings: { pending: 0, active: 0, rejected: 0 },
      reports: { open: 0 },
      users: { total: 0, suspended: 0 },
      payments: { total: 0, totalRevenue: 0 },
    })
  }

  const [
    pendingListings,
    activeListings,
    rejectedListings,
    openReports,
    suspendedUsers,
    paymentsResult,
  ] = await Promise.all([
    admin
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING_REVIEW'),
    admin.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    admin.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'REJECTED'),
    admin.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'OPEN'),
    admin
      .from('user_flags')
      .select('user_id', { count: 'exact', head: true })
      .eq('flag', 'SUSPENDED'),
    admin.from('payments').select('id, amount').eq('status', 'SUCCESS'),
  ])

  const successPayments = paymentsResult.data ?? []
  const totalRevenue = successPayments.reduce(
    (sum, p) => sum + ((p as { amount: number }).amount ?? 0),
    0,
  )

  // Auth user count via admin API
  const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
  const totalUsers = (usersPage as { total?: number } | null)?.total ?? 0

  return NextResponse.json({
    listings: {
      pending: pendingListings.count ?? 0,
      active: activeListings.count ?? 0,
      rejected: rejectedListings.count ?? 0,
    },
    reports: {
      open: openReports.count ?? 0,
    },
    users: {
      total: totalUsers,
      suspended: suspendedUsers.count ?? 0,
    },
    payments: {
      total: successPayments.length,
      totalRevenue: totalRevenue,
    },
  })
}
