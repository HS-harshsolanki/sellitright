import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? ''

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const placeId = searchParams.get('placeId')?.trim()
  const sessionToken = searchParams.get('sessionToken')

  if (!placeId) {
    return NextResponse.json({ error: 'placeId is required' }, { status: 400 })
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ error: 'Places API not configured' }, { status: 503 })
  }

  try {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`
    const headers: Record<string, string> = {
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'location,displayName,formattedAddress,shortFormattedAddress',
    }
    // Passing the session token collapses all prior autocomplete calls into one
    // Place Details billing event — the autocomplete calls become free.
    if (sessionToken) headers['X-Goog-Session-Token'] = sessionToken

    const res = await fetch(url, { headers })

    if (!res.ok) {
      console.error('[api/places/details] Google error:', res.status, await res.text())
      return NextResponse.json({ error: 'Place lookup failed' }, { status: 502 })
    }

    const place = (await res.json()) as {
      location?: { latitude: number; longitude: number }
      displayName?: { text: string }
      formattedAddress?: string
      shortFormattedAddress?: string
    }

    return NextResponse.json({
      lat: place.location?.latitude ?? null,
      lng: place.location?.longitude ?? null,
      placeName: place.displayName?.text ?? null,
      formattedAddress: place.shortFormattedAddress ?? place.formattedAddress ?? null,
    })
  } catch (err) {
    console.error('[api/places/details] fetch error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
