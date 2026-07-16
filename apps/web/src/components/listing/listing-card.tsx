'use client'

import { Camera, ChevronLeft, ChevronRight, Heart, ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

const FAVORITES_KEY = 'sir_favorites'

function getFavorites(): Set<string> {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY)
    return new Set(stored ? (JSON.parse(stored) as string[]) : [])
  } catch {
    return new Set()
  }
}

function toggleFavorite(id: string): boolean {
  const favs = getFavorites()
  if (favs.has(id)) {
    favs.delete(id)
  } else {
    favs.add(id)
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs]))
  return favs.has(id)
}

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
  priorityImage?: boolean
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
  priorityImage = false,
}: ListingCardProps) {
  const [currentImage, setCurrentImage] = useState(0)
  const [isFavorited, setIsFavorited] = useState(() => {
    if (typeof window === 'undefined') return false
    return getFavorites().has(id)
  })
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
    <div className="group relative flex w-full flex-col transition-transform duration-300">
      <Link href={`/listing/${id}`} className="block w-full">
        {/* ── Image area ──────────────────────────────────────────────────────── */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[var(--color-muted)]">
          {images[currentImage] && (
            <Image
              src={images[currentImage].url}
              alt={images[currentImage].caption ?? title}
              fill
              priority={priorityImage}
              loading={priorityImage ? undefined : 'lazy'}
              className="cubic-bezier(0.4, 0, 0.2, 1) object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          )}

          {/* Gradient fade — bottom — anchors overlaid badges */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 100%)' }}
            aria-hidden="true"
          />

          {/* Photo count badge — top-left */}
          {total > 0 && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-md">
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
                className="absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100 sm:flex"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100 sm:flex"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}

          {/* Image dots */}
          {total > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {Array.from({ length: total }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    setCurrentImage(idx)
                  }}
                  aria-label={`View photo ${idx + 1}`}
                  className="flex h-6 min-w-[12px] items-center justify-center"
                >
                  <span
                    className={cn(
                      'block h-1.5 rounded-full transition-all duration-200',
                      idx === currentImage ? 'w-3.5 bg-white' : 'w-1.5 bg-white/60',
                    )}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Verified badge — bottom-left, above gradient */}
          {isVerified && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 shadow-sm backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
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
            const newState = toggleFavorite(id)
            setIsFavorited(newState)
          }}
          aria-label={isFavorited ? 'Remove from favourites' : 'Save to favourites'}
          aria-pressed={isFavorited}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm backdrop-blur-md transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        >
          <Heart
            className={cn(
              'h-3.5 w-3.5 transition-colors duration-200',
              isFavorited ? 'text-[var(--color-accent)]' : 'text-gray-700',
            )}
            style={isFavorited ? { fill: 'var(--color-accent)' } : undefined}
          />
        </button>

        {/* ── Content area ────────────────────────────────────────────────────── */}
        <div className="mt-2.5 px-0.5">
          {/* Location — primary identity */}
          <p className="truncate text-[15px] font-semibold leading-snug text-gray-900">
            {locality}, {city}
          </p>

          {/* Specs inline — clean, modern, no heavy borders/dividers */}
          <p className="mt-0.5 text-[13px] font-medium text-gray-500">
            {formatBHK(bhkType)} &middot; {formatArea(builtUpArea)}
          </p>

          {/* Price — decision-maker */}
          <p className="mt-1 text-base font-bold text-gray-900">{formatPrice(price)}</p>

          {/* Recency — if fresh */}
          {recency && <p className="mt-0.5 text-xs font-normal text-gray-400">{recency}</p>}
        </div>
      </Link>
    </div>
  )
}
