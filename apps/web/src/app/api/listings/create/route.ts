import { listingCreateSchema } from '@/lib/validators'
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    const validated = listingCreateSchema.parse(body)

    return NextResponse.json(
      {
        id: 'listing-' + Date.now(),
        ...validated,
        status: 'PENDING_REVIEW',
        createdAt: new Date().toISOString(),
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', issues: error.errors },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
