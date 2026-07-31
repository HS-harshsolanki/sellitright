import { NextResponse } from 'next/server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET /api/phone/status
// Returns { verified: boolean, phone: string | null } from the DB (not the JWT).
// Used by the profile page on mount to get authoritative verification state
// without relying on the potentially-stale cached JWT.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  }

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  const { data } = await (admin as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .from('profiles')
    .select('phone, phone_verified')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({
    verified: data?.phone_verified === true,
    phone: data?.phone ?? null,
  })
}
