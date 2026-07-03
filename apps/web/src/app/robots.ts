import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/dashboard/', '/sell/', '/api/'],
      },
    ],
    sitemap: 'https://chapternew.com/sitemap.xml',
  }
}
