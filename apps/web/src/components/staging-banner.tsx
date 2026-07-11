// Shows a non-intrusive banner at the top when running in staging environment
export function StagingBanner() {
  if (process.env.NEXT_PUBLIC_APP_ENV !== 'staging') return null
  return (
    <div className="fixed left-0 right-0 top-0 z-[9999] bg-amber-500 px-4 py-1 text-center text-xs font-semibold text-black">
      🧪 STAGING ENVIRONMENT — Not for public use. Data will be wiped.
    </div>
  )
}
