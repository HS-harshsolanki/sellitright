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
  createdAt: string
}

export type DisplayMessage = ChatMessage | LocalPhoneWarning

export function isPhoneWarning(m: DisplayMessage): m is LocalPhoneWarning {
  return (m as LocalPhoneWarning).isPhoneWarning === true
}
