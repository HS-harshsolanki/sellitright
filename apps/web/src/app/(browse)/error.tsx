'use client'

import { ErrorScreen } from '@/components/ui/error-screen'

export default function BrowseError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorScreen
      title="Failed to load listings"
      message="We couldn't load the property listings. Please try again."
      digest={error.digest}
      reset={reset}
    />
  )
}
