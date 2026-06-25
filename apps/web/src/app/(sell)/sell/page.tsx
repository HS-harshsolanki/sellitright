'use client'

import { StepDetails } from '@/components/forms/step-details'
import { StepLocation } from '@/components/forms/step-location'
import { StepPhotos } from '@/components/forms/step-photos'
import { StepPricing } from '@/components/forms/step-pricing'
import { StepPropertyType } from '@/components/forms/step-property-type'
import { StepReview } from '@/components/forms/step-review'
import { cn } from '@/lib/utils'
import {
  SELL_STEPS,
  STEP_LABELS,
  type SellStep,
  useSellFormStore,
} from '@/stores/sell-form.store'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

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

export default function SellPage() {
  const { currentStep, nextStep, prevStep, goToStep, propertyType, location, details, pricing } =
    useSellFormStore()

  const [showErrors, setShowErrors] = useState(false)

  const currentIndex = SELL_STEPS.indexOf(currentStep)
  const totalSteps = SELL_STEPS.length
  const progressPct = ((currentIndex + 1) / totalSteps) * 100

  const isFirstStep = currentIndex === 0
  const isReviewStep = currentStep === 'review'

  function canProceed(): boolean {
    switch (currentStep) {
      case 'property-type':
        return propertyType !== null
      case 'location':
        return Boolean(location.city && location.locality.trim() && location.pincode.length === 6)
      case 'details':
        return Boolean(details.bhkType && details.builtUpArea)
      case 'photos':
        return true
      case 'pricing':
        return Number(pricing.price.replace(/,/g, '')) > 0
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

  // Build the current step component with showErrors threaded in.
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
      case 'review':
        return <StepReview />
    }
  }

  const nextLabel = currentIndex === totalSteps - 2 ? 'Review' : 'Next'

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
                  {/*
                    Past steps are interactive: clicking navigates back.
                    Active and future steps are static.
                  */}
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
                        'cursor-pointer transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
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
                          : 'border-border bg-white text-muted-foreground',
                      )}
                    >
                      {idx + 1}
                    </div>
                  )}
                  <span
                    className={cn(
                      'whitespace-nowrap text-xs',
                      isActive
                        ? 'font-semibold text-foreground'
                        : isPast
                          ? 'cursor-pointer text-muted-foreground hover:text-foreground'
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

        {/* Mobile: progress bar + step counter with back tap on label */}
        <div className="sm:hidden">
          <div className="mb-2 flex items-center justify-between text-xs">
            {/* Tap the label to go back one step (when not on the first step) */}
            {!isFirstStep ? (
              <button
                type="button"
                onClick={() => {
                  setShowErrors(false)
                  goToStep(currentIndex - 1)
                }}
                className="flex items-center gap-1 font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                aria-label="Go back to previous step"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {STEP_LABELS[currentStep]}
              </button>
            ) : (
              <span className="font-medium text-foreground">{STEP_LABELS[currentStep]}</span>
            )}
            <span className="text-muted-foreground">
              Step {currentIndex + 1} of {totalSteps}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
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

      {/* Navigation — fixed on mobile, static on desktop */}
      {!isReviewStep && (
        <div
          className={cn(
            'fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/95 p-4 pb-safe backdrop-blur-sm',
            'sm:static sm:mt-12 sm:border-none sm:bg-transparent sm:p-0 sm:pb-0 sm:backdrop-blur-none',
          )}
        >
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            {!isFirstStep ? (
              <button
                type="button"
                onClick={handlePrev}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground',
                  'transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
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
                'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'bg-primary shadow-sm hover:bg-primary/90 active:scale-[0.98]',
              )}
            >
              {nextLabel}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom padding on mobile to account for fixed nav */}
      {!isReviewStep && <div className="h-24 sm:hidden" aria-hidden="true" />}
    </>
  )
}
