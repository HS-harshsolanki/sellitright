import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    // Validate redirect path before building the response
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

    // Build the redirect response first, then write session cookies directly onto it.
    // NextResponse.redirect() creates a new response object — if we call
    // exchangeCodeForSession via the shared cookieStore and then return a separate
    // NextResponse.redirect(), the Set-Cookie headers are dropped and the browser
    // never receives the session. Writing cookies onto the response object itself
    // ensures they are included in the redirect response.
    const response = NextResponse.redirect(`${origin}${safePath}`)

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
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      },
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return response
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
