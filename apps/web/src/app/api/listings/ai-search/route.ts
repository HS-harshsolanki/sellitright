import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'

export const maxDuration = 10

const bodySchema = z.object({
  query: z.string().min(1).max(500),
})

// Parsed filter shape returned to the client
export interface AISearchFilters {
  bhkType?: string
  minPrice?: number
  maxPrice?: number
  furnishing?: string
  propertyType?: string
  city?: string
  locality?: string
}

export interface AISearchResponse {
  filters: AISearchFilters
  interpretation: string
}

// ─── Client-side deterministic parser (used in the API for fallback as well) ─

const BHK_REGEX: { pattern: RegExp; value: string }[] = [
  { pattern: /\b5\s*\+?\s*(?:bhk|bedroom|bed)/i, value: '5+ BHK' },
  { pattern: /\b5\s*bhk\b/i, value: '5+ BHK' },
  { pattern: /\bfive\s*(?:bhk|bedroom|bed)/i, value: '5+ BHK' },
  { pattern: /\b4\s*(?:bhk|bedroom|bed)/i, value: '4 BHK' },
  { pattern: /\bfour\s*(?:bhk|bedroom|bed)/i, value: '4 BHK' },
  { pattern: /\b3\s*(?:bhk|bedroom|bed)/i, value: '3 BHK' },
  { pattern: /\bthree\s*(?:bhk|bedroom|bed)/i, value: '3 BHK' },
  { pattern: /\b2\s*(?:bhk|bedroom|bed)/i, value: '2 BHK' },
  { pattern: /\btwo\s*(?:bhk|bedroom|bed)/i, value: '2 BHK' },
  { pattern: /\b1\s*(?:bhk|bedroom|bed)/i, value: '1 BHK' },
  { pattern: /\bone\s*(?:bhk|bedroom|bed)/i, value: '1 BHK' },
  { pattern: /\bstudio\b/i, value: '1 BHK' },
]

// Price parsing: supports L/Lac/Lakh, Cr/Crore, plain numbers (treated as L)
function parsePrice(raw: string): number | null {
  const s = raw.replace(/,/g, '').trim()
  const croreMatch = s.match(/^([\d.]+)\s*(?:cr(?:ore)?s?)/i)
  if (croreMatch) return Math.round(parseFloat(croreMatch[1]!) * 1_00_00_000)
  const lakhMatch = s.match(/^([\d.]+)\s*(?:l(?:ac|akh|akhs)?)/i)
  if (lakhMatch) return Math.round(parseFloat(lakhMatch[1]!) * 1_00_000)
  const plain = parseFloat(s)
  if (!isNaN(plain) && plain > 0) return Math.round(plain * 1_00_000) // assume lakhs
  return null
}

// Known Indian cities — add more as needed
const CITY_LIST = [
  'mumbai',
  'delhi',
  'bangalore',
  'bengaluru',
  'hyderabad',
  'chennai',
  'pune',
  'ahmedabad',
  'kolkata',
  'surat',
  'jaipur',
  'lucknow',
  'kanpur',
  'nagpur',
  'indore',
  'thane',
  'bhopal',
  'visakhapatnam',
  'pimpri',
  'patna',
  'vadodara',
  'ghaziabad',
  'ludhiana',
  'agra',
  'nashik',
  'faridabad',
  'meerut',
  'rajkot',
  'kalyan',
  'noida',
  'gurgaon',
  'gurugram',
  'navi mumbai',
  'kochi',
  'coimbatore',
  'chandigarh',
  'mysore',
  'mysuru',
  'bhubaneswar',
  'dehradun',
  'goa',
]

interface DeterministicResult {
  filters: AISearchFilters
  confidence: 'high' | 'low'
  parts: string[]
}

function deterministicParse(query: string): DeterministicResult {
  const q = query.toLowerCase()
  const filters: AISearchFilters = {}
  const parts: string[] = []

  // BHK
  for (const { pattern, value } of BHK_REGEX) {
    if (pattern.test(q)) {
      filters.bhkType = value
      parts.push(value)
      break
    }
  }

  // Property type
  if (/\bvilla\b/.test(q)) {
    filters.propertyType = 'Villa'
    parts.push('Villa')
  } else if (/\bpenthouse\b/.test(q)) {
    filters.propertyType = 'Penthouse'
    parts.push('Penthouse')
  } else if (/\bplot\b/.test(q)) {
    filters.propertyType = 'Plot'
    parts.push('Plot')
  } else if (/\bstudio\b/.test(q)) {
    filters.propertyType = 'Studio'
    parts.push('Studio')
  } else if (/\bapartment\b/.test(q)) {
    filters.propertyType = 'Apartment'
    parts.push('Apartment')
  }

  // Furnishing
  if (
    /\bfully\s*furnished\b/.test(q) ||
    (/\bfurnished\b/.test(q) && !/\bun\s*furnished\b|semi/.test(q))
  ) {
    filters.furnishing = 'Furnished'
    parts.push('Furnished')
  } else if (/\bsemi[\s-]*furnished\b/.test(q)) {
    filters.furnishing = 'Semi Furnished'
    parts.push('Semi Furnished')
  } else if (/\bun\s*furnished\b/.test(q)) {
    filters.furnishing = 'Unfurnished'
    parts.push('Unfurnished')
  }

  // Price — "under/below X" → maxPrice; "above/over X" → minPrice; "between X and Y"
  const betweenMatch = q.match(
    /between\s+([\d.,]+\s*(?:cr(?:ore)?s?|l(?:ac|akh|akhs)?)?)\s+and\s+([\d.,]+\s*(?:cr(?:ore)?s?|l(?:ac|akh|akhs)?)?)/,
  )
  if (betweenMatch) {
    const lo = parsePrice(betweenMatch[1]!)
    const hi = parsePrice(betweenMatch[2]!)
    if (lo) filters.minPrice = lo
    if (hi) filters.maxPrice = hi
  } else {
    const underMatch = q.match(
      /(?:under|below|less\s+than|up\s+to|max(?:imum)?)\s+([\d.,]+\s*(?:cr(?:ore)?s?|l(?:ac|akh|akhs)?)?)/,
    )
    if (underMatch) {
      const v = parsePrice(underMatch[1]!)
      if (v) {
        filters.maxPrice = v
        parts.push(`under ${underMatch[1]?.trim()}`)
      }
    }
    const overMatch = q.match(
      /(?:above|over|more\s+than|min(?:imum)?)\s+([\d.,]+\s*(?:cr(?:ore)?s?|l(?:ac|akh|akhs)?)?)/,
    )
    if (overMatch) {
      const v = parsePrice(overMatch[1]!)
      if (v) {
        filters.minPrice = v
        parts.push(`above ${overMatch[1]?.trim()}`)
      }
    }
  }

  // City — try multi-word cities first, then single
  let cityFound = false
  const sortedCities = [...CITY_LIST].sort((a, b) => b.length - a.length)
  for (const city of sortedCities) {
    if (q.includes(city)) {
      filters.city = city.replace(/\b\w/g, (c) => c.toUpperCase())
      parts.push(filters.city)
      cityFound = true
      break
    }
  }

  // Locality — common pattern: "in <locality>, <city>" or "in <locality>"
  if (!cityFound) {
    const inMatch = q.match(
      /\bin\s+([a-z\s]+?)(?:\s*,|\s*$|\s+under|\s+above|\s+between|\s+bhk|\s+furnished)/,
    )
    if (inMatch?.[1]) {
      const loc = inMatch[1].trim()
      if (loc.length > 1) {
        filters.locality = loc.replace(/\b\w/g, (c) => c.toUpperCase())
        parts.push(filters.locality)
      }
    }
  } else {
    // Try to extract locality from "in <locality>, <city>"
    const cityLower = (filters.city ?? '').toLowerCase()
    const cityPattern = cityLower.replace(/\s+/g, '\\s+')
    const locMatch = q.match(new RegExp(`\\bin\\s+([a-z\\s]+?),\\s*(?:${cityPattern})`))
    if (locMatch?.[1]) {
      const loc = locMatch[1].trim()
      if (loc.length > 1) {
        filters.locality = loc.replace(/\b\w/g, (c) => c.toUpperCase())
        parts.push(filters.locality)
      }
    }
  }

  const hasAny = Object.keys(filters).length > 0
  const hasEnough = (filters.bhkType || filters.city) && hasAny
  return {
    filters,
    confidence: hasEnough ? 'high' : 'low',
    parts,
  }
}

function buildInterpretation(filters: AISearchFilters, parts: string[]): string {
  if (parts.length === 0) return 'Showing all properties'
  return parts.join(', ')
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const rawBody = (await request.json()) as unknown
    const body = bodySchema.parse(rawBody)
    const { query } = body

    // 1. Try deterministic parser first
    const det = deterministicParse(query)
    if (det.confidence === 'high') {
      const interpretation = buildInterpretation(det.filters, det.parts)
      return NextResponse.json<AISearchResponse>({
        filters: det.filters,
        interpretation,
      })
    }

    // 2. Fallback: Anthropic API
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      // Return partial deterministic result even if low-confidence
      const interpretation = buildInterpretation(det.filters, det.parts) || query
      return NextResponse.json<AISearchResponse>({
        filters: det.filters,
        interpretation,
      })
    }

    const systemPrompt = `You are a parser for Indian real estate property search queries.
Extract structured filter parameters from the user's natural-language query and return ONLY valid JSON — no markdown, no code fences, no explanation.

JSON format:
{
  "filters": {
    "bhkType": "1 BHK" | "2 BHK" | "3 BHK" | "4 BHK" | "5+ BHK" | null,
    "minPrice": <number in rupees, integer> | null,
    "maxPrice": <number in rupees, integer> | null,
    "furnishing": "Furnished" | "Semi Furnished" | "Unfurnished" | null,
    "propertyType": "Apartment" | "Penthouse" | "Villa" | "Plot" | "Studio" | null,
    "city": "<city name, title-case>" | null,
    "locality": "<locality/area, title-case>" | null
  },
  "interpretation": "<short human-readable summary, e.g. '2 BHK in Pune under ₹1.5Cr, Furnished'>"
}

Price conversion rules:
- "1 Cr" = 10000000, "1.5 Cr" = 15000000, "75L" = 7500000, "50 Lakh" = 5000000
- "under X" → maxPrice only, "above X" → minPrice only, "between X and Y" → both

Only include non-null fields in filters. Return null for anything not mentioned.`

    const anthropic = new Anthropic({ apiKey })
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 8000)

    let message
    try {
      message = await anthropic.messages.create(
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          messages: [
            {
              role: 'user',
              content: `Parse this property search query: "${query}"`,
            },
          ],
          system: systemPrompt,
        },
        { signal: abortController.signal },
      )
    } finally {
      clearTimeout(timeoutId)
    }

    const textBlock = message.content.find((b) => b.type === 'text')
    const rawText = textBlock?.type === 'text' ? textBlock.text.trim() : ''

    try {
      const jsonText = rawText
        .replace(/^```(?:json)?\n?/, '')
        .replace(/\n?```$/, '')
        .trim()
      const parsed = JSON.parse(jsonText) as {
        filters?: AISearchFilters
        interpretation?: string
      }

      const filters: AISearchFilters = {}

      // Validate and copy only known filter keys
      const raw = parsed.filters ?? {}
      const validBHK = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK']
      const validFurn = ['Furnished', 'Semi Furnished', 'Unfurnished']
      const validType = ['Apartment', 'Penthouse', 'Villa', 'Plot', 'Studio']

      if (raw.bhkType && validBHK.includes(raw.bhkType)) filters.bhkType = raw.bhkType
      if (raw.furnishing && validFurn.includes(raw.furnishing)) filters.furnishing = raw.furnishing
      if (raw.propertyType && validType.includes(raw.propertyType))
        filters.propertyType = raw.propertyType
      if (typeof raw.minPrice === 'number' && raw.minPrice > 0) filters.minPrice = raw.minPrice
      if (typeof raw.maxPrice === 'number' && raw.maxPrice > 0) filters.maxPrice = raw.maxPrice
      if (typeof raw.city === 'string' && raw.city.trim()) filters.city = raw.city.trim()
      if (typeof raw.locality === 'string' && raw.locality.trim())
        filters.locality = raw.locality.trim()

      const interpretation =
        typeof parsed.interpretation === 'string' && parsed.interpretation.trim()
          ? parsed.interpretation.trim()
          : query

      return NextResponse.json<AISearchResponse>({ filters, interpretation })
    } catch {
      // JSON parse failed — return deterministic result
      const interpretation = buildInterpretation(det.filters, det.parts) || query
      return NextResponse.json<AISearchResponse>({
        filters: det.filters,
        interpretation,
      })
    }
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out — please try again' }, { status: 504 })
    }
    console.error('[ai-search] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
