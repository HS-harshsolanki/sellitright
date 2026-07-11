// Beta access gate — only active when BETA_ACCESS_CODE env var is set on staging.
// Checks for a 'beta_access' cookie matching the hash of BETA_ACCESS_CODE.
// This prevents accidental public discovery of the staging URL.

import { createHmac } from 'crypto'

export function isBetaAccessEnabled(): boolean {
  return !!(process.env.NEXT_PUBLIC_APP_ENV === 'staging' && process.env.BETA_ACCESS_CODE)
}

export function hashBetaCode(code: string): string {
  const secret = process.env.BETA_ACCESS_CODE ?? ''
  return createHmac('sha256', secret).update(code.trim().toLowerCase()).digest('hex')
}

export function isValidBetaCookie(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false
  const expected = hashBetaCode(process.env.BETA_ACCESS_CODE ?? '')
  return cookieValue === expected
}
