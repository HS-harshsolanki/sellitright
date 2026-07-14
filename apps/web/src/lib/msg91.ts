export function isMsg91Configured(): boolean {
  return !!(process.env.MSG91_AUTH_KEY && process.env.MSG91_WIDGET_ID)
}

/**
 * Send OTP via MSG91 Widget API (no DLT registration required).
 * MSG91 handles template + sender routing internally.
 */
export async function sendSmsOtp(toPhone: string, otp: string): Promise<void> {
  if (!isMsg91Configured()) {
    console.log(`[SMS OTP dev] → +91${toPhone}  OTP: ${otp}`)
    return
  }

  const res = await fetch('https://control.msg91.com/api/v5/widget/sendOtp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: process.env.MSG91_AUTH_KEY!,
    },
    body: JSON.stringify({
      mobile: `91${toPhone}`,
      widgetId: process.env.MSG91_WIDGET_ID!,
      otp,
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

  if (process.env.NODE_ENV === 'development') {
    console.log(`[SMS OTP dev] → +91${toPhone}  OTP: ${otp}`)
  }
}

/**
 * Verify OTP via MSG91 Widget API.
 * Returns true if valid, false if wrong/expired.
 */
export async function verifyOtpWithWidget(
  toPhone: string,
  otp: string,
): Promise<{ valid: boolean; message?: string }> {
  if (!isMsg91Configured()) {
    return { valid: false, message: 'MSG91 not configured' }
  }

  const res = await fetch('https://control.msg91.com/api/v5/widget/verifyOtp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: process.env.MSG91_AUTH_KEY!,
    },
    body: JSON.stringify({
      mobile: `91${toPhone}`,
      otp,
      widgetId: process.env.MSG91_WIDGET_ID!,
    }),
  })

  const data = (await res.json()) as { type?: string; message?: string }
  if (!res.ok || data.type === 'error') {
    return { valid: false, message: data.message }
  }

  return { valid: true }
}
