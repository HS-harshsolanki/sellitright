import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#222222',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://sellitright.in'),
  title: {
    default: 'SellItRight — Buy Property Directly from Owners',
    template: '%s | SellItRight',
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
  authors: [{ name: 'SellItRight' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SellItRight',
  },
  formatDetection: {
    telephone: true,
    email: false,
    address: false,
  },
  openGraph: {
    title: 'SellItRight — Buy Property Directly from Owners',
    description:
      'Find verified properties across India. Buy directly from owners with zero broker fees.',
    type: 'website',
    locale: 'en_IN',
    siteName: 'SellItRight',
    url: 'https://sellitright.in',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SellItRight — Buy Property Directly from Owners',
    description: 'Verified properties. Zero broker fees. Connect directly with owners.',
    site: '@sellitright',
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
    <html lang="en" className={inter.variable}>
      <body className="bg-background min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
