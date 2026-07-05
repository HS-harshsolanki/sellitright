'use client'

import { AlertTriangle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface WarningBadgeProps {
  count: number
  tooltip: string
  size?: 'sm' | 'md'
}

export function WarningBadge({ count, tooltip, size = 'sm' }: WarningBadgeProps) {
  const [visible, setVisible] = useState(false)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!visible || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const above = spaceBelow < 100
    setStyle({
      position: 'fixed',
      left: rect.left + rect.width / 2,
      ...(above ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
      transform: 'translateX(-50%)',
      zIndex: 9999,
    })
  }, [visible])

  const isFinal = count >= 3
  const badgeSize = size === 'md' ? 'h-5 w-5 text-[10px]' : 'h-4 w-4 text-[9px]'

  return (
    <>
      <button
        ref={ref}
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className={`relative inline-flex shrink-0 items-center justify-center rounded-full font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] ${badgeSize} ${isFinal ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
        aria-label={`Warning ${count}/3: ${tooltip}`}
      >
        <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
        <span className="sr-only">{count}/3</span>
      </button>

      {visible &&
        createPortal(
          <div
            style={style}
            className={`pointer-events-none max-w-[200px] rounded-lg border px-2.5 py-1.5 text-xs shadow-lg ${isFinal ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}
            role="tooltip"
          >
            <span className="font-semibold">{count >= 3 ? 'Blocked' : `Warning ${count}/3`}:</span>{' '}
            {tooltip}
          </div>,
          document.body,
        )}
    </>
  )
}
