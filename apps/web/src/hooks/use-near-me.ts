'use client'

import { useCallback, useState } from 'react'

import { SUPPORTED_CITIES } from '@/components/search/smart-search-types'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

const CITY_ALIASES: Record<string, string> = {
  mumbai: 'Mumbai',
  'navi mumbai': 'Mumbai',
  thane: 'Mumbai',
  pune: 'Pune',
  pimpri: 'Pune',
  chinchwad: 'Pune',
  bangalore: 'Bangalore',
  bengaluru: 'Bangalore',
}

async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ city: string | null; locality: string | null }> {
  if (!MAPBOX_TOKEN) return { city: null, locality: null }
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,neighborhood,locality&language=en&access_token=${MAPBOX_TOKEN}`
  const res = await fetch(url)
  if (!res.ok) return { city: null, locality: null }
  const data = (await res.json()) as {
    features: { place_type: string[]; text: string; context?: { id: string; text: string }[] }[]
  }

  let city: string | null = null
  let locality: string | null = null

  for (const feature of data.features) {
    const text = feature.text.toLowerCase()
    if (!city) {
      const matched =
        CITY_ALIASES[text] ??
        SUPPORTED_CITIES.find((c) => c.toLowerCase() === text) ??
        (feature.context ?? []).reduce<string | null>((found, ctx) => {
          if (found) return found
          const ctxText = ctx.text.toLowerCase()
          return (
            CITY_ALIASES[ctxText] ??
            SUPPORTED_CITIES.find((c) => c.toLowerCase() === ctxText) ??
            null
          )
        }, null)
      if (matched) city = matched
    }
    if (
      !locality &&
      (feature.place_type.includes('neighborhood') || feature.place_type.includes('locality'))
    ) {
      locality = feature.text.replace(/\b\w/g, (c) => c.toUpperCase())
    }
  }

  return { city, locality }
}

export type NearMeState = 'idle' | 'loading' | 'error'

export interface NearMeResult {
  city: string
  locality: string | null
}

export function useNearMe(onSuccess: (result: NearMeResult) => void) {
  const [state, setState] = useState<NearMeState>('idle')
  const [error, setError] = useState<string | null>(null)

  const trigger = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser.')
      setState('error')
      return
    }
    setState('loading')
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { city, locality } = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
          if (!city) {
            setError('No supported city near you. Try searching manually.')
            setState('error')
            return
          }
          setState('idle')
          onSuccess({ city, locality })
        } catch {
          setError('Location lookup failed. Try again.')
          setState('error')
        }
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access denied. Enable it in browser settings.'
            : 'Could not get your location. Try again.',
        )
        setState('error')
      },
      { timeout: 10000, maximumAge: 60000 },
    )
  }, [onSuccess])

  return { state, error, trigger }
}
