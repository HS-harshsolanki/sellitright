import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://chapternew.com'

  // Block all crawlers on staging to prevent accidental indexing
  if (process.env.NEXT_PUBLIC_APP_ENV === 'staging') {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/dashboard/', '/sell/', '/api/'],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  }
}
