import crypto from 'crypto'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''

export function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_KEY) return false
  const provided = request.headers.get('x-admin-key') ?? ''
  if (provided.length !== ADMIN_KEY.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(ADMIN_KEY))
  } catch {
    return false
  }
}

export async function logAdminAction(
  admin: SupabaseClient,
  params: {
    action: string
    entityType: 'listing' | 'user' | 'report' | 'payment'
    entityId: string
    listingId?: string
    listingTitle?: string
    previousStatus?: string | null
    newStatus?: string | null
    previousValue?: Record<string, unknown>
    newValue?: Record<string, unknown>
    reason?: string
    note?: string
  },
): Promise<void> {
  try {
    await admin.from('audit_log').insert({
      listing_id: params.listingId ?? params.entityId,
      listing_title: params.listingTitle ?? params.entityId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      previous_status: params.previousStatus ?? null,
      new_status: params.newStatus ?? null,
      previous_value: params.previousValue ?? null,
      new_value: params.newValue ?? null,
      actor_id: 'api_key',
      actor_role: 'reviewer',
      reason: params.reason ?? params.note ?? null,
    })
  } catch (err) {
    console.error('[admin-auth] logAdminAction error:', err)
  }
}
