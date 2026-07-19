import type { SupabaseClient } from '@supabase/supabase-js'

export type NotificationType =
  | 'InterestRequest'
  | 'Accepted'
  | 'Rejected'
  | 'PaymentReceived'
  | 'ConnectionUnlocked'
  | 'System'

interface CreateNotificationParams {
  admin: SupabaseClient
  userId: string
  title: string
  message: string
  type: NotificationType
  entityType?: string
  entityId?: string
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const { admin, userId, title, message, type, entityType, entityId } = params

  if (!userId) {
    console.warn('[notifications] createNotification called with empty userId — skipped')
    return
  }

  try {
    const { error } = await admin.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      read: false,
    })

    if (error) {
      // Surface clearly: if the table is missing (42P01) or the service role key
      // is wrong (403), the insert silently failed — log actionably, not just the
      // raw message.
      if (error.code === '42P01') {
        console.error(
          '[notifications] INSERT failed — table "notifications" does not exist.' +
            ' Run migration 003_notifications.sql in the Supabase SQL editor.',
        )
      } else if (error.message?.includes('service_role')) {
        console.error(
          '[notifications] INSERT failed — SUPABASE_SERVICE_ROLE_KEY may be wrong or missing.',
          error.message,
        )
      } else {
        console.error('[notifications] INSERT failed:', error.message, '(code:', error.code, ')')
      }
      // Non-fatal — notification failure must never break the primary action
    }
  } catch (err) {
    console.error('[notifications] unexpected error in createNotification:', err)
  }
}

export async function createNotifications(
  params: Omit<CreateNotificationParams, 'userId'> & { userIds: string[] },
): Promise<void> {
  const { userIds, ...rest } = params
  await Promise.all(userIds.map((userId) => createNotification({ userId, ...rest })))
}
