import Image from 'next/image'
import Link from 'next/link'

import { cn } from '@/lib/utils'

interface ChapterNewLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  iconOnly?: boolean
  asLink?: boolean
}

// logo-horizontal.png 1024×288 → ratio 3.56:1
const HORIZONTAL = { sm: { w: 120, h: 34 }, md: { w: 152, h: 43 }, lg: { w: 200, h: 56 } }
const ICON = { sm: 63, md: 36, lg: 48 }

export function ChapterNewLogo({
  className,
  size = 'md',
  iconOnly = false,
  asLink = true,
}: ChapterNewLogoProps) {
  const inner = iconOnly ? (
    <Image
      src="/logo-icon.png"
      alt="ChapterNew"
      width={ICON[size]}
      height={ICON[size]}
      sizes="48px"
      className="shrink-0"
      priority
    />
  ) : (
    <Image
      src="/logo-horizontal.png"
      alt="ChapterNew"
      width={HORIZONTAL[size].w}
      height={HORIZONTAL[size].h}
      sizes="(max-width: 640px) 120px, (max-width: 1024px) 152px, 200px"
      className="shrink-0"
      priority
    />
  )

  if (!asLink) {
    return <div className={cn('flex items-center', className)}>{inner}</div>
  }

  return (
    <Link
      href="/"
      className={cn(
        'shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
        className,
      )}
    >
      <span className="sr-only">ChapterNew home</span>
      {inner}
    </Link>
  )
}
