import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded bg-gray-900 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">
              Admin
            </span>
            <span className="text-sm font-semibold text-gray-900">SellItRight Panel</span>
          </div>
          <Link
            href="/"
            className="text-sm text-gray-500 transition-colors hover:text-gray-900"
          >
            Back to site
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  )
}
