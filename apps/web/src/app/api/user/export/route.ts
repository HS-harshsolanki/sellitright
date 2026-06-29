import { NextResponse } from 'next/server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  // Collect all personal data for this user
  const [listings, interests, payments, reports, notifications] = await Promise.all([
    admin.from('listings').select('*').eq('seller_id', user.id),
    admin.from('buyer_interest').select('*').or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
    admin.from('payments').select('*').or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
    admin.from('reports').select('*').eq('reporter_id', user.id),
    admin.from('notifications').select('*').eq('user_id', user.id),
  ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      createdAt: user.created_at,
      metadata: user.user_metadata,
    },
    listings: listings.data ?? [],
    buyerInterests: interests.data ?? [],
    payments: (payments.data ?? []).map((p) => ({ ...p, razorpay_order_id: '[redacted]' })),
    reportsFiled: reports.data ?? [],
    notifications: notifications.data ?? [],
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="my-data-${new Date().toISOString().split('T')[0]}.json"`,
    },
  })
}
