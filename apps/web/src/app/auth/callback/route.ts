import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Validate redirect target — reject open redirects
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

  if (code) {
    // Build the redirect response first so we can write cookies directly onto it.
    // If we used next/headers cookieStore instead, the Set-Cookie headers would be
    // written to an internal store that never makes it onto the NextResponse object.
    const redirectUrl = `${origin}${safePath}`
    const response = NextResponse.redirect(redirectUrl)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return (
              request.headers
                .get('cookie')
                ?.split(';')
                .map((c) => {
                  const [rawName, ...rest] = c.trim().split('=')
                  return { name: (rawName ?? '').trim(), value: rest.join('=') }
                }) ?? []
            )
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, {
                ...options,
                secure: process.env.NODE_ENV === 'production' ? (options?.secure ?? true) : false,
              })
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
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
