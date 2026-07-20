'use client'

import type { AuthError, Session, User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  authError: AuthError | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: false,
  authError: null,
  signOut: async () => {},
})

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured())
  const [authError, setAuthError] = useState<AuthError | null>(null)

  useEffect(() => {
    // Skip if Supabase is not configured (placeholder env vars)
    if (!isSupabaseConfigured()) return

    const supabase = createClient()

    // Use refreshSession instead of getSession so the very first user value
    // reflects the latest server-side metadata (e.g. phone_verified: true).
    // getSession() returns the stale cached JWT which may not have phone_verified
    // set, causing the phone-verification banner to flash on every profile load
    // for users who have already verified their phone number.
    // refreshSession gets a fresh JWT from the server so phone_verified and
    // other metadata changes are reflected immediately. Falls back to getSession
    // when there is no active session (logged-out users).
    const initAuth = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession()
      if (error) {
        const {
          data: { session: fallback },
          error: e,
        } = await supabase.auth.getSession()
        if (e) setAuthError(e)
        setSession(fallback)
        setUser(fallback?.user ?? null)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
      }
      setLoading(false)
    }
    void initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (event === 'SIGNED_OUT') {
        // Supabase fires SIGNED_OUT after a failed token refresh — redirect so
        // the user is not stuck in a state where they appear logged-in but every
        // mutation returns 401.
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, authError, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
