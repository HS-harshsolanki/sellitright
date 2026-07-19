'use client'

import { createContext, useContext } from 'react'

interface MessagingContextValue {
  openChatForInterest: (interestId: string) => void
}

// Default no-op so consumers outside the provider (e.g. mobile where the bubble isn't mounted) don't crash
const MessagingContext = createContext<MessagingContextValue>({
  openChatForInterest: () => {},
})

export function useMessaging() {
  return useContext(MessagingContext)
}

export { MessagingContext }
