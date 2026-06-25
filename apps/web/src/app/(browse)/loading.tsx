export default function BrowseLoading() {
  return (
    <div>
      {/* Hero skeleton */}
      <section className="border-b border-gray-100 px-4 py-8 md:py-12">
        <div className="mx-auto max-w-7xl text-center">
          <div className="mx-auto h-8 w-64 animate-pulse rounded-lg bg-gray-200" />
          <div className="mx-auto mt-3 h-4 w-96 animate-pulse rounded bg-gray-100" />
          <div className="mx-auto mt-6 h-14 w-full max-w-xl animate-pulse rounded-full bg-gray-100" />
        </div>
      </section>

      {/* Grid skeleton */}
      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-20 animate-pulse rounded-full bg-gray-100" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-gray-100">
              <div className="aspect-[4/3] animate-pulse bg-gray-200" />
              <div className="p-3">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
                <div className="mt-2 h-5 w-48 animate-pulse rounded bg-gray-100" />
                <div className="mt-2 h-4 w-32 animate-pulse rounded bg-gray-100" />
                <div className="mt-3 h-6 w-20 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
