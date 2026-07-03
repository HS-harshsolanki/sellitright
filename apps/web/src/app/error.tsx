'use client'

import { ErrorScreen } from '@/components/ui/error-screen'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorScreen
      title="Something went wrong"
      message="An unexpected error occurred. Please try again or go back to the home page."
      digest={error.digest}
      reset={reset}
    />
  )
}
