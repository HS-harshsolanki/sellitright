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
      // Validate redirect — reject open redirects, protocol-relative URLs, auth loops
      let safePath = '/'
      try {
        const decoded = decodeURIComponent(next)
        if (
          decoded.startsWith('/') &&
          !decoded.startsWith('//') &&
          !decoded.includes('://') &&
          !decoded.includes('@') &&
          !decoded.includes('\n') &&
          !decoded.includes('\r') &&
          decoded !== '/login' &&
          decoded !== '/register'
        ) {
          safePath = decoded
        }
      } catch {
        // malformed encoding — keep '/'
      }
      return NextResponse.redirect(`${origin}${safePath}`)
    }

    // Code exchange failed — likely redirect URL mismatch in Supabase dashboard
    console.error(
      '[auth/callback] exchangeCodeForSession failed:',
      error.message,
      '| origin:',
      origin,
    )
  }

  // No code or exchange failed — redirect to login with error hint
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
