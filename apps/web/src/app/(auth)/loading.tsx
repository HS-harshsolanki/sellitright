export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4 px-4">
        <div className="mx-auto h-8 w-32 animate-pulse rounded-lg bg-[var(--color-muted)]" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-[var(--color-muted)]" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-[var(--color-muted)]" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-[var(--color-muted)]" />
      </div>
    </div>
  )
}
