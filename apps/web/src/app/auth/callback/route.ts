import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/properties'

  if (code) {
    // Validate redirect path — delegate normalisation to URL parser so encoded
    // backslashes like /%5C don't slip through a string-based blocklist.
    let safePath = '/'
    try {
      const resolved = new URL(decodeURIComponent(next), 'https://x')
      if (
        resolved.origin === 'https://x' &&
        resolved.pathname.startsWith('/') &&
        resolved.pathname !== '/login' &&
        resolved.pathname !== '/register'
      ) {
        safePath = resolved.pathname + resolved.search
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

    console.error(
      '[auth/callback] exchangeCodeForSession failed:',
      error.message,
      '| origin:',
      origin,
    )
    return NextResponse.redirect(
      `${origin}/login?error=auth_failed&detail=${encodeURIComponent(error.message)}`,
    )
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed&detail=no_code`)
}
