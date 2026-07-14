/**
 * Shared chat message types used by both client surfaces (chat-bubble,
 * messages thread page) and the API route.
 *
 * Kept in lib/ so the route file only exports HTTP handlers — Next.js
 * type-checks all named exports from route files as request handlers.
 */

export interface ChatMessage {
  id: string
  senderId: string
  content: string
  isDeleted: boolean
  createdAt: string
}

/**
 * A local-only (never persisted) entry that represents a blocked phone-number
 * attempt. Injected into the display list in place of the rejected message so
 * the user sees an inline warning in the thread timeline.
 */
export interface LocalPhoneWarning {
  id: string
  isPhoneWarning: true
  warningText: string
  offenseNumber: number
  createdAt: string
}

export type DisplayMessage = ChatMessage | LocalPhoneWarning

export function isPhoneWarning(m: DisplayMessage): m is LocalPhoneWarning {
  return (m as LocalPhoneWarning).isPhoneWarning === true
}

export function buildLoadViolationWarning(
  offenseNumber: number,
  allMessages: Array<{ isDeleted?: boolean; createdAt: string }>,
): LocalPhoneWarning {
  const lastDeletedAt =
    allMessages.filter((m) => m.isDeleted).at(-1)?.createdAt ?? new Date().toISOString()
  const isFinal = offenseNumber >= 3
  const warningText = isFinal
    ? 'Your account was restricted after 3 phone-sharing attempts. Some messages in this conversation were removed.'
    : `Warning ${offenseNumber}/3: Some messages in this conversation were removed because a phone number was detected. Use the Call or WhatsApp buttons after unlocking contact.`
  return {
    id: `load-warn-${offenseNumber}-${lastDeletedAt}`,
    isPhoneWarning: true as const,
    warningText,
    offenseNumber,
    createdAt: lastDeletedAt,
  }
}
