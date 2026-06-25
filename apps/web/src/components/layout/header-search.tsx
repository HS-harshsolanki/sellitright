'use client'

import { Search, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface HeaderSearchProps {
  className?: string
}

const PLACEHOLDER_MOBILE = 'Search city...'
const PLACEHOLDER_DESKTOP = 'Search by city, locality, or project...'

export function HeaderSearch({ className }: HeaderSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get('q') ?? '')
  const [placeholder, setPlaceholder] = useState(PLACEHOLDER_MOBILE)

  // Resolve the correct placeholder string based on viewport width
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = (e: MediaQueryListEvent | MediaQueryList) => {
      setPlaceholder(e.matches ? PLACEHOLDER_DESKTOP : PLACEHOLDER_MOBILE)
    }
    update(mq)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Keep input in sync when URL changes externally (e.g. browser back/forward)
  useEffect(() => {
    setValue(searchParams.get('q') ?? '')
  }, [searchParams])

  const push = (q: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (q.trim()) {
      params.set('q', q.trim())
    } else {
      params.delete('q')
    }
    router.push(`/?${params.toString()}`)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
    push(e.target.value)
  }

  const handleClear = () => {
    setValue('')
    push('')
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    push(value)
  }

  return (
    <form onSubmit={handleSubmit} className={cn('relative flex-1', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label="Search properties"
        className={cn(
          'h-10 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-muted)] pl-9 pr-8',
          'text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]',
          'transition-[border-color,box-shadow,background-color] focus:border-[var(--color-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/20',
          'sm:h-11',
        )}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-border)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </form>
  )
}
