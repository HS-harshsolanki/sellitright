import crypto from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? ADMIN_KEY
const COOKIE_NAME = 'sir_admin_session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours

function makeToken(ts: number): string {
  const hmac = crypto.createHmac('sha256', SESSION_SECRET)
  hmac.update(`admin:${ts}`)
  return `${ts}.${hmac.digest('hex')}`
}

function verifyToken(token: string): boolean {
  const [tsStr, sig] = token.split('.')
  if (!tsStr || !sig) return false
  const ts = parseInt(tsStr, 10)
  if (isNaN(ts) || Date.now() - ts > SESSION_TTL_MS) return false
  const expected = crypto.createHmac('sha256', SESSION_SECRET)
  expected.update(`admin:${ts}`)
  const expectedBuf = Buffer.from(expected.digest('hex'))
  const actualBuf = Buffer.from(sig)
  if (expectedBuf.length !== actualBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, actualBuf)
}

export async function POST(request: NextRequest) {
  if (!ADMIN_KEY) {
    return NextResponse.json({ error: 'Admin not configured.' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const key = (body as { key?: unknown })?.key
  if (typeof key !== 'string' || !key) {
    return NextResponse.json({ error: 'key required.' }, { status: 400 })
  }

  const keyBuf = Buffer.from(key)
  const adminBuf = Buffer.from(ADMIN_KEY)
  const valid = keyBuf.length === adminBuf.length && crypto.timingSafeEqual(keyBuf, adminBuf)

  if (!valid) {
    return NextResponse.json({ error: 'Invalid key.' }, { status: 401 })
  }

  const token = makeToken(Date.now())
  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
  return response
}
