import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'

import { createClient } from '@/lib/supabase/server'

export const maxDuration = 10

const bodySchema = z.object({
  propertyType: z.string().min(1),
  bhkType: z.string().optional().nullable(),
  builtUpArea: z.number().int().positive().optional().nullable(),
  city: z.string().min(1),
  locality: z.string().min(1),
  furnishing: z.string().optional().nullable(),
  bathrooms: z.number().int().nonnegative().optional().nullable(),
  balconies: z.number().int().nonnegative().optional().nullable(),
  floor: z.number().int().optional().nullable(),
  totalFloors: z.number().int().optional().nullable(),
  facing: z.string().optional().nullable(),
  parking: z.string().optional().nullable(),
  ageOfProperty: z.number().int().optional().nullable(),
  amenities: z.array(z.string()).optional(),
  tone: z.enum(['warm', 'professional', 'luxury', 'concise']).default('warm'),
})

const BHK_LABELS: Record<string, string> = {
  ONE_BHK: '1 BHK',
  TWO_BHK: '2 BHK',
  THREE_BHK: '3 BHK',
  FOUR_BHK: '4 BHK',
  FIVE_PLUS_BHK: '5+ BHK',
}

const FURNISHING_LABELS: Record<string, string> = {
  FURNISHED: 'Fully Furnished',
  SEMI_FURNISHED: 'Semi-Furnished',
  UNFURNISHED: 'Unfurnished',
}

const FACING_LABELS: Record<string, string> = {
  NORTH: 'North',
  SOUTH: 'South',
  EAST: 'East',
  WEST: 'West',
  NORTH_EAST: 'North-East',
  NORTH_WEST: 'North-West',
  SOUTH_EAST: 'South-East',
  SOUTH_WEST: 'South-West',
}

const PARKING_LABELS: Record<string, string> = {
  COVERED: 'Covered parking',
  OPEN: 'Open parking',
  BOTH: 'Covered & open parking',
  NONE: 'No parking',
}

const TONE_INSTRUCTIONS: Record<string, { style: string; length: string }> = {
  warm: {
    style: 'friendly and warm — welcoming, personal, buyer-focused',
    length: '4–5 sentences (~80–100 words)',
  },
  professional: {
    style: 'formal and professional — clear, measured, businesslike',
    length: '4–5 sentences (~80–100 words)',
  },
  luxury: {
    style: 'aspirational and premium — evocative, upscale, desirable',
    length: '4–5 sentences (~90–110 words)',
  },
  concise: {
    style: 'concise and factual — no filler words, just the key facts',
    length: '2–3 crisp sentences (~40–60 words)',
  },
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('[ai-description] ANTHROPIC_API_KEY not set')
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }

    const rawBody = (await request.json()) as unknown
    const body = bodySchema.parse(rawBody)

    const bhkLabel = body.bhkType ? (BHK_LABELS[body.bhkType] ?? body.bhkType) : null
    const furnishingLabel = body.furnishing
      ? (FURNISHING_LABELS[body.furnishing] ?? body.furnishing)
      : null
    const facingLabel = body.facing ? (FACING_LABELS[body.facing] ?? body.facing) : null
    const parkingLabel = body.parking ? (PARKING_LABELS[body.parking] ?? body.parking) : null
    const amenitiesList = body.amenities?.length ? body.amenities.join(', ') : null
    const propertyLabel = body.propertyType.charAt(0) + body.propertyType.slice(1).toLowerCase()
    const toneConfig = (TONE_INSTRUCTIONS[body.tone] ?? TONE_INSTRUCTIONS.warm)!

    const details = [
      body.builtUpArea ? `Built-up area: ${body.builtUpArea.toLocaleString('en-IN')} sq ft` : null,
      furnishingLabel ? `Furnishing: ${furnishingLabel}` : null,
      body.bathrooms != null ? `Bathrooms: ${body.bathrooms}` : null,
      body.balconies != null ? `Balconies: ${body.balconies}` : null,
      body.floor != null && body.totalFloors != null
        ? `Floor: ${body.floor} of ${body.totalFloors}`
        : body.floor != null
          ? `Floor: ${body.floor}`
          : null,
      facingLabel ? `Facing: ${facingLabel}` : null,
      parkingLabel ? `Parking: ${parkingLabel}` : null,
      body.ageOfProperty != null
        ? `Age of property: ${body.ageOfProperty} year${body.ageOfProperty === 1 ? '' : 's'}`
        : null,
      amenitiesList ? `Amenities: ${amenitiesList}` : null,
    ].filter(Boolean)

    const prompt = [
      'You are a real estate listing writer for India. Respond with valid JSON only — no markdown, no explanation, no code fences.',
      'JSON format: { "title": "...", "description": "..." }',
      'Title: 6–10 words, compelling, specific to the property. Do not include price.',
      `Description: ${toneConfig.length}, tone is ${toneConfig.style}. Use only the details provided — do not invent details. Do not include price.`,
      '',
      `Property: ${[bhkLabel, propertyLabel].filter(Boolean).join(' ')} in ${body.locality}, ${body.city}`,
      ...details,
    ].join('\n')

    const anthropic = new Anthropic({ apiKey })
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 8000)

    let message
    try {
      message = await anthropic.messages.create(
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }],
        },
        { signal: abortController.signal },
      )
    } finally {
      clearTimeout(timeoutId)
    }

    const textBlock = message.content.find((b) => b.type === 'text')
    const rawText = textBlock?.type === 'text' ? textBlock.text.trim() : ''

    let title = ''
    let description = ''
    try {
      const jsonText = rawText
        .replace(/^```(?:json)?\n?/, '')
        .replace(/\n?```$/, '')
        .trim()
      const parsed = JSON.parse(jsonText) as { title?: string; description?: string }
      title = (typeof parsed.title === 'string' ? parsed.title : '').trim()
      description = (typeof parsed.description === 'string' ? parsed.description : '').trim()
    } catch {
      description = rawText
    }

    if (!description) {
      return NextResponse.json({ error: 'Failed to generate description' }, { status: 500 })
    }

    return NextResponse.json({ title, description })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Generation timed out — please try again' },
        { status: 504 },
      )
    }
    console.error('[ai-description] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
