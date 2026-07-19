import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// /api/admin is intentionally excluded — those routes use key-based auth (x-admin-key),
// not session auth. Middleware redirects would bypass the isAuthorized() check entirely.
const PROTECTED_PATHS = [
  '/dashboard',
  '/sell',
  '/admin',
  '/profile',
  '/messages',
  '/notifications',
  '/requests',
  '/listings', // covers /listings/[id]/edit and other sub-paths
]

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function isSupabaseConfigured() {
  return (
    (SUPABASE_URL.startsWith('https://') || SUPABASE_URL.startsWith('http://localhost')) &&
    !SUPABASE_URL.includes('<your-project-ref>') &&
    SUPABASE_ANON_KEY.length > 20 &&
    !SUPABASE_ANON_KEY.includes('<your-anon-key>')
  )
}

function sanitiseNext(raw: string): string {
  try {
    // Delegate normalisation to the URL parser — catches encoded backslashes
    // like /%5C that blocklist string checks miss.
    const resolved = new URL(decodeURIComponent(raw), 'https://x')
    if (
      resolved.origin === 'https://x' &&
      resolved.pathname.startsWith('/') &&
      resolved.pathname !== '/login' &&
      resolved.pathname !== '/register'
    ) {
      return resolved.pathname + resolved.search
    }
  } catch {
    // malformed encoding — reject
  }
  return '/'
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // The auth callback route exchanges the PKCE code for a session — it must
  // run before any Supabase auth call touches the code-verifier cookie.
  // Passing through here lets the route handler do the exchange cleanly.
  if (pathname === '/auth/callback') {
    return NextResponse.next({ request })
  }

  // Skip auth enforcement when Supabase is not yet configured (local dev before setup)
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  // Refresh session — do NOT remove; required for Server Components to read auth state
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError) console.warn('[middleware] auth error:', authError.message)

  // Copy refreshed session cookies onto any redirect we create.
  // If we return a bare NextResponse.redirect(), the Set-Cookie headers that
  // supabase.auth.getUser() wrote onto supabaseResponse are silently dropped,
  // causing the "login twice" symptom.
  function redirectWithCookies(to: URL): NextResponse {
    const res = NextResponse.redirect(to)
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value, c))
    return res
  }

  // Redirect unauthenticated users away from protected routes
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('next', pathname)
    return redirectWithCookies(redirectUrl)
  }

  // Redirect authenticated users away from login/register
  if (user && (pathname === '/login' || pathname === '/register')) {
    const raw = request.nextUrl.searchParams.get('next') ?? '/properties'
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = sanitiseNext(raw)
    redirectUrl.search = ''
    return redirectWithCookies(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
