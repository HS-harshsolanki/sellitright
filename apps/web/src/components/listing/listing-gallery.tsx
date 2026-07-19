'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X, LayoutGrid } from 'lucide-react'
import Image from 'next/image'
import { useState, useCallback, useRef, useEffect } from 'react'

import type { MockListingImage } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

interface ListingGalleryProps {
  images: MockListingImage[]
  title: string
}

// ─── Motion variants ──────────────────────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] as const },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] as const },
  }),
}

const lightboxVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.22, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.18, ease: 'easeIn' as const },
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ListingGallery({ images, title }: ListingGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const goTo = useCallback(
    (index: number, dir: number) => {
      setDirection(dir)
      setActiveIndex((index + images.length) % images.length)
    },
    [images.length],
  )

  const prev = useCallback(() => goTo(activeIndex - 1, -1), [activeIndex, goTo])
  const next = useCallback(() => goTo(activeIndex + 1, 1), [activeIndex, goTo])

  const openLightbox = useCallback((index: number) => {
    setActiveIndex(index)
    setLightboxOpen(true)
  }, [])

  const closeLightbox = useCallback(() => setLightboxOpen(false), [])

  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (lightboxOpen) {
      // Auto-focus the dialog so arrow keys work immediately
      dialogRef.current?.focus()
    }
  }, [lightboxOpen])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') prev()
    if (e.key === 'ArrowRight') next()
    if (e.key === 'Escape') closeLightbox()
  }

  const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      closeLightbox()
      return
    }
    if (e.key === 'Tab') {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    if (e.key === 'ArrowLeft') prev()
    if (e.key === 'ArrowRight') next()
  }

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-[var(--color-muted)] md:aspect-auto md:h-[500px]">
        <span className="text-sm text-[var(--color-muted-foreground)]">No images available</span>
      </div>
    )
  }

  // Desktop grid uses first 5 images (1 hero + 4 thumbnails)
  const gridImages = images.slice(0, 5)

  return (
    <>
      {/* ── Mobile: swipe carousel (hidden on md+) ── */}
      <div
        className="relative block md:hidden"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label={`Image gallery for ${title}`}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--color-muted)]">
          <AnimatePresence custom={direction} mode="popLayout">
            <motion.div
              key={activeIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0"
            >
              {images[activeIndex] && (
                <Image
                  src={images[activeIndex].url}
                  alt={images[activeIndex].caption ?? `${title} — photo ${activeIndex + 1}`}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  priority={activeIndex === 0}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Photo count badge — bottom-left, Airbnb style */}
          <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            {activeIndex + 1} / {images.length}
          </div>

          {/* Dot indicators */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i, i > activeIndex ? 1 : -1)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/60',
                  )}
                  aria-label={`Go to image ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Chevron nav on mobile */}
          {images.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--color-foreground)] shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--color-foreground)] shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Desktop: Airbnb 5-image mosaic grid (hidden on mobile) ── */}
      {/*
        Layout: 4 equal columns, 2 rows, fixed 500px height
        - Image 1: col 1–2, row 1–2 (hero, half the width, full height)
        - Image 2: col 3, row 1
        - Image 3: col 4, row 1
        - Image 4: col 3, row 2
        - Image 5: col 4, row 2  ← "Show all" button overlays this cell
      */}
      <div
        className="relative hidden md:block"
        role="region"
        aria-label={`Image gallery for ${title}`}
      >
        <div className="grid h-[500px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-xl">
          {/* Hero image — spans 2 cols × 2 rows */}
          <button
            className="relative col-span-2 row-span-2 overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]"
            onClick={() => openLightbox(0)}
            aria-label={`View photo 1 of ${images.length} — open fullscreen`}
          >
            {gridImages[0] && (
              <Image
                src={gridImages[0].url}
                alt={gridImages[0].caption ?? `${title} — photo 1`}
                fill
                className="object-cover transition duration-300 hover:scale-[1.02]"
                sizes="(max-width: 1280px) 50vw, 520px"
                priority
              />
            )}
          </button>

          {/* Thumbnail cells: positions 1–4 fill the right 2×2 */}
          {[1, 2, 3, 4].map((pos) => {
            const img = gridImages[pos]
            const isLastCell = pos === 4

            if (!img) {
              return (
                <div
                  key={`placeholder-${pos}`}
                  className="rounded-xl bg-[var(--color-muted)]"
                  aria-hidden="true"
                />
              )
            }

            return (
              <button
                key={img.id}
                className="relative overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]"
                onClick={() => openLightbox(pos)}
                aria-label={`View photo ${pos + 1} of ${images.length} — open fullscreen`}
              >
                <Image
                  src={img.url}
                  alt={img.caption ?? `${title} — photo ${pos + 1}`}
                  fill
                  className={cn(
                    'object-cover transition duration-300 hover:scale-[1.02]',
                    isLastCell && images.length > 5 && 'brightness-75',
                  )}
                  sizes="(max-width: 1280px) 25vw, 260px"
                />

                {/* "Show all photos" overlay — only on last visible cell when there are more */}
                {isLastCell && images.length > 5 && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-foreground)] shadow-sm">
                      +{images.length - 5} more
                    </span>
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* "Show all photos" white pill button — absolute bottom-right of the grid */}
        <button
          onClick={() => openLightbox(0)}
          className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-foreground)] shadow-md transition hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        >
          <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          Show all {images.length} photos
        </button>
      </div>

      {/* ── Lightbox overlay ── */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            ref={dialogRef}
            variants={lightboxVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 flex flex-col bg-black/95"
            onClick={closeLightbox}
            onKeyDown={handleDialogKeyDown}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Image lightbox"
          >
            {/* Top bar */}
            <div className="flex shrink-0 items-center justify-between px-4 py-3">
              <div className="text-sm text-white/70">
                {activeIndex + 1} / {images.length}
              </div>
              <button
                onClick={closeLightbox}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Close lightbox"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Image area */}
            <div className="relative flex-1 px-12 py-4" onClick={(e) => e.stopPropagation()}>
              <AnimatePresence custom={direction} mode="popLayout">
                <motion.div
                  key={`lb-${activeIndex}`}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="relative h-full w-full"
                >
                  {images[activeIndex] && (
                    <Image
                      src={images[activeIndex].url}
                      alt={images[activeIndex].caption ?? `${title} — photo ${activeIndex + 1}`}
                      fill
                      className="object-contain"
                      sizes="100vw"
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Nav arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      prev()
                    }}
                    className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      next()
                    }}
                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>

            {/* Caption */}
            {images[activeIndex]?.caption && (
              <div className="shrink-0 pb-5 text-center text-sm text-white/60">
                {images[activeIndex].caption}
              </div>
            )}

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div
                className="hidden shrink-0 items-center justify-center gap-2 overflow-x-auto px-4 pb-4 md:flex"
                onClick={(e) => e.stopPropagation()}
              >
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => goTo(i, i > activeIndex ? 1 : -1)}
                    className={cn(
                      'relative h-14 w-20 shrink-0 overflow-hidden rounded-lg transition',
                      i === activeIndex ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-80',
                    )}
                    aria-label={`Jump to image ${i + 1}`}
                  >
                    <Image
                      src={img.url}
                      alt={img.caption ?? `Thumbnail ${i + 1}`}
                      fill
                      loading="lazy"
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
