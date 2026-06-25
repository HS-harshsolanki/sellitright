'use client'

import { cn } from '@/lib/utils'
import { useSellFormStore } from '@/stores/sell-form.store'
import { ImagePlus, Link, Trash2, X } from 'lucide-react'
import { useRef, useState } from 'react'

const MAX_PHOTOS = 5

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function StepPhotos() {
  const { photos, setPhotos } = useSellFormStore()
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const canAdd = photos.length < MAX_PHOTOS

  function handleAdd() {
    const trimmed = inputValue.trim()
    if (!trimmed) {
      setInputError('Paste an image URL above first')
      return
    }
    if (!isValidUrl(trimmed)) {
      setInputError('Enter a valid URL starting with https://')
      return
    }
    if (photos.includes(trimmed)) {
      setInputError('This URL has already been added')
      return
    }
    setPhotos([...photos, trimmed])
    setInputValue('')
    setInputError(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  function handleRemove(url: string) {
    setPhotos(photos.filter((p) => p !== url))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Add photos of your property
        </h2>
        <p className="text-muted-foreground">
          Listings with great photos get{' '}
          <span className="font-medium text-foreground">3x more enquiries</span>.
          Paste image URLs or skip for now — you can add them later.
        </p>
      </div>

      {/* URL input row */}
      <div className="space-y-2">
        <label htmlFor="photo-url" className="block text-sm font-medium text-foreground">
          Image URL{' '}
          <span className="font-normal text-muted-foreground">
            (Unsplash, Cloudinary, etc.)
          </span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="photo-url"
              ref={inputRef}
              type="url"
              inputMode="url"
              placeholder="https://images.unsplash.com/…"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                if (inputError) setInputError(null)
              }}
              onKeyDown={handleKeyDown}
              disabled={!canAdd}
              aria-invalid={inputError ? 'true' : undefined}
              aria-describedby={inputError ? 'photo-url-error' : undefined}
              className={cn(
                'w-full rounded-lg border bg-white py-3 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground',
                'transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
                inputError
                  ? 'border-destructive focus:border-destructive'
                  : 'border-border focus:border-primary',
                !canAdd && 'cursor-not-allowed opacity-50',
              )}
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            aria-label="Add image URL"
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-3 text-sm font-semibold transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              canAdd
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'cursor-not-allowed bg-muted text-muted-foreground',
            )}
          >
            <ImagePlus className="h-4 w-4" />
            Add
          </button>
        </div>
        {inputError && (
          <p id="photo-url-error" role="alert" className="text-xs text-destructive">
            {inputError}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {photos.length}/{MAX_PHOTOS} photos added — press Enter or click Add
        </p>
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            The first photo will be the cover image shown in search results.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((url, index) => (
              <div
                key={url}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Property photo ${index + 1}`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    // Show broken-image placeholder on load failure
                    const target = e.currentTarget
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent && !parent.querySelector('[data-broken]')) {
                      const fallback = document.createElement('div')
                      fallback.setAttribute('data-broken', '1')
                      fallback.className =
                        'flex h-full w-full flex-col items-center justify-center gap-1 bg-muted text-muted-foreground'
                      fallback.innerHTML =
                        '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><p class="text-xs">Failed to load</p>'
                      parent.appendChild(fallback)
                    }
                  }}
                />
                {index === 0 && (
                  <div className="absolute left-2 top-2 rounded-md bg-foreground/80 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                    Cover
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(url)}
                  aria-label={`Remove photo ${index + 1}`}
                  className={cn(
                    'absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full',
                    'bg-destructive/90 text-white opacity-0 backdrop-blur-sm transition-opacity',
                    'group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state hint */}
      {photos.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/30 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <X className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No photos yet</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Paste a URL above, or skip this step and add photos later.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
