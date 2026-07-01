'use client'

import { motion } from 'framer-motion'
import { useSellFormStore } from '@/stores/sell-form.store'

const CITIES = [
  { name: 'Mumbai', state: 'Maharashtra' },
  { name: 'Pune', state: 'Maharashtra' },
  { name: 'Bangalore', state: 'Karnataka' },
  { name: 'Delhi NCR', state: 'Delhi' },
  { name: 'Hyderabad', state: 'Telangana' },
  { name: 'Chennai', state: 'Tamil Nadu' },
  { name: 'Kolkata', state: 'West Bengal' },
  { name: 'Ahmedabad', state: 'Gujarat' },
]

interface StepCityProps {
  showErrors: boolean
}

export function StepCity({ showErrors }: StepCityProps) {
  const { location, setLocation, nextStep } = useSellFormStore()

  const handleSelect = (city: { name: string; state: string }) => {
    setLocation({ city: city.name, state: city.state })
    nextStep()
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">Which city is your property in?</h2>
      </div>

      <motion.div
        className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.05,
            },
          },
        }}
      >
        {CITIES.map((city) => {
          const isSelected = location.city === city.name

          return (
            <motion.div
              key={city.name}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 },
              }}
              onClick={() => handleSelect(city)}
              className={`cursor-pointer rounded-2xl border-2 p-6 text-center transition-all ${
                isSelected
                  ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]'
                  : 'hover:border-[var(--color-foreground)]/30 border-[var(--color-border)]'
              }`}
            >
              <p className="text-lg font-semibold">{city.name}</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{city.state}</p>
            </motion.div>
          )
        })}
      </motion.div>

      {showErrors && !location.city && (
        <p className="text-sm text-red-500">Please select a city.</p>
      )}
    </div>
  )
}
