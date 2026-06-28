'use client'

import { motion } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'

// SSR renders children fully visible. After hydration, JS runs the animation.
// This prevents the "invisible page" bug where opacity:0 is baked into SSR HTML.

function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
}

export function Reveal({ children, className, delay = 0, y = 24 }: RevealProps) {
  const mounted = useMounted()

  return (
    <motion.div
      initial={mounted ? { opacity: 0, y } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface StaggerProps {
  children: ReactNode[]
  className?: string
  stagger?: number
  y?: number
}

export function Stagger({ children, className, stagger = 0.08, y = 20 }: StaggerProps) {
  const mounted = useMounted()

  return (
    <div className={className}>
      {children.map((child, i) => (
        <motion.div
          key={i}
          initial={mounted ? { opacity: 0, y } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * stagger }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}
