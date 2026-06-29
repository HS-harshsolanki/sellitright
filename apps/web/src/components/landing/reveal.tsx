'use client'

import { motion, useReducedMotion } from 'framer-motion'
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

export function Reveal({ children, className, delay = 0, y = 28 }: RevealProps) {
  const mounted = useMounted()
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={mounted ? { opacity: 0, y } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ type: 'spring', stiffness: 60, damping: 20, delay }}
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
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return (
      <div className={className}>
        {children.map((child, i) => (
          <div key={i}>{child}</div>
        ))}
      </div>
    )
  }

  return (
    <div className={className}>
      {children.map((child, i) => (
        <motion.div
          key={i}
          initial={mounted ? { opacity: 0, y } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ type: 'spring', stiffness: 70, damping: 22, delay: i * stagger }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}

interface RevealScaleProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function RevealScale({ children, className, delay = 0 }: RevealScaleProps) {
  const mounted = useMounted()
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={mounted ? { opacity: 0, scale: 0.92 } : false}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ type: 'spring', stiffness: 200, damping: 20, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// FadeIn — opacity only, no vertical movement. For horizontal bands and stats
// where vertical motion would feel wrong.
interface FadeInProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function FadeIn({ children, className, delay = 0 }: FadeInProps) {
  const mounted = useMounted()
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={mounted ? { opacity: 0 } : false}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
