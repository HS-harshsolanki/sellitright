'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    if (!POSTHOG_KEY) return
    // Lazy-load PostHog only when key is configured.
    // Uses a string to avoid a static import that would fail TS if posthog-js is not yet installed.
    const moduleName = 'posthog-js'
    import(/* webpackIgnore: true */ moduleName)
      .then((mod: { default?: unknown }) => {
        const posthog = mod?.default as
          | (typeof window.posthog & { __loaded?: boolean; init?: (k: string, o: object) => void })
          | undefined
        if (!posthog?.init) return
        if (!posthog.__loaded) {
          posthog.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            capture_pageview: false,
            persistence: 'localStorage',
          })
        }
        window.posthog = posthog
      })
      .catch(() => {
        /* posthog-js not installed — silent no-op */
      })
  }, [])

  // Track pageviews on route change
  useEffect(() => {
    if (!POSTHOG_KEY || typeof window === 'undefined' || !window.posthog) return
    window.posthog.capture('$pageview', { $current_url: window.location.href })
  }, [pathname])

  return <>{children}</>
}
