const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

export interface GeocodeResult {
  lat: number
  lng: number
  placeName?: string
}

/**
 * Geocode a free-text query against the Mapbox Geocoding API.
 * Works in both server and browser environments.
 * Returns null if the token is missing, the request fails, or no result is found.
 */
export async function geocodePlace(query: string): Promise<GeocodeResult | null> {
  if (!MAPBOX_TOKEN || !query.trim()) return null

  try {
    const encoded = encodeURIComponent(query.trim())
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&country=IN&limit=1&types=neighborhood,locality,place,address,poi`

    const res = await fetch(url)
    if (!res.ok) return null

    const data = (await res.json()) as {
      features?: Array<{ center: [number, number]; place_name?: string }>
    }
    const feature = data.features?.[0]
    if (!feature) return null

    const [lng, lat] = feature.center
    return { lat, lng, placeName: feature.place_name }
  } catch {
    return null
  }
}

/**
 * Build a geocoding query from listing location fields.
 * Prefers the most specific combination available:
 *   society + locality + city > locality + city > city
 */
export function buildLocationQuery(opts: {
  societyName?: string | null
  locality?: string | null
  city?: string | null
}): string | null {
  const { societyName, locality, city } = opts
  if (!city) return null

  const parts: string[] = []
  if (societyName?.trim()) parts.push(societyName.trim())
  if (locality?.trim()) parts.push(locality.trim())
  parts.push(city.trim())

  return parts.join(', ')
}
