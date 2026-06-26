'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Bed, Camera, ChevronLeft, ChevronRight, Heart, Maximize2, ShieldCheck } from 'lucide-react'
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
    <div className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-xl">
      <Link href={`/listing/${id}`} className="block p-3">
        {/* ── Image area ──────────────────────────────────────────────────────── */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--color-muted)]">
          {images[currentImage] && (
            <Image
              src={images[currentImage].url}
              alt={images[currentImage].caption ?? title}
              fill
              loading="lazy"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          )}

          {/* Gradient fade — bottom — anchors overlaid badges */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.38) 0%, transparent 100%)' }}
            aria-hidden="true"
          />

          {/* Photo count badge — top-left */}
          {total > 0 && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <Camera className="h-3 w-3" aria-hidden="true" />
              {total}
            </span>
          )}

          {/* Arrow nav — desktop hover */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 opacity-0 shadow-md transition-opacity focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100 sm:flex"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 opacity-0 shadow-md transition-opacity focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100 sm:flex"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}

          {/* Image dots */}
          {total > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
              {Array.from({ length: total }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    setCurrentImage(idx)
                  }}
                  aria-label={`View photo ${idx + 1}`}
                  className="flex h-4 items-center px-0.5"
                >
                  <span
                    className={cn(
                      'block h-1.5 rounded-full transition-all duration-200',
                      idx === currentImage ? 'w-3.5 bg-white' : 'w-1.5 bg-white/55',
                    )}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Verified badge — bottom-left, above gradient */}
          {isVerified && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-gray-900 shadow-sm backdrop-blur-sm">
              <ShieldCheck className="h-3 w-3 text-emerald-600" aria-hidden="true" />
              Verified
            </span>
          )}
        </div>

        {/* ── Heart — top-right of image ──────────────────────────────────────── */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsFavorited((f) => !f)
          }}
          aria-label={isFavorited ? 'Remove from favourites' : 'Save to favourites'}
          aria-pressed={isFavorited}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        >
          <Heart
            className={cn(
              'h-3.5 w-3.5 transition-colors duration-200',
              isFavorited ? 'text-[var(--color-accent)]' : 'text-gray-600',
            )}
            style={isFavorited ? { fill: 'var(--color-accent)' } : undefined}
          />
        </button>

        {/* ── Content area ────────────────────────────────────────────────────── */}
        <div className="mt-2 px-1">
          {/* Location — primary identity, deserves prominence */}
          <p className="truncate text-[15px] font-semibold leading-snug text-[var(--color-foreground)]">
            {locality}, {city}
          </p>

          {/* Specs with icons — scanned 60k× faster than text-only */}
          <div className="mt-1.5 flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
            <span className="inline-flex items-center gap-1">
              <Bed className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              {formatBHK(bhkType)}
            </span>
            <span className="text-[var(--color-border)]" aria-hidden="true">
              |
            </span>
            <span className="inline-flex items-center gap-1">
              <Maximize2 className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              {formatArea(builtUpArea)}
            </span>
          </div>

          {/* Divider — visual breathing room before price */}
          <div className="mb-2.5 mt-3 h-px bg-[var(--color-border)]" aria-hidden="true" />

          {/* Price — the decision-maker, must command the eye */}
          <p className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            {formatPrice(price)}
          </p>

          {/* Recency — only when fresh, otherwise silence */}
          {recency && (
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{recency}</p>
          )}
        </div>
      </Link>
    </div>
  )
}
