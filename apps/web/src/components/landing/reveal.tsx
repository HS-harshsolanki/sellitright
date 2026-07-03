'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'

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
  x?: number
}

export function Reveal({ children, className, delay = 0, y = 28, x = 0 }: RevealProps) {
  const mounted = useMounted()
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={mounted ? { opacity: 0, y, x } : false}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ type: 'spring', stiffness: 60, damping: 28, delay }}
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
          transition={{ type: 'spring', stiffness: 60, damping: 28, delay: i * stagger }}
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

// ---------------------------------------------------------------------------
// FAQItem — accessible accordion with Framer Motion expand/collapse.
// Height animates on the wrapper; opacity fades on the answer.
// No spring on layout — timed ease keeps it snappy and predictable.
// ---------------------------------------------------------------------------

interface FAQItemProps {
  question: string
  answer: string
}

// prettier-ignore
const FAQ_EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1]

export function FAQItem({ question, answer }: FAQItemProps) {
  const [open, setOpen] = useState(false)
  const prefersReduced = useReducedMotion()
  const uid = useId()
  const answerId = `faq-answer-${uid}`

  return (
    <div className="border-border/50 border-b last:border-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={answerId}
        onClick={() => setOpen((v) => !v)}
        className="text-foreground hover:text-foreground/80 focus-visible:ring-ring flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <span>{question}</span>
        {/* Icon: + when closed, × when open. Cross-fade with subtle rotation. */}
        <span
          aria-hidden="true"
          className="relative flex h-5 w-5 shrink-0 items-center justify-center"
        >
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.span
                key="close"
                initial={prefersReduced ? {} : { opacity: 0, rotate: -45 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={prefersReduced ? {} : { opacity: 0, rotate: 45 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute select-none text-base font-light leading-none"
              >
                ×
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={prefersReduced ? {} : { opacity: 0, rotate: 45 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={prefersReduced ? {} : { opacity: 0, rotate: -45 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute select-none text-base font-light leading-none"
              >
                +
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={answerId}
            role="region"
            key="answer"
            initial={prefersReduced ? {} : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={prefersReduced ? {} : { height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.28, ease: FAQ_EASE },
              opacity: { duration: 0.28, ease: FAQ_EASE },
            }}
            style={{ overflow: 'hidden' }}
          >
            <p className="text-muted-foreground pb-4 text-sm">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ScrollChevron — pulsing opacity chevron for the hero bottom edge.
// Pure CSS keyframe; returns null when reduced motion is preferred.
// Appears after a 1200ms delay so it doesn't compete with hero entrance.
// ---------------------------------------------------------------------------

export function ScrollChevron({ className }: { className?: string }) {
  const prefersReduced = useReducedMotion()

  if (prefersReduced) return null

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static keyframe string, no user input
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes scroll-chevron-pulse {
              0%,  100% { opacity: 0.35; }
              50%        { opacity: 0.75; }
            }
            .scroll-chevron-pulse {
              animation: scroll-chevron-pulse 2.4s ease-in-out infinite;
              animation-delay: 1200ms;
              opacity: 0;
            }
          `,
        }}
      />
      <ChevronDown
        aria-hidden="true"
        className={['scroll-chevron-pulse', className].filter(Boolean).join(' ')}
      />
    </>
  )
}
