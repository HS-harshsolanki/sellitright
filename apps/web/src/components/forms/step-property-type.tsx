'use client'

import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'
import { type PropertyType, useSellFormStore } from '@/stores/sell-form.store'

interface PropertyOption {
  type: PropertyType
  label: string
  description: string
  icon: string
}

const PROPERTY_OPTIONS: PropertyOption[] = [
  {
    type: 'APARTMENT',
    label: 'Apartment',
    description: 'Flat in a multi-storey building',
    icon: '🏢',
  },
  {
    type: 'VILLA',
    label: 'Villa',
    description: 'Independent luxury home with garden',
    icon: '🏡',
  },
  {
    type: 'INDEPENDENT_HOUSE',
    label: 'Independent House',
    description: 'Standalone residential property',
    icon: '🏠',
  },
  {
    type: 'PLOT',
    label: 'Plot / Land',
    description: 'Vacant land or plotted development',
    icon: '🟫',
  },
  {
    type: 'PENTHOUSE',
    label: 'Penthouse',
    description: 'Premium top-floor luxury apartment',
    icon: '✨',
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

interface StepPropertyTypeProps {
  showErrors?: boolean
}

export function StepPropertyType({ showErrors = false }: StepPropertyTypeProps) {
  const { propertyType, setPropertyType } = useSellFormStore()

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          What type of property are you selling?
        </h2>
        <p className="text-muted-foreground">
          Choose the option that best describes your property.
        </p>
      </div>

      <motion.div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {PROPERTY_OPTIONS.map((option) => {
          const isSelected = propertyType === option.type

          return (
            <motion.button
              key={option.type}
              variants={itemVariants}
              onClick={() => setPropertyType(option.type)}
              aria-pressed={isSelected}
              className={cn(
                'group flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200',
                'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/40 bg-white hover:shadow-sm',
              )}
            >
              <span
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl',
                  isSelected ? 'bg-primary/10' : 'bg-muted group-hover:bg-primary/5',
                )}
                aria-hidden="true"
              >
                {option.icon}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    'font-semibold leading-tight',
                    isSelected ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {option.label}
                </p>
                <p className="text-muted-foreground mt-0.5 text-sm">{option.description}</p>
              </div>
              <div
                className={cn(
                  'ml-auto h-5 w-5 shrink-0 rounded-full border-2 transition-all',
                  isSelected ? 'border-primary bg-primary' : 'border-border',
                )}
                aria-hidden="true"
              >
                {isSelected && (
                  <svg viewBox="0 0 20 20" fill="white" className="h-full w-full p-0.5">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </motion.button>
          )
        })}
      </motion.div>

      {showErrors && !propertyType && (
        <p role="alert" className="text-destructive text-sm font-medium">
          Please select a property type to continue.
        </p>
      )}
    </div>
  )
}
