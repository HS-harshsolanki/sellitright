'use client'

import {
  CheckCircle2,
  ImageIcon,
  ImagePlus,
  Link,
  Loader2,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useRef, useState } from 'react'

import { isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useSellFormStore } from '@/stores/sell-form.store'

const MAX_PHOTOS = 10
const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

const TIPS = [
  {
    title: 'Use natural light',
    description: 'Open curtains and shoot during the day.',
  },
  {
    title: 'Declutter spaces',
    description: 'Keep rooms clean and organized.',
  },
  {
    title: 'Capture all key areas',
    description: 'Show every important space.',
  },
  {
    title: 'Use a wide-angle',
    description: 'Helps show more of the room.',
  },
  {
    title: 'Focus & steady shots',
    description: 'Clear and sharp photos build trust.',
  },
]

function formatFileSize(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
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
  const isUploading = uploadStates.some((s) => s.progress !== null && s.progress < 100 && !s.error)

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

  function handleSetCover(url: string) {
    setPhotos([url, ...photos.filter((p) => p !== url)])
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
      setUploadStates((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))

    try {
      updateState({ progress: 0, error: null })

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload/photo', {
        method: 'POST',
        body: formData,
      })

      const json = (await res.json()) as { url?: string; error?: string }

      if (!res.ok || !json.url) {
        updateState({ progress: null, error: json.error ?? 'Upload failed.' })
        return
      }

      updateState({ progress: 100 })
      useSellFormStore.setState((s) => ({ photos: [...s.photos, json.url!] }))

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

    await Promise.all(
      toProcess.map((file, i) => {
        if (newStates[i]?.error) return Promise.resolve()
        return uploadFile(file, startIndex + i)
      }),
    )
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
      {/* Two-column layout: main content + sidebar */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        {/* Left: heading, upload zone, file progress, URL input */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* Heading block */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                <ImageIcon className="text-primary h-4 w-4" aria-hidden="true" />
              </div>
              <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                Add photos of your property
              </h2>
            </div>
            <p className="text-muted-foreground text-base">
              Good photos help buyers imagine living here.
            </p>
            <p className="text-muted-foreground text-sm">
              Listings with clear, well-lit photos usually receive significantly more enquiries.
            </p>
          </div>

          {/* File upload zone or disabled notice */}
          {supabaseEnabled ? (
            <div className="space-y-3">
              <div
                role="button"
                tabIndex={canAdd && !isUploading ? 0 : -1}
                aria-label="Upload photos by clicking or dragging files here"
                onClick={() => canAdd && !isUploading && fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (canAdd && !isUploading) fileInputRef.current?.click()
                  }
                }}
                onDrop={(e) => {
                  if (!isUploading) handleDrop(e)
                }}
                onDragOver={(e) => {
                  if (!isUploading) handleDragOver(e)
                }}
                onDragLeave={handleDragLeave}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed py-12 text-center transition-colors',
                  'focus-visible:ring-ring bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30',
                  (!canAdd || isUploading) && 'cursor-not-allowed opacity-50',
                )}
              >
                <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
                  <Upload className="text-primary h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-foreground text-sm font-semibold">
                    {isDragging ? 'Drop files here' : 'Drag and drop photos here'}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    or click to browse from your device
                  </p>
                  <p className="text-muted-foreground text-xs">
                    JPG, PNG, WebP&nbsp;&nbsp;•&nbsp;&nbsp;Max {MAX_FILE_SIZE_MB}MB per file
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
                      className="border-border flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5"
                    >
                      {/* Thumbnail */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={URL.createObjectURL(state.file)}
                        alt={state.file.name}
                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      />

                      {/* Name + size */}
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm font-medium">
                          {state.file.name}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatFileSize(state.file.size)}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="flex shrink-0 items-center gap-2">
                        {state.error ? (
                          <span className="text-destructive text-xs">{state.error}</span>
                        ) : state.progress === 100 ? (
                          <span className="text-xs font-medium text-green-600">✓ Uploaded</span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1 text-xs">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Uploading…
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => dismissUploadError(i)}
                          aria-label="Dismiss"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="border-border bg-muted/30 text-muted-foreground rounded-xl border px-4 py-3 text-sm">
              File upload requires Supabase Storage. Paste a URL instead.
            </div>
          )}

          {/* URL input row */}
          <div className="space-y-2">
            <label htmlFor="photo-url" className="text-foreground block text-sm font-medium">
              {supabaseEnabled ? (
                <>
                  Or paste an image URL{' '}
                  <span className="text-muted-foreground font-normal">
                    (Unsplash, Cloudinary, etc.)
                  </span>
                </>
              ) : (
                <>
                  Image URL{' '}
                  <span className="text-muted-foreground font-normal">
                    (Unsplash, Cloudinary, etc.)
                  </span>
                </>
              )}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
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
                    'text-foreground placeholder:text-muted-foreground w-full rounded-lg border bg-white py-3 pl-9 pr-4 text-sm',
                    'focus:ring-primary/20 transition-colors focus:outline-none focus:ring-2',
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
                  'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                  canAdd
                    ? 'bg-primary hover:bg-primary/90 text-white'
                    : 'bg-muted text-muted-foreground cursor-not-allowed',
                )}
              >
                <ImagePlus className="h-4 w-4" />
                Add
              </button>
            </div>
            {inputError && (
              <p id="photo-url-error" role="alert" className="text-destructive text-xs">
                {inputError}
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              {photos.length}/{MAX_PHOTOS} photos added — press Enter or click Add
            </p>
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="w-full shrink-0 space-y-3 sm:w-52">
          {/* Photo tips card */}
          <div className="border-border rounded-xl border bg-white p-4">
            <p className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
              Photo Tips
            </p>
            <ul className="space-y-3">
              {TIPS.map((tip) => (
                <li key={tip.title} className="flex items-start gap-2">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-foreground text-sm font-semibold">{tip.title}</p>
                    <p className="text-muted-foreground text-xs">{tip.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Privacy card */}
          <div className="border-border flex items-start gap-3 rounded-xl border bg-orange-50/50 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" aria-hidden="true" />
            <div>
              <p className="text-foreground text-sm font-semibold">Your privacy is protected</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                We never share your contact details publicly.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((url, index) => (
              <div
                key={url}
                className="border-border bg-muted group relative aspect-[4/3] overflow-hidden rounded-xl border"
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
                {index === 0 ? (
                  <div className="bg-foreground/80 absolute left-2 top-2 rounded-md px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                    Cover photo
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetCover(url)}
                    aria-label={`Set photo ${index + 1} as cover`}
                    className={cn(
                      'absolute left-2 top-2 flex items-center gap-1 rounded-md px-2 py-0.5',
                      'bg-black/60 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity',
                      'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover:opacity-100',
                    )}
                  >
                    <Star className="h-3 w-3" />
                    Set cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(url)}
                  aria-label={`Remove photo ${index + 1}`}
                  className={cn(
                    'absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full',
                    'bg-destructive/90 text-white opacity-0 backdrop-blur-sm transition-opacity',
                    'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover:opacity-100',
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {/* Add more tile */}
            {canAdd && supabaseEnabled && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add more photos"
                className={cn(
                  'border-border flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed',
                  'text-muted-foreground hover:border-primary/50 hover:bg-muted/30 hover:text-foreground transition-colors',
                  'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                )}
              >
                <ImageIcon className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-medium">Add more photos</span>
              </button>
            )}
          </div>

          {/* Photo count */}
          <p className="text-muted-foreground text-center text-xs">
            {photos.length} of {MAX_PHOTOS} photos added
          </p>
        </div>
      )}

      {/* Empty state hint */}
      {photos.length === 0 && uploadStates.length === 0 && (
        <div className="border-border bg-muted/30 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed py-12 text-center">
          <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
            <X className="text-muted-foreground h-5 w-5" />
          </div>
          <div>
            <p className="text-foreground text-sm font-medium">No photos yet</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
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
