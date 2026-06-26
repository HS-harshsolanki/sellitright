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
      // Guard against open redirects (//evil.com) and auth loops
      const safePath =
        next.startsWith('/') && !next.startsWith('//') && next !== '/login'
          ? next
          : '/'
      return NextResponse.redirect(`${origin}${safePath}`)
    }

    // Code exchange failed — likely redirect URL mismatch in Supabase dashboard
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message, '| origin:', origin)
  }

  // No code or exchange failed — redirect to login with error hint
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
