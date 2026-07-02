/**
 * MSG91 SendOTP — SMS delivery helper.
 *
 * Env vars required:
 *   MSG91_AUTH_KEY      — API key from MSG91 dashboard (Settings → API keys)
 *   MSG91_TEMPLATE_ID   — template ID for the OTP SMS template
 *
 * In development, OTPs are logged to the console when env vars are blank.
 */

export function isMsg91Configured(): boolean {
  return !!(process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID)
}

/**
 * Send a 6-digit OTP via MSG91 SMS.
 * @param toPhone  10-digit Indian number WITHOUT country code (e.g. "9876543210")
 * @param otp      6-digit numeric string
 */
export async function sendSmsOtp(toPhone: string, otp: string): Promise<void> {
  if (!isMsg91Configured()) {
    console.log(`[SMS OTP dev] → +91${toPhone}  OTP: ${otp}`)
    return
  }

  const url = `https://control.msg91.com/api/v5/otp`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: process.env.MSG91_AUTH_KEY!,
    },
    body: JSON.stringify({
      mobile: `91${toPhone}`,
      template_id: process.env.MSG91_TEMPLATE_ID!,
      otp,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`MSG91 API error ${res.status}: ${text}`)
  }

  const data = (await res.json()) as { type?: string; message?: string }
  if (data.type === 'error') {
    throw new Error(`MSG91 error: ${data.message}`)
  }
}
