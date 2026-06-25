import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

const bodySchema = z.object({
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Must be a valid Indian mobile number with +91 prefix'),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { phone } = parsed.data

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        },
      },
    },
  )

  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { channel: 'sms' },
  })

  if (error) {
    console.error('[send-otp] error:', error.message)
    return NextResponse.json({ error: 'Failed to send OTP. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
