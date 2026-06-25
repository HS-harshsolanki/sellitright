import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Redirect to the intended destination (or home)
      const redirectTo = next.startsWith('/') ? next : '/'
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  // Auth error — redirect to login with error hint
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
