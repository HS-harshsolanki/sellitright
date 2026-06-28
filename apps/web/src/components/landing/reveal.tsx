'use client'

import { motion } from 'framer-motion'
import { type ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
}

export function Reveal({ children, className, delay = 0, y = 24 }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Staggered children — each child fades up with a delay offset
interface StaggerProps {
  children: ReactNode[]
  className?: string
  stagger?: number
  y?: number
}

export function Stagger({ children, className, stagger = 0.08, y = 20 }: StaggerProps) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y }}
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
