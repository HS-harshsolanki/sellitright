export type AuditAction = 'approved' | 'rejected' | 'note_added' | 'status_changed'

export interface AuditEntry {
  id: string
  listing_id: string
  listing_title: string
  action: AuditAction
  previous_status: string | null
  new_status: string | null
  actor_id: string
  actor_role: string
  reason: string | null
  created_at: string
}

interface AddParams {
  listing_id: string
  listing_title: string
  action: AuditAction
  previous_status?: string | null
  new_status?: string | null
  actor_id: string
  actor_role: string
  reason?: string | null
}

let seq = 0
const entries: AuditEntry[] = []

export const auditLog = {
  add(params: AddParams): AuditEntry {
    seq++
    const entry: AuditEntry = {
      id: `audit-${seq}`,
      listing_id: params.listing_id,
      listing_title: params.listing_title,
      action: params.action,
      previous_status: params.previous_status ?? null,
      new_status: params.new_status ?? null,
      actor_id: params.actor_id,
      actor_role: params.actor_role,
      reason: params.reason ?? null,
      created_at: new Date().toISOString(),
    }
    entries.unshift(entry) // newest first
    return entry
  },

  getAll({ action, listingId }: { action?: string; listingId?: string } = {}): AuditEntry[] {
    return entries.filter((e) => {
      if (action && e.action !== action) return false
      if (listingId && e.listing_id !== listingId) return false
      return true
    })
  },
}
