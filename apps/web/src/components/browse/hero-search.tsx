'use client'

import { useRouter } from 'next/navigation'

import type { ParsedFilters } from '@/components/browse/ai-finder-button'
import { SearchBar } from '@/components/search/search-bar'

export function HeroSearch() {
  const router = useRouter()

  const handleSearch = (q: string) => {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    router.push(`/properties${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const handleAISearch = (filters: ParsedFilters, interpretation: string) => {
    // Navigate to /properties and pass AI params via sessionStorage so browse-client picks them up
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sir_pending_ai_search', JSON.stringify({ filters, interpretation }))
    }
    router.push('/properties')
  }

  return (
    <SearchBar onSearch={handleSearch} onAISearch={handleAISearch} showAIToggle className="mx-0" />
  )
}
