export function isMsg91Configured(): boolean {
  return !!(process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID)
}

/**
 * Send a 6-digit OTP via MSG91 SMS.
 * @returns devOtp — the plaintext OTP, only set in development (for UI display)
 */
export async function sendSmsOtp(toPhone: string, otp: string): Promise<{ devOtp?: string }> {
  if (!isMsg91Configured()) {
    // Keys missing — log and surface OTP for local testing
    console.log(`[SMS OTP dev] → +91${toPhone}  OTP: ${otp}`)
    return { devOtp: otp }
  }

  const res = await fetch('https://control.msg91.com/api/v5/otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: process.env.MSG91_AUTH_KEY!,
    },
    body: JSON.stringify({
      mobile: `91${toPhone}`,
      template_id: process.env.MSG91_TEMPLATE_ID!,
      otp,
      otp_length: 6,
      otp_expiry: 10,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`MSG91 API error ${res.status}: ${text}`)
  }

  const data = (await res.json()) as { type?: string; message?: string; request_id?: string }
  if (data.type === 'error') {
    throw new Error(`MSG91 error: ${data.message}`)
  }

  // Log request_id for delivery tracing in MSG91 dashboard
  if (data.request_id) {
    console.log(`[SMS OTP] MSG91 request_id=${data.request_id} → +91${toPhone}`)
  }

  // In development, always surface the OTP so devs don't need real SMS
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SMS OTP dev] → +91${toPhone}  OTP: ${otp}`)
    return { devOtp: otp }
  }

  return {}
}
