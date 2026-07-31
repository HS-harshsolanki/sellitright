'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'

import { StepPropertyType } from '@/components/forms/step-property-type'
import { mapSupabaseListingToMock } from '@/lib/listing-mapper'
import { useAuth } from '@/lib/supabase/auth-context'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { SELL_STEPS, STEP_LABELS, type SellStep, useSellFormStore } from '@/stores/sell-form.store'

const StepLocation = dynamic(() =>
  import('@/components/forms/step-location').then((m) => m.StepLocation),
)
const StepDetails = dynamic(() =>
  import('@/components/forms/step-details').then((m) => m.StepDetails),
)
const StepPhotos = dynamic(() => import('@/components/forms/step-photos').then((m) => m.StepPhotos))
const StepPricing = dynamic(() =>
  import('@/components/forms/step-pricing').then((m) => m.StepPricing),
)
const StepReview = dynamic(() => import('@/components/forms/step-review').then((m) => m.StepReview))

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
    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
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

function SellPageInner() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const store = useSellFormStore()
  const {
    currentStep,
    nextStep,
    prevStep,
    goToStep,
    propertyType,
    location,
    details,
    pricing,
    draftId,
    saveStatus,
    setDraftId,
    setSaveStatus,
    descriptionSource,
    descriptionGenerationInFlight,
    aiGenerationCount,
    aiCooldownUntil,
    setDescriptionSource,
    setTitleSource,
    setDescriptionGenerationInFlight,
    setDescriptionGeneratedFromHash,
    setAiRateLimit,
    setPricing,
  } = store

  const [showErrors, setShowErrors] = useState(false)
  const [saveErrorIsAuth, setSaveErrorIsAuth] = useState(false)
  // phoneVerified tracks live verification state — updated when InlinePhoneVerification succeeds
  const [phoneVerified, setPhoneVerified] = useState<boolean | null>(null)

  const currentIndex = SELL_STEPS.indexOf(currentStep)
  const totalSteps = SELL_STEPS.length
  const progressPct = ((currentIndex + 1) / totalSteps) * 100

  const isFirstStep = currentIndex === 0
  const isReviewStep = currentStep === 'review'

  // ── Autosave ─────────────────────────────────────────────────────────────────
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSaving = useRef(false)

  async function saveDraft() {
    if (!isSupabaseConfigured()) return
    if (isSaving.current) return

    const state = useSellFormStore.getState()
    // Don't autosave once the listing has been submitted for review
    if (state.submitted) return
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
        if (!state.draftId && json.id) {
          setDraftId(json.id)
          router.replace(`/sell?draftId=${json.id}`, { scroll: false })
        }
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
  }, [router])

  // ── Background AI generation ──────────────────────────────────────────────────
  const MAX_GENERATIONS = 5
  const COOLDOWN_MS = 10_000

  useEffect(() => {
    if (currentStep !== 'photos') return

    const state = useSellFormStore.getState()

    if (!user) return
    if (state.descriptionGenerationInFlight) return
    if (state.aiGenerationCount >= MAX_GENERATIONS) return
    if (Date.now() < state.aiCooldownUntil) return
    if (state.pricing.description.trim().length > 0) return
    if (!state.details.bhkType || !state.location.city || !state.location.locality) return

    setDescriptionGenerationInFlight(true)

    void (async () => {
      try {
        const res = await fetch('/api/listings/ai-description', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyType: state.propertyType ?? 'APARTMENT',
            bhkType: state.details.bhkType,
            builtUpArea: state.details.builtUpArea ? parseInt(state.details.builtUpArea, 10) : null,
            city: state.location.city,
            locality: state.location.locality,
            furnishing: state.details.furnishing,
            bathrooms: state.details.bathrooms,
            balconies: state.details.balconies,
            amenities: state.details.amenities,
          }),
        })

        if (!res.ok) return

        const data = (await res.json()) as { title?: string; description?: string }

        // Re-check: only write if description is still empty (user may have typed while fetching)
        const current = useSellFormStore.getState()
        if (current.pricing.description.trim().length === 0 && data.description) {
          setPricing({ description: data.description })
          setDescriptionSource('ai')
          const hash = [
            state.details.bhkType,
            state.details.furnishing,
            state.location.locality,
            state.location.city,
          ].join('|')
          setDescriptionGeneratedFromHash(hash)
        }
        if (data.title && !current.pricing.title.trim()) {
          setPricing({ title: data.title })
          setTitleSource('ai')
        }

        const freshState = useSellFormStore.getState()
        setAiRateLimit(freshState.aiGenerationCount + 1, Date.now() + COOLDOWN_MS)
      } catch {
        // Silent failure — background generation failing is not user-visible
      } finally {
        setDescriptionGenerationInFlight(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, user])

  // Step name → index map (shared with step-review.tsx).
  // Used to honour the optional ?step= URL param after hydration.
  const STEP_NAME_TO_INDEX: Record<string, number> = {
    'property-type': 0,
    location: 1,
    details: 2,
    photos: 3,
    pricing: 4,
    review: 5,
  }

  // Read ?draftId / ?edit= from URL and pre-load the listing into the store.
  //
  // ?draftId=ID  — legacy draft param (set by the autosave router.replace call below).
  // ?edit=ID     — edit-an-existing-listing param (set by dashboard action cards & the
  //                "Edit your listing" button in owner-quality-widget.tsx).
  // ?step=NAME   — optional step to jump to after hydration (e.g. ?edit=ID&step=photos).
  //
  // Fresh creation (no ?draftId and no ?edit): reset store → blank form.
  // Edit/draft load: fetch the listing, hydrate the store, then honour ?step= if present.
  const didMountRef = useRef(false)
  useEffect(() => {
    const urlDraftId = searchParams.get('draftId')
    const urlEditId = searchParams.get('edit')
    const urlStep = searchParams.get('step')

    // ── No ID in URL: fresh listing or mid-flow (no autosave yet) ──────────────
    if (!urlDraftId && !urlEditId) {
      // Only reset on the very first mount. After that, the draftId may just not be
      // in the URL yet (e.g. unauthenticated user mid-flow, or before first save).
      if (!didMountRef.current) {
        useSellFormStore.getState().reset()
      }
      didMountRef.current = true
      return
    }

    didMountRef.current = true

    // ── ?draftId= path (legacy — autosave sets this after first save) ──────────
    if (urlDraftId && !urlEditId) {
      // Only fetch+hydrate if this is a different draft than what's already in the store.
      if (useSellFormStore.getState().draftId === urlDraftId) return

      useSellFormStore.getState().setDraftId(urlDraftId)
      ;(async () => {
        try {
          const resp = await fetch(`/api/listings/draft?id=${urlDraftId}`)
          const draft = resp.ok ? await resp.json() : null
          if (draft) {
            useSellFormStore.getState().hydrateFromListing(mapSupabaseListingToMock(draft))
            // Honour optional ?step= after hydration
            if (urlStep) {
              const stepIdx = STEP_NAME_TO_INDEX[urlStep]
              if (stepIdx !== undefined) useSellFormStore.getState().goToStep(stepIdx)
            }
          }
        } catch (err) {
          console.error('[sell] draft hydration failed:', err)
        }
      })()
      return
    }

    // ── ?edit=ID path — editing an existing (published or draft) listing ────────
    // urlEditId is guaranteed non-null here because of the guard above.
    const editId = urlEditId!

    // Skip re-hydration if this listing is already loaded in the store.
    if (useSellFormStore.getState().draftId === editId) {
      // Store already has this listing — just honour the ?step= param if present.
      if (urlStep) {
        const stepIdx = STEP_NAME_TO_INDEX[urlStep]
        if (stepIdx !== undefined) useSellFormStore.getState().goToStep(stepIdx)
      }
      return
    }

    ;(async () => {
      try {
        // Try the public listing endpoint first (ACTIVE listings).
        // IMPORTANT: this endpoint already returns a MockListing (the mapper runs server-side),
        // so we call hydrateFromListing directly — no second mapSupabaseListingToMock call.
        const resp = await fetch(`/api/listings/${editId}`)
        if (resp.ok) {
          const listing = await resp.json()
          useSellFormStore.getState().hydrateFromListing(listing)
          if (urlStep) {
            const stepIdx = STEP_NAME_TO_INDEX[urlStep]
            if (stepIdx !== undefined) useSellFormStore.getState().goToStep(stepIdx)
          }
          return
        }

        // Fallback for DRAFT / PENDING_REVIEW / PAUSED listings that the public endpoint
        // won't return (it only serves ACTIVE rows). The draft endpoint authenticates the
        // caller and verifies ownership, so this is safe.
        const draftResp = await fetch(`/api/listings/draft?id=${editId}`)
        if (draftResp.ok) {
          const draft = await draftResp.json()
          // Draft endpoint returns a raw Supabase row — mapping is needed here.
          useSellFormStore.getState().hydrateFromListing(mapSupabaseListingToMock(draft))
          if (urlStep) {
            const stepIdx = STEP_NAME_TO_INDEX[urlStep]
            if (stepIdx !== undefined) useSellFormStore.getState().goToStep(stepIdx)
          }
        }
      } catch (err) {
        console.error('[sell] edit hydration failed:', err)
      }
    })()
  }, [searchParams])

  // Refresh the session when the review step is entered so that stale JWT metadata
  // (e.g. phone_verified) is replaced with the latest server-side values.
  // The SupabaseAuthProvider onAuthStateChange handler picks up the TOKEN_REFRESHED
  // event and updates the shared `user` state automatically.
  useEffect(() => {
    if (currentStep !== 'review') return
    createClient()
      .auth.refreshSession()
      .catch(() => {})
  }, [currentStep])

  function canProceed(): boolean {
    switch (currentStep) {
      case 'property-type':
        return propertyType !== null
      case 'location':
        // address is optional — falls back to "locality, city" at submit time
        return Boolean(
          location.city &&
          location.locality.trim() &&
          location.pincode.length === 6 &&
          location.state,
        )
      case 'details':
        return Boolean(details.bhkType && details.builtUpArea && details.furnishing)
      case 'photos': {
        // Block Continue while any upload is still in-flight
        const states = useSellFormStore.getState()
        void states // canProceed for photos is always true unless uploads are running;
        // actual in-flight guard is enforced inside StepPhotos via isUploading
        return true
      }
      case 'pricing':
        // Minimum realistic price: ₹1 lakh
        return Number(pricing.price.replace(/,/g, '')) >= 100_000
      case 'review':
        return false
      default:
        return true
    }
  }

  function handleNext() {
    if (canProceed()) {
      setShowErrors(false)
      nextStep()
    } else {
      setShowErrors(true)
    }
  }

  function handlePrev() {
    setShowErrors(false)
    prevStep()
  }

  function renderStep(step: SellStep) {
    switch (step) {
      case 'property-type':
        return <StepPropertyType showErrors={showErrors} />
      case 'location':
        return <StepLocation showErrors={showErrors} />
      case 'details':
        return <StepDetails showErrors={showErrors} />
      case 'photos':
        return <StepPhotos />
      case 'pricing':
        return <StepPricing showErrors={showErrors} />
      case 'review': {
        // Use live phoneVerified state if available; fall back to user metadata on first render
        const hasPhone =
          phoneVerified !== null
            ? phoneVerified
            : !!(user?.user_metadata?.phone_verified && (user?.user_metadata?.phone ?? user?.phone))
        return (
          <StepReview
            draftId={draftId}
            hasPhone={hasPhone}
            onPhoneVerified={() => setPhoneVerified(true)}
          />
        )
      }
    }
  }

  const nextLabel = currentIndex === totalSteps - 2 ? 'Review' : 'Continue'

  return (
    <>
      {/* Progress bar */}
      <div className="mb-8 space-y-3">
        {/* Step labels — shown on sm+ */}
        <div className="hidden items-center gap-0 sm:flex">
          {SELL_STEPS.map((step, idx) => {
            const isActive = step === currentStep
            const isPast = idx < currentIndex

            return (
              <div key={step} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  {isPast ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowErrors(false)
                        goToStep(idx)
                      }}
                      aria-label={`Go back to ${STEP_LABELS[step]}`}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold',
                        'border-primary bg-primary text-white',
                        'focus-visible:ring-ring cursor-pointer transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                      )}
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  ) : (
                    <div
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
                        isActive
                          ? 'border-primary bg-primary text-white'
                          : 'border-border text-muted-foreground bg-white',
                      )}
                    >
                      {idx + 1}
                    </div>
                  )}
                  <span
                    className={cn(
                      'whitespace-nowrap text-xs',
                      isActive
                        ? 'text-foreground font-semibold'
                        : isPast
                          ? 'text-muted-foreground hover:text-foreground cursor-pointer'
                          : 'text-muted-foreground',
                    )}
                  >
                    {STEP_LABELS[step]}
                  </span>
                </div>
                {idx < SELL_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mb-5 h-0.5 flex-1 transition-colors',
                      isPast ? 'bg-primary' : 'bg-border',
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Mobile: progress bar + step counter */}
        <div className="sm:hidden">
          <div className="mb-2 flex items-center justify-between text-xs">
            {!isFirstStep ? (
              <button
                type="button"
                onClick={() => {
                  setShowErrors(false)
                  goToStep(currentIndex - 1)
                }}
                className="text-foreground hover:text-primary focus-visible:ring-ring flex items-center gap-1 rounded font-medium focus-visible:outline-none focus-visible:ring-2"
                aria-label="Go back to previous step"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {STEP_LABELS[currentStep]}
              </button>
            ) : (
              <span className="text-foreground font-medium">{STEP_LABELS[currentStep]}</span>
            )}
            <span className="text-muted-foreground">
              Step {currentIndex + 1} of {totalSteps}
            </span>
          </div>
          <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
            <motion.div
              className="bg-primary h-full rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Autosave indicator */}
        <div className="flex items-center justify-between">
          <div>
            {saveStatus === 'error' ? (
              <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                <span className="font-medium">Draft not saved</span>
                {!user || saveErrorIsAuth ? (
                  <span className="text-amber-600">— sign in to enable autosave</span>
                ) : (
                  <span className="text-amber-600">— changes will be saved when you reconnect</span>
                )}
              </div>
            ) : descriptionGenerationInFlight ? (
              <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                <Sparkles className="h-3 w-3 animate-pulse text-violet-500" aria-hidden="true" />
                AI is preparing your description…
              </span>
            ) : null}
          </div>
          <SaveIndicator status={saveStatus} />
        </div>
      </div>

      {/* Step content with animated transitions */}
      <div className="min-h-[60vh]">
        <AnimatePresence mode="wait" custom={currentIndex}>
          <motion.div
            key={currentStep}
            custom={currentIndex}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {renderStep(currentStep)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      {!isReviewStep && (
        <div
          className={cn(
            'border-border pb-safe fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 p-4 backdrop-blur-sm',
            'sm:static sm:mt-12 sm:border-none sm:bg-transparent sm:p-0 sm:pb-0 sm:backdrop-blur-none',
          )}
        >
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            {!isFirstStep ? (
              <button
                type="button"
                onClick={handlePrev}
                className={cn(
                  'border-border text-foreground flex items-center gap-1.5 rounded-xl border px-5 py-3 text-sm font-semibold',
                  'hover:bg-muted focus-visible:ring-ring transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                )}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNext}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-6 py-3 text-sm font-bold text-white',
                'focus-visible:ring-ring transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                'bg-primary hover:bg-primary/90 shadow-sm active:scale-[0.98]',
              )}
            >
              {nextLabel}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom padding on mobile for fixed nav */}
      {!isReviewStep && <div className="h-24 sm:hidden" aria-hidden="true" />}
    </>
  )
}

export default function SellPage() {
  return (
    <Suspense fallback={null}>
      <SellPageInner />
    </Suspense>
  )
}
