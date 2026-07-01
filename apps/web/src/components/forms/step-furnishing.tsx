'use client'

import { Sofa, Hammer, BoxSelect } from 'lucide-react'
import { motion } from 'framer-motion'

import { useSellFormStore, type Furnishing } from '@/stores/sell-form.store'

interface FurnishingOption {
  value: Furnishing
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
}

const OPTIONS: FurnishingOption[] = [
  {
    value: 'FURNISHED',
    icon: Sofa,
    title: 'Fully furnished',
    subtitle: 'All furniture and appliances included',
  },
  {
    value: 'SEMI_FURNISHED',
    icon: Hammer,
    title: 'Semi furnished',
    subtitle: 'Some fixtures and fittings',
  },
  {
    value: 'UNFURNISHED',
    icon: BoxSelect,
    title: 'Unfurnished',
    subtitle: 'Empty, ready for your touch',
  },
]

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

interface Props {
  showErrors: boolean
}

export function StepFurnishing({ showErrors: _showErrors }: Props) {
  const furnishing = useSellFormStore((s) => s.details.furnishing)
  const setDetails = useSellFormStore((s) => s.setDetails)

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-center text-3xl font-bold sm:text-4xl">How is the property furnished?</h1>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto mt-12 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {OPTIONS.map((option) => {
          const Icon = option.icon
          const selected = furnishing === option.value

          return (
            <motion.button
              key={option.value}
              variants={item}
              type="button"
              onClick={() => setDetails({ furnishing: option.value })}
              className={[
                'rounded-2xl border-2 p-8 text-left transition-all',
                selected
                  ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]'
                  : 'hover:border-[var(--color-foreground)]/30 border-[var(--color-border)] bg-white',
              ].join(' ')}
            >
              <Icon className="mb-4 h-8 w-8" />
              <p className="text-xl font-semibold">{option.title}</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{option.subtitle}</p>
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}
