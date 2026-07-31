import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'

import type { AiParseResponse, BHKType, PropertyType } from '@/components/search/smart-search-types'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 10

const bodySchema = z.object({
  query: z.string().min(1).max(500),
})

const VALID_BHK: BHKType[] = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK']
const VALID_TYPES: PropertyType[] = ['Apartment', 'Penthouse']

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
  'noida',
  'gurgaon',
  'gurugram',
  'navi mumbai',
  'thane',
]

const BHK_REGEX: { pattern: RegExp; value: BHKType }[] = [
  { pattern: /\b5\s*\+?\s*(?:bhk|bedroom|bed)/i, value: '5+ BHK' },
  { pattern: /\bfive\s*(?:bhk|bedroom)/i, value: '5+ BHK' },
  { pattern: /\b4\s*(?:bhk|bedroom|bed)/i, value: '4 BHK' },
  { pattern: /\bfour\s*(?:bhk|bedroom)/i, value: '4 BHK' },
  { pattern: /\b3\s*(?:bhk|bedroom|bed)/i, value: '3 BHK' },
  { pattern: /\bthree\s*(?:bhk|bedroom)/i, value: '3 BHK' },
  { pattern: /\b2\s*(?:bhk|bedroom|bed)/i, value: '2 BHK' },
  { pattern: /\btwo\s*(?:bhk|bedroom)/i, value: '2 BHK' },
  { pattern: /\b1\s*(?:bhk|bedroom|bed)/i, value: '1 BHK' },
  { pattern: /\bone\s*(?:bhk|bedroom)/i, value: '1 BHK' },
]

function parsePrice(raw: string): number | null {
  const s = raw.replace(/,/g, '').trim()
  const crore = s.match(/^([\d.]+)\s*(?:cr(?:ore)?s?)/i)
  if (crore) return Math.round(parseFloat(crore[1]!) * 1_00_00_000)
  const lakh = s.match(/^([\d.]+)\s*(?:l(?:ac|akh|akhs)?)/i)
  if (lakh) return Math.round(parseFloat(lakh[1]!) * 1_00_000)
  const plain = parseFloat(s)
  if (!isNaN(plain) && plain > 0) return Math.round(plain * 1_00_000)
  return null
}

function fastParse(query: string): Partial<AiParseResponse> {
  const q = query.toLowerCase()
  const result: Partial<AiParseResponse> = { bhkTypes: [], explanation: '' }

  // BHK — collect multiple if mentioned
  for (const { pattern, value } of BHK_REGEX) {
    if (pattern.test(q) && !result.bhkTypes!.includes(value)) {
      result.bhkTypes!.push(value)
    }
  }

  // Property type
  if (/\bpenthouse\b/.test(q)) result.propertyType = 'Penthouse'
  else if (/\bapartment\b/.test(q)) result.propertyType = 'Apartment'

  // Budget
  const between = q.match(
    /between\s+([\d.,]+\s*(?:cr(?:ore)?s?|l(?:ac|akh|akhs)?)?)\s+and\s+([\d.,]+\s*(?:cr(?:ore)?s?|l(?:ac|akh|akhs)?)?)/,
  )
  if (between) {
    result.budgetMin = parsePrice(between[1]!)
    result.budgetMax = parsePrice(between[2]!)
  } else {
    const under = q.match(
      /(?:under|below|less\s+than|up\s+to|max(?:imum)?)\s+([\d.,]+\s*(?:cr(?:ore)?s?|l(?:ac|akh|akhs)?)?)/,
    )
    if (under) result.budgetMax = parsePrice(under[1]!)
    const over = q.match(
      /(?:above|over|more\s+than|min(?:imum)?)\s+([\d.,]+\s*(?:cr(?:ore)?s?|l(?:ac|akh|akhs)?)?)/,
    )
    if (over) result.budgetMin = parsePrice(over[1]!)
  }

  // City
  const sorted = [...CITY_LIST].sort((a, b) => b.length - a.length)
  for (const city of sorted) {
    if (q.includes(city)) {
      result.city = city.replace(/\b\w/g, (c) => c.toUpperCase())
      break
    }
  }

  // Locality — "in X" pattern
  if (result.city) {
    const cityLower = result.city.toLowerCase().replace(/\s+/g, '\\s+')
    const locMatch = q.match(new RegExp(`\\bin\\s+([a-z\\s]+?),?\\s*(?:${cityLower})`))
    if (locMatch?.[1]) result.locality = locMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return result
}

const AI_RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>()
const AI_RATE_PER_HOUR = 30

function checkAiRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = AI_RATE_LIMIT_MAP.get(userId)
  if (!entry || entry.resetAt < now) {
    AI_RATE_LIMIT_MAP.set(userId, { count: 1, resetAt: now + 3_600_000 })
    return true
  }
  if (entry.count >= AI_RATE_PER_HOUR) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in to use AI search.' }, { status: 401 })
    }
    if (!checkAiRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Too many AI requests. Please wait before trying again.' },
        { status: 429 },
      )
    }

    const rawBody = (await request.json()) as unknown
    const { query } = bodySchema.parse(rawBody)

    const fast = fastParse(query)

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json<AiParseResponse>({
        city: fast.city ?? null,
        locality: fast.locality ?? null,
        bhkTypes: fast.bhkTypes ?? [],
        propertyType: fast.propertyType ?? null,
        budgetMin: fast.budgetMin ?? null,
        budgetMax: fast.budgetMax ?? null,
        explanation: query,
      })
    }

    const system = `You are a parser for Indian real estate property search queries.
Extract structured search parameters and return ONLY valid JSON — no markdown, no code fences.

JSON format:
{
  "city": "<title-case city name>" | null,
  "locality": "<area/neighbourhood>" | null,
  "bhkTypes": ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5+ BHK"] (array, can be empty or multi),
  "propertyType": "Apartment" | "Villa" | "Plot" | "Studio" | null,
  "budgetMin": <integer rupees> | null,
  "budgetMax": <integer rupees> | null,
  "explanation": "<15-word human-readable summary like '2 BHK in Bandra under ₹1.5Cr, Furnished'>"
}

Price rules: 1Cr=10000000, 1.5Cr=15000000, 75L=7500000, 50L=5000000.
Multiple BHK types can be requested: "2 or 3 BHK" → ["2 BHK","3 BHK"].`

    const anthropic = new Anthropic({ apiKey })
    const abort = new AbortController()
    const tid = setTimeout(() => abort.abort(), 8000)

    let message
    try {
      message = await anthropic.messages.create(
        {
          model: 'claude-haiku-4-5-WS-03A8',
          max_tokens: 250,
          system,
          messages: [{ role: 'user', content: `Parse: "${query}"` }],
        },
        { signal: abort.signal },
      )
    } finally {
      clearTimeout(tid)
    }

    const textBlock = message.content.find((b) => b.type === 'text')
    const raw = textBlock?.type === 'text' ? textBlock.text.trim() : ''

    try {
      const json = raw
        .replace(/^```(?:json)?\n?/, '')
        .replace(/\n?```$/, '')
        .trim()
      const parsed = JSON.parse(json) as {
        city?: string | null
        locality?: string | null
        bhkTypes?: string[]
        propertyType?: string | null
        budgetMin?: number | null
        budgetMax?: number | null
        explanation?: string
      }

      const bhkTypes = (parsed.bhkTypes ?? []).filter((v): v is BHKType =>
        VALID_BHK.includes(v as BHKType),
      )
      const propertyType = VALID_TYPES.includes(parsed.propertyType as PropertyType)
        ? (parsed.propertyType as PropertyType)
        : null

      return NextResponse.json<AiParseResponse>({
        city: typeof parsed.city === 'string' ? parsed.city.trim() : (fast.city ?? null),
        locality:
          typeof parsed.locality === 'string' ? parsed.locality.trim() : (fast.locality ?? null),
        bhkTypes: bhkTypes.length > 0 ? bhkTypes : (fast.bhkTypes ?? []),
        propertyType: propertyType ?? fast.propertyType ?? null,
        budgetMin:
          typeof parsed.budgetMin === 'number' ? parsed.budgetMin : (fast.budgetMin ?? null),
        budgetMax:
          typeof parsed.budgetMax === 'number' ? parsed.budgetMax : (fast.budgetMax ?? null),
        explanation: typeof parsed.explanation === 'string' ? parsed.explanation.trim() : query,
      })
    } catch {
      return NextResponse.json<AiParseResponse>({
        city: fast.city ?? null,
        locality: fast.locality ?? null,
        bhkTypes: fast.bhkTypes ?? [],
        propertyType: fast.propertyType ?? null,
        budgetMin: fast.budgetMin ?? null,
        budgetMax: fast.budgetMax ?? null,
        explanation: query,
      })
    }
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 })
    }
    console.error('[ai-parse]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
