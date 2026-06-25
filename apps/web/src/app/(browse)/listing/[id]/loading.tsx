export default function ListingDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl">
      {/* Image skeleton */}
      <div className="aspect-[16/9] w-full animate-pulse bg-gray-200 md:aspect-[21/9]" />

      <div className="px-4 py-6 lg:flex lg:gap-8">
        <div className="flex-1">
          {/* Price */}
          <div className="h-8 w-32 animate-pulse rounded-lg bg-gray-200" />
          {/* Title */}
          <div className="mt-3 h-6 w-64 animate-pulse rounded bg-gray-100" />

          {/* Highlights grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>

          {/* Description */}
          <div className="mt-6 space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-3/5 animate-pulse rounded bg-gray-100" />
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="mt-6 lg:mt-0 lg:w-80">
          <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
        </div>
      </div>
    </div>
  )
}
