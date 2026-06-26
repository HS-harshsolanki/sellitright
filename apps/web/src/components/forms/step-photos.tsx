'use client'

import { cn } from '@/lib/utils'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { useSellFormStore } from '@/stores/sell-form.store'
import { ImagePlus, Link, Trash2, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'

const MAX_PHOTOS = 10
const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

interface FileUploadState {
  file: File
  progress: number | null
  error: string | null
}

export function StepPhotos() {
  const { photos, setPhotos } = useSellFormStore()
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [uploadStates, setUploadStates] = useState<FileUploadState[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabaseEnabled = isSupabaseConfigured()
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

  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
      return `"${file.name}" is not a supported format. Use JPEG, PNG, or WebP.`
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `"${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit.`
    }
    return null
  }

  async function uploadFile(file: File, index: number): Promise<void> {
    const updateState = (patch: Partial<FileUploadState>) =>
      setUploadStates((prev) =>
        prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
      )

    try {
      updateState({ progress: 0, error: null })

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload/photo', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json() as { url?: string; error?: string }

      if (!res.ok || !json.url) {
        updateState({ progress: null, error: json.error ?? 'Upload failed.' })
        return
      }

      updateState({ progress: 100 })
      setPhotos([...useSellFormStore.getState().photos, json.url])

      setTimeout(() => {
        setUploadStates((prev) => prev.filter((_, i) => i !== index))
      }, 1500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      updateState({ progress: null, error: `Upload failed: ${message}` })
    }
  }

  async function processFiles(files: FileList | File[]) {
    const fileArray = Array.from(files)
    const remaining = MAX_PHOTOS - photos.length

    if (remaining <= 0) return

    const toProcess = fileArray.slice(0, remaining)
    const newStates: FileUploadState[] = toProcess.map((file) => {
      const error = validateFile(file)
      return { file, progress: null, error }
    })

    const startIndex = uploadStates.length
    setUploadStates((prev) => [...prev, ...newStates])

    for (let i = 0; i < toProcess.length; i++) {
      if (!newStates[i]?.error) {
        await uploadFile(toProcess[i]!, startIndex + i)
      }
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      void processFiles(e.target.files)
      e.target.value = ''
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      void processFiles(e.dataTransfer.files)
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function dismissUploadError(index: number) {
    setUploadStates((prev) => prev.filter((_, i) => i !== index))
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
          Upload photos or paste image URLs — you can also skip for now.
        </p>
      </div>

      {/* File upload zone or disabled notice */}
      {supabaseEnabled ? (
        <div className="space-y-3">
          <div
            role="button"
            tabIndex={canAdd ? 0 : -1}
            aria-label="Upload photos by clicking or dragging files here"
            onClick={() => canAdd && fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                if (canAdd) fileInputRef.current?.click()
              }
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed py-10 text-center transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50',
              !canAdd && 'cursor-not-allowed opacity-50',
            )}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                JPEG, PNG, WebP — max {MAX_FILE_SIZE_MB}MB per file
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            multiple
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
            onChange={handleFileChange}
            disabled={!canAdd}
          />

          {/* Per-file upload progress/errors */}
          {uploadStates.length > 0 && (
            <ul className="space-y-2">
              {uploadStates.map((state, i) => (
                <li
                  key={`${state.file.name}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="truncate text-foreground">{state.file.name}</span>
                  {state.error ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-destructive">{state.error}</span>
                      <button
                        type="button"
                        onClick={() => dismissUploadError(i)}
                        aria-label="Dismiss error"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : state.progress === 100 ? (
                    <span className="shrink-0 text-xs font-medium text-green-600">Done</span>
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {state.progress !== null ? `${state.progress}%` : 'Uploading...'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          File upload requires Supabase Storage. Paste a URL instead.
        </div>
      )}

      {/* URL input row */}
      <div className="space-y-2">
        <label htmlFor="photo-url" className="block text-sm font-medium text-foreground">
          {supabaseEnabled ? (
            <>
              Or paste an image URL{' '}
              <span className="font-normal text-muted-foreground">(Unsplash, Cloudinary, etc.)</span>
            </>
          ) : (
            <>
              Image URL{' '}
              <span className="font-normal text-muted-foreground">(Unsplash, Cloudinary, etc.)</span>
            </>
          )}
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
      {photos.length === 0 && uploadStates.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/30 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <X className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No photos yet</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {supabaseEnabled
                ? 'Upload files above, paste a URL, or skip this step and add photos later.'
                : 'Paste a URL above, or skip this step and add photos later.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
