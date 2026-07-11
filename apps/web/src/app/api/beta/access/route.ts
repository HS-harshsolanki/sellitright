import { NextRequest, NextResponse } from 'next/server'
import { hashBetaCode, isBetaAccessEnabled } from '@/lib/beta-access'

export async function POST(request: NextRequest) {
  if (!isBetaAccessEnabled()) {
    return NextResponse.json({ error: 'Beta access is not enabled.' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const code = (body as { code?: unknown })?.code
  if (typeof code !== 'string' || !code.trim()) {
    return NextResponse.json({ error: 'Access code required.' }, { status: 400 })
  }

  const expectedHash = hashBetaCode(process.env.BETA_ACCESS_CODE ?? '')
  const submittedHash = hashBetaCode(code)

  if (submittedHash !== expectedHash) {
    return NextResponse.json({ error: 'Invalid access code.' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('beta_access', expectedHash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
  return response
}
