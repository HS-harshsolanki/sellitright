'use client'

import { Check } from 'lucide-react'
import { motion } from 'framer-motion'

import { useSellFormStore } from '@/stores/sell-form.store'

const AMENITIES = [
  { id: 'gym', label: 'Gym', emoji: '🏋️' },
  { id: 'swimming_pool', label: 'Swimming Pool', emoji: '🏊' },
  { id: 'garden', label: 'Garden', emoji: '🌳' },
  { id: 'clubhouse', label: 'Clubhouse', emoji: '🏢' },
  { id: 'power_backup', label: 'Power Backup', emoji: '⚡' },
  { id: 'lift', label: 'Lift', emoji: '🛗' },
  { id: 'security', label: '24/7 Security', emoji: '🔒' },
  { id: 'cctv', label: 'CCTV', emoji: '📹' },
  { id: 'parking', label: 'Parking', emoji: '🚗' },
  { id: 'playground', label: 'Playground', emoji: '🛝' },
  { id: 'fire_safety', label: 'Fire Safety', emoji: '🧯' },
  { id: 'intercom', label: 'Intercom', emoji: '📞' },
]

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const item = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: 'easeOut' } },
}

interface Props {
  showErrors: boolean
}

export function StepAmenities({ showErrors: _showErrors }: Props) {
  const amenities = useSellFormStore((s) => s.details.amenities)
  const setDetails = useSellFormStore((s) => s.setDetails)
  const nextStep = useSellFormStore((s) => s.nextStep)

  const toggle = (id: string) => {
    const isSelected = amenities.includes(id)
    setDetails({
      amenities: isSelected ? amenities.filter((a) => a !== id) : [...amenities, id],
    })
  }

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-center text-3xl font-bold sm:text-4xl">What does your property offer?</h1>
      <p className="mt-2 text-center text-[var(--color-muted-foreground)]">Select all that apply</p>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto mt-10 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
      >
        {AMENITIES.map((amenity) => {
          const isSelected = amenities.includes(amenity.id)

          return (
            <motion.button
              key={amenity.id}
              variants={item}
              type="button"
              onClick={() => toggle(amenity.id)}
              className={[
                'flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all',
                isSelected
                  ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)] font-medium'
                  : 'hover:border-[var(--color-foreground)]/30 border-[var(--color-border)]',
              ].join(' ')}
            >
              <span className="text-xl">{amenity.emoji}</span>
              <span className="flex-1 text-sm font-medium">{amenity.label}</span>
              {isSelected && (
                <Check className="ml-auto h-4 w-4 shrink-0 text-[var(--color-primary)]" />
              )}
            </motion.button>
          )
        })}
      </motion.div>

      <button
        type="button"
        onClick={nextStep}
        className="mt-8 text-sm text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
      >
        Skip if none apply
      </button>
    </div>
  )
}
