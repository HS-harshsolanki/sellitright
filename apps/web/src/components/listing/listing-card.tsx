'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Heart, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { formatPrice, formatBHK, formatArea } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ListingCardProps {
  id: string
  title: string
  price: number
  images: { url: string; caption: string | null }[]
  locality: string
  city: string
  bhkType: string
  builtUpArea: number
  furnishing: string
  floor: number | null
  totalFloors: number | null
  isVerified: boolean
  createdAt: string
  viewCount: number
  ageOfProperty?: number | null
}

function daysAgo(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
}

function recencyText(days: number): string | null {
  if (days === 0) return 'Posted today'
  if (days === 1) return 'Posted yesterday'
  if (days < 7) return `Posted ${days} days ago`
  return null
}

export function ListingCard({
  id,
  title,
  price,
  images,
  locality,
  city,
  bhkType,
  builtUpArea,
  isVerified,
  createdAt,
}: ListingCardProps) {
  const [currentImage, setCurrentImage] = useState(0)
  const [isFavorited, setIsFavorited] = useState(false)
  const total = Math.min(images.length, 5)

  const prev = (e: React.MouseEvent) => {
    e.preventDefault()
    setCurrentImage((i) => (i - 1 + total) % total)
  }

  const next = (e: React.MouseEvent) => {
    e.preventDefault()
    setCurrentImage((i) => (i + 1) % total)
  }

  const days = daysAgo(createdAt)
  const recency = recencyText(days)

  return (
    <div className="group relative overflow-hidden rounded-xl bg-white hover:shadow-lg transition-shadow duration-300">
      <Link href={`/listing/${id}`} className="block">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-muted)]">
          {images[currentImage] && (
            <Image
              src={images[currentImage].url}
              alt={images[currentImage].caption ?? title}
              fill
              loading="lazy"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          )}

          {/* Arrows — desktop hover only */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 -translate-y-1/2 hidden h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none sm:flex"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 -translate-y-1/2 hidden h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none sm:flex"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}

          {/* Dots */}
          {total > 1 && (
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
              {Array.from({ length: total }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => { e.preventDefault(); setCurrentImage(idx) }}
                  aria-label={`View photo ${idx + 1}`}
                  className="h-4 flex items-center px-0.5"
                >
                  <span
                    className={cn(
                      'block h-1.5 rounded-full transition-all',
                      idx === currentImage ? 'w-3.5 bg-white' : 'w-1.5 bg-white/60',
                    )}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Single badge: Verified (only trust signal that matters at browse level) */}
          {isVerified && (
            <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-xs font-medium text-gray-900 shadow-sm backdrop-blur-sm">
              <ShieldCheck className="h-3 w-3 text-emerald-600" aria-hidden="true" />
              Verified
            </span>
          )}
        </div>

        {/* Content — 5 info units: location, specs, price, differentiator, recency */}
        <div className="px-1 pt-3 pb-2">
          {/* Location */}
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            {locality}, {city}
          </p>

          {/* Key stats */}
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            {formatBHK(bhkType)} · {formatArea(builtUpArea)}
          </p>

          {/* Price + platform differentiator */}
          <p className="mt-1.5 text-base font-semibold text-[var(--color-foreground)]">
            {formatPrice(price)}
            <span className="ml-1.5 text-xs font-normal text-[var(--color-muted-foreground)]">
              · No brokerage
            </span>
          </p>

          {/* Recency — only when fresh (< 7 days). Silence is fine for older listings. */}
          {recency && (
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{recency}</p>
          )}
        </div>
      </Link>

      {/* Heart */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsFavorited((f) => !f) }}
        aria-label={isFavorited ? 'Remove from favourites' : 'Save to favourites'}
        aria-pressed={isFavorited}
        className="absolute top-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
      >
        <Heart
          className={cn(
            'h-4 w-4 transition-colors',
            isFavorited ? 'text-[var(--color-accent)]' : 'text-gray-600',
          )}
          style={isFavorited ? { fill: 'var(--color-accent)' } : undefined}
        />
      </button>
    </div>
  )
}
