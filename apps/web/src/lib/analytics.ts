// Lightweight analytics wrapper.
// On Vercel deployments: @vercel/analytics handles this automatically.
// On Fly.io (staging/production): Use PostHog if NEXT_PUBLIC_POSTHOG_KEY is set.
// Gracefully no-ops if PostHog is not configured.

export type AnalyticsEvent =
  | 'signup'
  | 'otp_success'
  | 'otp_failure'
  | 'listing_created'
  | 'buyer_request'
  | 'seller_accepted'
  | 'seller_declined'
  | 'message_sent'
  | 'payment_started'
  | 'payment_completed'
  | 'contact_unlocked'
  | 'listing_sold'
  | 'listing_viewed'
  | 'search_performed'
  | 'beta_access_granted'

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void
      identify: (id: string, properties?: Record<string, unknown>) => void
    }
  }
}

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  // PostHog
  if (window.posthog?.capture) {
    window.posthog.capture(event, {
      ...properties,
      app_env: process.env.NEXT_PUBLIC_APP_ENV ?? 'production',
    })
  }
}

export function identify(userId: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  if (window.posthog?.identify) {
    window.posthog.identify(userId, properties)
  }
}
