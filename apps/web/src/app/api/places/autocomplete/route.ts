import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? ''

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const input = searchParams.get('input')?.trim()
  const sessionToken = searchParams.get('sessionToken')
  const locationBias = searchParams.get('locationBias') // "lat,lng"

  if (!input || input.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ error: 'Places API not configured' }, { status: 503 })
  }

  const body: Record<string, unknown> = {
    input,
    includedPrimaryTypes: [
      'apartment_complex',
      'housing_complex',
      'condominium_complex',
      'establishment',
    ],
    languageCode: 'en',
    regionCode: 'IN',
  }

  if (sessionToken) body.sessionToken = sessionToken

  if (locationBias) {
    const parts = locationBias.split(',').map(Number)
    const lat = parts[0]
    const lng = parts[1]
    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      body.locationBias = {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 50000, // 50km — Google Places API (New) hard limit is 50,000m
        },
      }
    }
  }

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errorBody = await res.text()
      console.error('[api/places/autocomplete] Google error:', res.status, errorBody)
      return NextResponse.json({ suggestions: [], _debug: res.status })
    }

    const data = (await res.json()) as {
      suggestions?: Array<{
        placePrediction?: {
          placeId: string
          text: { text: string }
          structuredFormat?: {
            mainText: { text: string }
            secondaryText?: { text: string }
          }
        }
      }>
    }

    const suggestions = (data.suggestions ?? [])
      .filter((s) => s.placePrediction)
      .slice(0, 5)
      .map((s) => ({
        placeId: s.placePrediction!.placeId,
        text: s.placePrediction!.text.text,
        mainText:
          s.placePrediction!.structuredFormat?.mainText.text ?? s.placePrediction!.text.text,
        secondaryText: s.placePrediction!.structuredFormat?.secondaryText?.text ?? '',
      }))

    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('[api/places/autocomplete] fetch error:', err)
    return NextResponse.json({ suggestions: [] })
  }
}
