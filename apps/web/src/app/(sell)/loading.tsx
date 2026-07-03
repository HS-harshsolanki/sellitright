export default function SellLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 h-2 w-full animate-pulse rounded-full bg-[var(--color-muted)]" />
      <div className="space-y-4">
        <div className="h-10 w-full animate-pulse rounded-xl bg-[var(--color-muted)]" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-[var(--color-muted)]" />
        <div className="h-10 w-2/3 animate-pulse rounded-xl bg-[var(--color-muted)]" />
      </div>
    </div>
  )
}
