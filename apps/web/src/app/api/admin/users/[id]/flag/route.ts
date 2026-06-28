import { timingSafeEqual } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { createServiceClient } from '@/lib/supabase/server'
import { computeAndStoreRiskScore } from '@/lib/trust'
import { adminFlagUserSchema } from '@/lib/validators'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_KEY) return false
  const provided = request.headers.get('x-admin-key') ?? ''
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(ADMIN_KEY))
  } catch {
    return false
  }
}

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/admin/users/:id/flag
// Applies an admin flag to a user. Appends to user_flags (one row per action).
// Body: { flag: 'SPAM' | 'BROKER_SUSPECTED' | 'NEEDS_REVIEW' | 'SUSPENDED' | 'CLEARED', reason? }
export async function POST(request: NextRequest, { params }: RouteContext) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: userId } = await params

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  let validated: ReturnType<typeof adminFlagUserSchema.parse>
  try {
    validated = adminFlagUserSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', issues: err.errors }, { status: 400 })
    }
    throw err
  }

  // Confirm user exists (admin.auth.admin requires service role)
  const { data: userRecord, error: userErr } = await admin.auth.admin.getUserById(userId)

  if (userErr || !userRecord?.user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  }

  const { data: flag, error: insertErr } = await admin
    .from('user_flags')
    .insert({
      user_id: userId,
      flag: validated.flag,
      reason: validated.reason ?? null,
      flagged_by: 'api_key',
    })
    .select('id, user_id, flag, reason, created_at')
    .single()

  if (insertErr) {
    console.error('[admin/flag] insert error:', insertErr.message)
    return NextResponse.json({ error: 'Failed to flag user.' }, { status: 500 })
  }

  // Recompute risk score after flagging (fire-and-forget)
  void computeAndStoreRiskScore(admin, userId)

  return NextResponse.json(flag, { status: 201 })
}

// GET /api/admin/users/:id/flag
// Returns the current flag and risk score for a user.
export async function GET(request: NextRequest, { params }: RouteContext) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: userId } = await params

  const admin = createServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service not configured.' }, { status: 503 })
  }

  const [flagRes, riskRes, flagHistoryRes] = await Promise.all([
    admin
      .from('latest_user_flag')
      .select('flag, reason, flagged_by, created_at')
      .eq('user_id', userId)
      .maybeSingle(),

    admin
      .from('risk_scores')
      .select('score, level, signals, last_computed_at')
      .eq('user_id', userId)
      .maybeSingle(),

    admin
      .from('user_flags')
      .select('id, flag, reason, flagged_by, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return NextResponse.json({
    userId,
    currentFlag: flagRes.data ?? null,
    riskScore: riskRes.data ?? null,
    flagHistory: flagHistoryRes.data ?? [],
  })
}
