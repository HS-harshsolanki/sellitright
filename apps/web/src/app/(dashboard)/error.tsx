'use client'

import { ErrorScreen } from '@/components/ui/error-screen'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorScreen
      title="Dashboard error"
      message="We couldn't load your dashboard. Please try again."
      digest={error.digest}
      reset={reset}
      homeHref="/dashboard"
    />
  )
}
