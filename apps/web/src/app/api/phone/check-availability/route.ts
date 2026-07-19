import { NextRequest, NextResponse } from 'next/server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

// GET /api/phone/check-availability?phone=XXXXXXXXXX
// Returns { available: boolean }
// 200 available:true  — number is free or belongs to the caller
// 200 available:false — number is claimed by a different verified account
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  }

  const rawPhone = request.nextUrl.searchParams.get('phone') ?? ''
  const phone = normalizePhone(rawPhone)
  if (!INDIAN_MOBILE_RE.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone number.' }, { status: 422 })
  }

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  // Check if another verified account holds this number.
  // .neq('id', user.id) — same user re-verifying their own number is always allowed.
  const { data: existingHolder } = await (admin as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .eq('phone_verified', true)
    .neq('id', user.id)
    .maybeSingle()

  return NextResponse.json({ available: !existingHolder })
}
