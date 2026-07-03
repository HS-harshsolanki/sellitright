import crypto from 'node:crypto'

export const COOKIE_NAME = 'sir_admin_session'
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours

export function verifySessionToken(token: string): boolean {
  const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_SECRET_KEY ?? ''
  if (!SESSION_SECRET) return false
  const dotIdx = token.indexOf('.')
  if (dotIdx === -1) return false
  const tsStr = token.slice(0, dotIdx)
  const sig = token.slice(dotIdx + 1)
  const ts = parseInt(tsStr, 10)
  if (isNaN(ts) || Date.now() - ts > SESSION_TTL_MS) return false
  const expected = crypto.createHmac('sha256', SESSION_SECRET)
  expected.update(`admin:${ts}`)
  const expectedHex = expected.digest('hex')
  if (expectedHex.length !== sig.length) return false
  return crypto.timingSafeEqual(Buffer.from(expectedHex), Buffer.from(sig))
}

export function makeSessionToken(ts: number): string {
  const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_SECRET_KEY ?? ''
  const hmac = crypto.createHmac('sha256', SESSION_SECRET)
  hmac.update(`admin:${ts}`)
  return `${ts}.${hmac.digest('hex')}`
}
