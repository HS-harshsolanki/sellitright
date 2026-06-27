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
    console.error('[notifications] insert error:', error.message)
    // Non-fatal — notification failure must never break the primary action
  }
}

export async function createNotifications(
  params: Omit<CreateNotificationParams, 'userId'> & { userIds: string[] },
): Promise<void> {
  const { userIds, ...rest } = params
  await Promise.all(userIds.map((userId) => createNotification({ userId, ...rest })))
}
