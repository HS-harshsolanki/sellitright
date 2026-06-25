'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SupabaseAuthProvider } from '@/lib/supabase/auth-context'
import { ErrorBoundary } from '@/components/error-boundary'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <ErrorBoundary>
      <SupabaseAuthProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </SupabaseAuthProvider>
    </ErrorBoundary>
  )
}
