import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

import { CookieConsent } from '@/components/cookie-consent'

import { Providers } from './providers'

import './globals.css'

const satoshi = localFont({
  src: [
    { path: '../../public/fonts/Satoshi-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/Satoshi-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/Satoshi-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-satoshi',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#222222',
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://chapternew.com'),
  title: {
    default: 'ChapterNew — Find Your Next Place in Life',
    template: '%s | ChapterNew',
  },
  description:
    'Find verified properties across India. Buy directly from owners with zero broker fees. Browse apartments, villas, and houses — only genuine listings.',
  keywords: [
    'property for sale India',
    'flat for sale no broker',
    'buy apartment directly from owner',
    'real estate India no brokerage',
    'verified property listings',
  ],
  authors: [{ name: 'ChapterNew' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ChapterNew',
  },
  formatDetection: {
    telephone: true,
    email: false,
    address: false,
  },
  openGraph: {
    title: 'ChapterNew — Find Your Next Place in Life',
    description:
      'Find verified properties across India. Buy directly from owners with zero broker fees.',
    type: 'website',
    locale: 'en_IN',
    siteName: 'ChapterNew',
    url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://chapternew.com',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'ChapterNew — Find your next place',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChapterNew — Find Your Next Place in Life',
    description: 'Verified properties. Zero broker fees. Connect directly with owners.',
    site: '@chapternew',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={satoshi.variable}>
      <body className="bg-background min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
        <CookieConsent />
      </body>
    </html>
  )
}
