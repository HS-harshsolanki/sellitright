'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { StepAddress } from '@/components/forms/step-address'
import { StepAmenities } from '@/components/forms/step-amenities'
import { StepArea } from '@/components/forms/step-area'
import { StepBhk } from '@/components/forms/step-bhk'
import { StepCity } from '@/components/forms/step-city'
import { StepFurnishing } from '@/components/forms/step-furnishing'
import { StepPhotos } from '@/components/forms/step-photos'
import { StepPrice } from '@/components/forms/step-price'
import { StepPropertyType } from '@/components/forms/step-property-type'
import { StepReview } from '@/components/forms/step-review'
import { mapSupabaseListingToMock } from '@/lib/listing-mapper'
import { useAuth } from '@/lib/supabase/auth-context'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { SELL_STEPS, STEP_LABELS, type SellStep, useSellFormStore } from '@/stores/sell-form.store'

const pageVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 32 : -32,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -32 : 32,
    transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

function SaveIndicator({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'idle') return null
  return (
    <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
      {status === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving draft…
        </>
      )}
      {status === 'saved' && (
        <>
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          Draft saved
        </>
      )}
      {status === 'error' && <span className="text-destructive">Draft save failed</span>}
    </span>
  )
}

// Build the draft payload from current store state
function buildDraftPayload(state: ReturnType<typeof useSellFormStore.getState>) {
  const { draftId, propertyType, location, details, photos, pricing } = state
  return {
    ...(draftId ? { id: draftId } : {}),
    propertyType: propertyType ?? undefined,
    bhkType: details.bhkType ?? undefined,
    builtUpArea: details.builtUpArea ? parseInt(details.builtUpArea, 10) : undefined,
    carpetArea: details.carpetArea ? parseInt(details.carpetArea, 10) : undefined,
    floor: details.floor ? parseInt(details.floor, 10) : undefined,
    totalFloors: details.totalFloors ? parseInt(details.totalFloors, 10) : undefined,
    facing: details.facing ?? undefined,
    furnishing: details.furnishing ?? undefined,
    ageOfProperty: details.ageOfProperty ? parseInt(details.ageOfProperty, 10) : undefined,
    bathrooms: details.bathrooms,
    balconies: details.balconies,
    parking: details.parking ?? undefined,
    address: location.address || undefined,
    city: location.city || undefined,
    locality: location.locality || undefined,
    state: location.state || undefined,
    pincode: location.pincode || undefined,
    amenities: details.amenities,
    imageUrls: photos,
    price: pricing.price ? Number(pricing.price.replace(/,/g, '')) : undefined,
    title: pricing.title || undefined,
    description: pricing.description || undefined,
    negotiable: pricing.negotiable,
  }
}

export default function SellPage() {
  const { user } = useAuth()
  const store = useSellFormStore()
  const {
    currentStep,
    nextStep,
    prevStep,
    propertyType,
    location,
    details,
    pricing,
    draftId,
    saveStatus,
    setDraftId,
    setSaveStatus,
  } = store

  const prefersReducedMotion = useReducedMotion()
  const [showErrors, setShowErrors] = useState(false)
  const [saveErrorIsAuth, setSaveErrorIsAuth] = useState(false)
  const [direction, setDirection] = useState(1)

  const currentIndex = SELL_STEPS.indexOf(currentStep)
  const totalSteps = SELL_STEPS.length
  const progressPct = ((currentIndex + 1) / totalSteps) * 100

  const isFirstStep = currentIndex === 0
  const isReviewStep = currentStep === 'review'
  const isLastBeforeReview = currentIndex === SELL_STEPS.length - 2

  // ── Autosave ─────────────────────────────────────────────────────────────────
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSaving = useRef(false)

  async function saveDraft() {
    if (!isSupabaseConfigured()) return
    if (isSaving.current) return

    const state = useSellFormStore.getState()
    // Don't autosave until the user has at least picked a property type
    if (!state.propertyType) return

    isSaving.current = true
    setSaveStatus('saving')

    try {
      const payload = buildDraftPayload(state)
      const res = await fetch('/api/listings/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const json = (await res.json()) as { id: string }
        if (!state.draftId && json.id) setDraftId(json.id)
        setSaveStatus('saved')
        setSaveErrorIsAuth(false)
      } else {
        setSaveErrorIsAuth(res.status === 401)
        setSaveStatus('error')
      }
    } catch {
      setSaveErrorIsAuth(false)
      setSaveStatus('error')
    } finally {
      isSaving.current = false
    }
  }

  // Subscribe to store changes and debounce autosave (1.5s after last change)
  useEffect(() => {
    const unsubscribe = useSellFormStore.subscribe(() => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
      autosaveTimer.current = setTimeout(() => {
        void saveDraft()
      }, 1500)
    })
    return () => {
      unsubscribe()
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Read ?draftId from URL and pre-load the draft into the store.
  // Without a draftId, always reset to step 1 so returning users don't land mid-flow.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlDraftId = params.get('draftId')

    if (!urlDraftId) {
      // Fresh listing — reset to step 1 regardless of persisted state
      useSellFormStore.getState().reset()
      return
    }

    // Only fetch+hydrate if this is a different draft than what's already in the store.
    // Guarding here prevents re-hydrating (and losing step progress) on back/forward navigation.
    if (useSellFormStore.getState().draftId === urlDraftId) return

    useSellFormStore.getState().setDraftId(urlDraftId)

    void fetch(`/api/listings/draft?id=${urlDraftId}`)
      .then((r) => (r.ok ? r.json() : null))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((draft: Record<string, any> | null) => {
        if (!draft) return
        useSellFormStore.getState().hydrateFromListing(mapSupabaseListingToMock(draft))
      })
  }, [])

  function canProceed(): boolean {
    switch (currentStep) {
      case 'property-type':
        return propertyType !== null
      case 'city':
        return Boolean(location.city)
      case 'bhk':
        return Boolean(details.bhkType)
      case 'area':
        return Boolean(details.builtUpArea)
      case 'furnishing':
        return true // optional
      case 'amenities':
        return true // optional
      case 'photos':
        return true // optional
      case 'price':
        return Number(pricing.price.replace(/,/g, '')) > 0
      case 'address':
        return Boolean(
          location.locality.trim() && location.pincode.length === 6 && location.address.trim(),
        )
      case 'review':
        return false
      default:
        return true
    }
  }

  function handleNext() {
    if (canProceed()) {
      setShowErrors(false)
      setDirection(1)
      nextStep()
    } else {
      setShowErrors(true)
    }
  }

  function handlePrev() {
    setShowErrors(false)
    setDirection(-1)
    prevStep()
  }

  function renderStep(step: SellStep) {
    switch (step) {
      case 'property-type':
        return <StepPropertyType showErrors={showErrors} />
      case 'city':
        return <StepCity showErrors={showErrors} />
      case 'bhk':
        return <StepBhk showErrors={showErrors} />
      case 'area':
        return <StepArea showErrors={showErrors} />
      case 'furnishing':
        return <StepFurnishing showErrors={showErrors} />
      case 'amenities':
        return <StepAmenities showErrors={showErrors} />
      case 'photos':
        return <StepPhotos />
      case 'price':
        return <StepPrice showErrors={showErrors} />
      case 'address':
        return <StepAddress showErrors={showErrors} />
      case 'review':
        return <StepReview draftId={draftId} />
    }
  }

  // Suppress unused warning — saveErrorIsAuth is used in the error banner below
  void saveErrorIsAuth
  void user

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* TOP BAR — Airbnb style */}
      <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-6">
        {/* Left: step label as back context */}
        <div className="w-32 text-sm text-[var(--color-muted-foreground)]">
          {STEP_LABELS[currentStep]}
        </div>

        {/* Center: step counter */}
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-[var(--color-muted-foreground)]">{STEP_LABELS[currentStep]}</span>
          <span className="text-[var(--color-muted-foreground)]">·</span>
          <span>
            Step {currentIndex + 1} of {SELL_STEPS.length - 1}
          </span>
        </div>

        {/* Right: save and autosave indicator */}
        <div className="flex w-32 items-center justify-end gap-3">
          <SaveIndicator status={saveStatus} />
          <Link
            href="/"
            className="rounded-full border border-[var(--color-border)] px-4 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--color-muted)]"
          >
            Save &amp; exit
          </Link>
        </div>
      </header>

      {/* Slim progress bar below header */}
      <div className="h-0.5 w-full bg-[var(--color-muted)]">
        <motion.div
          className="h-full bg-[var(--color-primary)]"
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Autosave error banner */}
      {saveStatus === 'error' && (
        <div className="flex items-center justify-center gap-1.5 border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-800">
          <span className="font-medium">Draft not saved</span>
          {!user || saveErrorIsAuth ? (
            <span className="text-amber-600">— sign in to enable autosave</span>
          ) : (
            <span className="text-amber-600">— will retry automatically</span>
          )}
        </div>
      )}

      {/* CONTENT — centered in viewport */}
      <main className="flex flex-1 items-start justify-center overflow-y-auto px-6 py-12 sm:items-center sm:py-16">
        <div className="w-full max-w-3xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={prefersReducedMotion ? undefined : pageVariants}
              initial={prefersReducedMotion ? false : 'enter'}
              animate={prefersReducedMotion ? false : 'center'}
              exit={prefersReducedMotion ? undefined : 'exit'}
            >
              {renderStep(currentStep)}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* BOTTOM NAV — Airbnb style: full width */}
      {!isReviewStep && (
        <footer className="border-t border-[var(--color-border)] bg-white px-8 py-5">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            {!isFirstStep ? (
              <button
                type="button"
                onClick={handlePrev}
                className="rounded-full border border-[var(--color-border)] px-7 py-3 text-sm font-semibold underline transition-colors hover:bg-[var(--color-muted)]"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNext}
              className="rounded-full bg-[var(--color-foreground)] px-8 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              {isLastBeforeReview ? 'Review listing' : 'Next'}
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}
