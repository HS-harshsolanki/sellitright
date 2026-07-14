const AUTH_KEY = process.env.MSG91_AUTH_KEY?.trim() ?? ''
const WIDGET_ID = process.env.MSG91_WIDGET_ID?.trim() ?? ''

export function isMsg91Configured(): boolean {
  return !!(AUTH_KEY && WIDGET_ID)
}

// env debug — remove after confirming production works
export function getMsg91Config() {
  return {
    hasAuthKey: !!AUTH_KEY,
    hasWidgetId: !!WIDGET_ID,
    widgetIdPrefix: WIDGET_ID.slice(0, 6) || 'MISSING',
    authKeyPrefix: AUTH_KEY.slice(0, 6) || 'MISSING',
    widgetIdLen: WIDGET_ID.length,
    authKeyLen: AUTH_KEY.length,
  }
}

/**
 * Send OTP via MSG91 Widget API (no DLT registration required).
 * MSG91 generates and sends the OTP; returns a reqId used for verification.
 */
export async function sendSmsOtp(toPhone: string): Promise<{ reqId: string }> {
  if (!isMsg91Configured()) {
    // Dev fallback — return a fake reqId so the caller can store it
    return { reqId: `dev-${toPhone}-${Date.now()}` }
  }

  const res = await fetch('https://api.msg91.com/api/v5/widget/sendOtp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: AUTH_KEY,
      Origin: process.env.NEXT_PUBLIC_APP_URL ?? 'https://chapternew.com',
      Referer: process.env.NEXT_PUBLIC_APP_URL ?? 'https://chapternew.com',
    },
    body: JSON.stringify({
      widgetId: WIDGET_ID,
      identifier: `+91${toPhone}`,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`MSG91 widget API error ${res.status}: ${text}`)
  }

  const data = (await res.json()) as { type?: string; message?: string }
  if (data.type === 'error') {
    throw new Error(`MSG91 widget error: ${data.message}`)
  }

  // MSG91 returns the reqId in the `message` field on success
  const reqId = data.message
  if (!reqId) {
    throw new Error('MSG91 widget returned no reqId')
  }

  return { reqId }
}

/**
 * Verify OTP via MSG91 Widget API using the reqId from sendSmsOtp.
 */
export async function verifyOtpWithWidget(
  otp: string,
  reqId: string,
): Promise<{ valid: boolean; message?: string }> {
  if (!isMsg91Configured()) {
    return { valid: false, message: 'MSG91 not configured' }
  }

  // Dev fallback — reqId starts with "dev-" in local mode; accept any 6-digit OTP
  if (reqId.startsWith('dev-')) {
    return { valid: otp.length === 6 }
  }

  const res = await fetch('https://api.msg91.com/api/v5/widget/verifyOtp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: AUTH_KEY,
    },
    body: JSON.stringify({
      widgetId: WIDGET_ID,
      otp,
      reqId,
    }),
  })

  const data = (await res.json()) as { type?: string; message?: string }
  if (!res.ok || data.type === 'error') {
    return { valid: false, message: data.message }
  }

  return { valid: true }
}
