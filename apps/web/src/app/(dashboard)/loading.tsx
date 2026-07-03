export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-[var(--color-muted)]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-[var(--color-border)]">
            <div className="aspect-[4/3] animate-pulse bg-[var(--color-muted)]" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-muted)]" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--color-muted)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
