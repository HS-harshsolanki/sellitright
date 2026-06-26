import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    // Skip optimization in dev — avoids SSL cert issues when proxying external images locally
    unoptimized: process.env.NODE_ENV === 'development',
  },
}

export default nextConfig
