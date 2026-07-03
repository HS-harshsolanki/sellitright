import { createServerClient } from '@supabase/ssr'
import { SupabaseClient, createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import type { Database } from '@/lib/supabase/database.types'

export async function createClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing required env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.',
    )
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Server Component — cookies can only be set in Server Actions or Route Handlers
          }
        },
      },
    },
  )
}

/**
 * Service-role client — bypasses RLS. Use ONLY in server-side admin routes.
 * Never expose this client to the browser.
 * Returns null when SUPABASE_SERVICE_ROLE_KEY is not set (demo / dev mode).
 */
let _serviceClient: SupabaseClient<Database> | null = null

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.warn(
      '[supabase] createServiceClient: SUPABASE_SERVICE_ROLE_KEY is not set — admin routes will fall back to mock data. Add it to .env.local.',
    )
    return null
  }

  if (!_serviceClient) {
    _serviceClient = createSupabaseClient<Database>(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return _serviceClient
}
