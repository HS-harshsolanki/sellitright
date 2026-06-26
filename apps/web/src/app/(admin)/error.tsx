'use client'
import { useEffect } from 'react'
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[admin] error boundary:', error.message) }, [error])
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">An error occurred in the admin panel.</p>
      <button type="button" onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Try again</button>
    </div>
  )
}
