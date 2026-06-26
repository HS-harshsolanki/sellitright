'use client'

import { ErrorScreen } from '@/components/ui/error-screen'

export default function SellError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorScreen
      title="Listing form error"
      message="Something went wrong with the listing form. Your draft has been saved — you can safely try again."
      digest={error.digest}
      reset={reset}
      homeHref="/sell"
    />
  )
}
