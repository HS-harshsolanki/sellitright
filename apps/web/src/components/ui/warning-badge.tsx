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
  const iconSize = size === 'md' ? 'h-3 w-3' : 'h-2.5 w-2.5'
  const textSize = size === 'md' ? 'text-[11px]' : 'text-[10px]'
  const label = isFinal ? 'Blocked' : `${count}/3`

  return (
    <>
      <button
        ref={ref}
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] ${textSize} ${isFinal ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
        aria-label={`Warning ${label}: ${tooltip}`}
      >
        <AlertTriangle className={`${iconSize} shrink-0`} aria-hidden="true" />
        <span>{label}</span>
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
