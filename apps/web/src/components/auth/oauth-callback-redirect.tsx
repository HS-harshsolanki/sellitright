'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// If the Supabase dashboard Site URL is set to chapternew.com/ and the OAuth
// redirect lands here instead of /auth/callback, forward it client-side so
// that browser cookies (PKCE code verifier) are preserved in the request.
export function OAuthCallbackRedirect({ code, next }: { code: string; next?: string }) {
  const router = useRouter()

  useEffect(() => {
    const qs = new URLSearchParams({ code })
    if (next) qs.set('next', next)
    router.replace(`/auth/callback?${qs.toString()}`)
  }, [code, next, router])

  return null
}
