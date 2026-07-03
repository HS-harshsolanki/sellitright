import crypto from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { COOKIE_NAME, SESSION_TTL_MS, makeSessionToken } from '@/lib/admin-session'
import { isRateLimited } from '@/lib/admin-auth'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? ''

export async function POST(request: NextRequest) {
  if (!ADMIN_KEY) {
    return NextResponse.json({ error: 'Admin not configured.' }, { status: 503 })
  }

  const ip = (request.headers.get('x-forwarded-for')?.split(',')[0] ?? '').trim() || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
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

  const token = makeSessionToken(Date.now())
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
