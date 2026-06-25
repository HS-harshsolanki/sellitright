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
  themeColor: '#2563EB',
}

export const metadata: Metadata = {
  title: 'SellItRight - Find Your Perfect Home',
  description:
    'Browse thousands of verified flat listings across India. Find apartments, villas, and independent houses for sale — directly from owners, no brokerage.',
  keywords: ['flat for sale', 'property in India', 'buy apartment', 'real estate India', 'no brokerage'],
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
    title: 'SellItRight - Find Your Perfect Home',
    description:
      'Browse thousands of verified flat listings across India. Find apartments, villas, and independent houses for sale — directly from owners, no brokerage.',
    type: 'website',
    locale: 'en_IN',
    siteName: 'SellItRight',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SellItRight - Find Your Perfect Home',
    description: 'Browse verified flat listings across India. Buy directly from owners.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
