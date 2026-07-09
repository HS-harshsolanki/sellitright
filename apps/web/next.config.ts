import type { NextConfig } from 'next'

const securityHeaders = [
  // HSTS only in production — sending this from a dev server causes browsers to
  // cache "must use HTTPS" for the LAN IP, breaking http://192.168.x.x testing.
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Firebase SDK + reCAPTCHA scripts served from gstatic.com
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://cdn.razorpay.com https://www.gstatic.com https://www.google.com https://apis.google.com",
      // Firebase Auth API + reCAPTCHA verification endpoints
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://lumberjack.razorpay.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://www.google.com https://recaptchaenterprise.googleapis.com https://*.googleapis.com http://localhost:9099 http://127.0.0.1:9099 http://192.168.1.5:9099",
      "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://images.unsplash.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      // Firebase reCAPTCHA renders an invisible iframe from firebaseapp.com + google.com
      `frame-src https://api.razorpay.com https://checkout.razorpay.com https://www.google.com https://recaptcha.google.com${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? ` https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com` : ''}`,
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compiler: { removeConsole: { exclude: ['error'] } },
  // firebase-admin uses Node.js built-ins — must not be bundled by webpack
  serverExternalPackages: ['firebase-admin'],
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      'framer-motion',
    ],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
