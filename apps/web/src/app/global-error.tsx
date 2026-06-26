'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
          <p className="text-6xl font-extrabold text-red-500">500</p>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Something went wrong</h1>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            An unexpected error occurred. Our team has been notified.
            {error.digest && (
              <span className="mt-1 block font-mono text-xs text-gray-400">
                Error ID: {error.digest}
              </span>
            )}
          </p>
          <button
            onClick={reset}
            className="mt-8 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
