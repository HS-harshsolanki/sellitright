/**
 * Meta WhatsApp Cloud API — OTP message helper.
 *
 * Env vars required (production):
 *   WHATSAPP_PHONE_NUMBER_ID  — the WhatsApp Business phone number ID from Meta dashboard
 *   WHATSAPP_ACCESS_TOKEN     — permanent system-user access token
 *   WHATSAPP_OTP_TEMPLATE     — template name, default "otp_verification"
 *
 * In development, OTPs are logged to the console instead of being sent.
 */

export function isWhatsAppConfigured(): boolean {
  return !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN)
}

/**
 * Send a 6-digit OTP via WhatsApp using a pre-approved template.
 * Returns true on success, throws on failure.
 *
 * @param toPhone  10-digit Indian number WITHOUT country code (e.g. "9876543210")
 * @param otp      6-digit numeric string
 */
export async function sendWhatsAppOtp(toPhone: string, otp: string): Promise<void> {
  if (!isWhatsAppConfigured()) {
    // Dev/test mode — log and return without sending
    console.log(`[WhatsApp OTP dev] → +91${toPhone}  OTP: ${otp}`)
    return
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE ?? 'otp_verification'

  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`

  const body = {
    messaging_product: 'whatsapp',
    to: `91${toPhone}`, // Meta expects full international format
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: otp }],
        },
        {
          // WhatsApp "copy code" button — optional, only if template has one
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: otp }],
        },
      ],
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`WhatsApp API error ${res.status}: ${text}`)
  }
}
