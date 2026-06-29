'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

export function HeroHalo() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  // Fade from fully visible to transparent over the first 40% of hero scroll travel.
  // Keeps the halo present while reading the hero, dissolves it as the user moves on.
  const opacity = useTransform(scrollYProgress, [0, 0.4], [1, 0])

  return (
    <motion.div
      ref={ref}
      style={{ opacity }}
      className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/3"
      aria-hidden="true"
    >
      <div
        className="h-full w-full"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(198,46,73,0.07) 0%, transparent 65%)',
        }}
      />
    </motion.div>
  )
}
