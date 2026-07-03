'use client'

import { Share2 } from 'lucide-react'
import { useState } from 'react'

interface ShareSaveButtonsProps {
  title: string
  url: string
}

export function ShareSaveButtons({ title, url }: ShareSaveButtonsProps) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // User cancelled or API not available — fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)]"
        aria-label="Share listing"
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        {copied ? 'Copied!' : 'Share'}
      </button>
    </div>
  )
}
