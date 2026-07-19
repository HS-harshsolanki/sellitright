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

    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) setAuthError(error)
        setSession(session)
        setUser(session?.user ?? null)
      })
      .finally(() => {
        setLoading(false)
      })

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
