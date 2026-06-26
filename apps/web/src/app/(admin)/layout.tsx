import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-muted)]">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded bg-[var(--color-foreground)] px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">
              Admin
            </span>
            <span className="text-sm font-semibold text-[var(--color-foreground)]">
              SellItRight Panel
            </span>
          </div>
          <Link
            href="/"
            className="text-sm text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
          >
            Back to site
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  )
}
