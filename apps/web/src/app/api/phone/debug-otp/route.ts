import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const AUTH_KEY = process.env.MSG91_AUTH_KEY?.trim() ?? ''
const WIDGET_ID_HEX = process.env.MSG91_WIDGET_ID?.trim() ?? ''
const WIDGET_ID_DECODED = Buffer.from(WIDGET_ID_HEX, 'hex').toString('utf8')

async function tryWidget(widgetId: string, label: string) {
  try {
    const res = await fetch('https://api.msg91.com/api/v5/widget/sendOtp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authkey: AUTH_KEY },
      body: JSON.stringify({ widgetId, identifier: '+919999999999' }),
    })
    const data = await res.json()
    return { label, widgetId, httpStatus: res.status, response: data }
  } catch (err) {
    return { label, widgetId, error: String(err) }
  }
}

// GET /api/phone/debug-otp — requires auth, tests both widget ID formats
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 })

  const [hexResult, decodedResult] = await Promise.all([
    tryWidget(WIDGET_ID_HEX, 'hex'),
    tryWidget(WIDGET_ID_DECODED, 'decoded'),
  ])

  return NextResponse.json({
    authKeyPrefix: AUTH_KEY.slice(0, 6),
    authKeyLen: AUTH_KEY.length,
    widgetIdHex: WIDGET_ID_HEX,
    widgetIdDecoded: WIDGET_ID_DECODED,
    results: [hexResult, decodedResult],
  })
}
