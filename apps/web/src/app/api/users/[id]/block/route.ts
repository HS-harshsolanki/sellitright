import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/trust'
import { blockUserSchema } from '@/lib/validators'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/users/:id/block
// Blocks a user. Directional — caller blocks the target.
// Idempotent: blocking already-blocked user returns 409.
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id: targetId } = await params

  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    return NextResponse.json({ error: 'Sign in to block a user.' }, { status: 401 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to block a user.' }, { status: 401 })
  }

  if (user.id === targetId) {
    return NextResponse.json({ error: 'You cannot block yourself.' }, { status: 422 })
  }

  let body: { reason?: string } = {}
  try {
    const raw = await request.json()
    body = blockUserSchema.parse(raw)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', issues: err.errors }, { status: 400 })
    }
    // Empty body is fine
    body = {}
  }

  // Insert via RLS-allowed user policy (blocker_id = auth.uid() check)
  const { data: block, error: insertErr } = await supabase
    .from('blocked_users')
    .insert({
      blocker_id: user.id,
      blockee_id: targetId,
      reason: body.reason ?? null,
    })
    .select('id, blockee_id, created_at')
    .single()

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json({ error: 'You have already blocked this user.' }, { status: 409 })
    }
    console.error('[block] insert error:', insertErr.message)
    return NextResponse.json({ error: 'Failed to block user.' }, { status: 500 })
  }

  // Log activity (fire-and-forget)
  const admin = createServiceClient()
  if (admin) {
    await logActivity(admin, {
      userId: user.id,
      action: 'block',
      entityType: 'user',
      entityId: targetId,
    })
  }

  return NextResponse.json(
    { id: block.id, blockeeId: block.blockee_id, createdAt: block.created_at },
    { status: 201 },
  )
}

// DELETE /api/users/:id/block
// Removes a block. Returns 204 even if block didn't exist (idempotent).
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id: targetId } = await params

  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    return NextResponse.json({ error: 'Sign in to unblock a user.' }, { status: 401 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to unblock a user.' }, { status: 401 })
  }

  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blockee_id', targetId)

  if (error) {
    console.error('[block] delete error:', error.message)
    return NextResponse.json({ error: 'Failed to unblock user.' }, { status: 500 })
  }

  const admin = createServiceClient()
  if (admin) {
    await logActivity(admin, {
      userId: user.id,
      action: 'unblock',
      entityType: 'user',
      entityId: targetId,
    })
  }

  return new NextResponse(null, { status: 204 })
}

// GET /api/users/:id/block
// Returns whether the authenticated user has blocked the target.
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id: targetId } = await params

  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    return NextResponse.json({ isBlocked: false })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ isBlocked: false })
  }

  const { data } = await supabase
    .from('blocked_users')
    .select('id')
    .eq('blocker_id', user.id)
    .eq('blockee_id', targetId)
    .maybeSingle()

  return NextResponse.json({ isBlocked: !!data })
}
