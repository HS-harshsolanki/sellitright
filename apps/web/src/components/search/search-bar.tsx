'use client'

import { Search, X } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

interface SearchBarProps {
  onSearch?: (query: string) => void
  defaultValue?: string
  /** When true, removes max-width cap and centering — for inline use within a filter row */
  inline?: boolean
}

export function SearchBar({ onSearch, defaultValue = '', inline = false }: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue)

  const handleChange = (value: string) => {
    setQuery(value)
    onSearch?.(value)
  }

  const handleClear = () => {
    setQuery('')
    onSearch?.('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch?.(query)
  }

  return (
    <form onSubmit={handleSubmit} className={cn('w-full', !inline && 'mx-auto max-w-xl')}>
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="City, locality, or project..."
          className={cn(
            'focus:ring-primary/20 w-full rounded-full border border-[var(--color-border)] bg-white pl-10 pr-9 text-sm text-gray-900 shadow-sm transition-shadow placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2',
            inline ? 'h-11' : 'h-12 md:h-14 md:text-base',
          )}
          aria-label="Search properties"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  )
}
