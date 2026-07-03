'use client'

import { ErrorScreen } from '@/components/ui/error-screen'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorScreen
      title="Authentication error"
      message="Something went wrong during sign-in. Please try again."
      digest={error.digest}
      reset={reset}
      homeHref="/login"
    />
  )
}
