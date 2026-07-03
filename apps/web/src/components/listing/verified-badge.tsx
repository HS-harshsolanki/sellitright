import { ShieldCheck } from 'lucide-react'

import { cn } from '@/lib/utils'

interface VerifiedBadgeProps {
  className?: string
  size?: 'sm' | 'md'
}

export function VerifiedBadge({ className, size = 'sm' }: VerifiedBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        'border border-emerald-200 bg-emerald-50 text-emerald-700',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-3 py-1 text-sm',
        className,
      )}
      title="This listing has been verified by our team"
      aria-label="Verified listing"
    >
      <ShieldCheck className={cn('shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      Verified
    </span>
  )
}
