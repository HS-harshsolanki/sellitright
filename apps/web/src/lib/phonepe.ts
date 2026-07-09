import crypto from 'node:crypto'

const SANDBOX_BASE = 'https://api-preprod.phonepe.com/apis/pg-sandbox'
const PROD_BASE = 'https://api.phonepe.com/apis/hermes'

export function isPhonePeConfigured(): boolean {
  return !!(process.env.PHONEPE_MERCHANT_ID && process.env.PHONEPE_SALT_KEY)
}

export function getPhonePeBaseUrl(): string {
  return process.env.PHONEPE_ENV === 'production' ? PROD_BASE : SANDBOX_BASE
}

/**
 * Builds X-VERIFY checksum for PhonePe API requests.
 * Formula: SHA256(base64EncodedPayload + apiEndpoint + saltKey) + "###" + saltIndex
 */
export function buildPhonePeChecksum(base64Payload: string, apiEndpoint: string): string {
  const saltKey = process.env.PHONEPE_SALT_KEY ?? ''
  const saltIndex = process.env.PHONEPE_SALT_INDEX ?? '1'
  const hash = crypto
    .createHash('sha256')
    .update(base64Payload + apiEndpoint + saltKey)
    .digest('hex')
  return `${hash}###${saltIndex}`
}

/**
 * Verifies PhonePe webhook/redirect checksum.
 * For response verification: SHA256(base64Response + saltKey) + "###" + saltIndex
 */
export function verifyPhonePeChecksum(base64Response: string, checksum: string): boolean {
  try {
    const saltKey = process.env.PHONEPE_SALT_KEY ?? ''
    const saltIndex = process.env.PHONEPE_SALT_INDEX ?? '1'
    const hash = crypto
      .createHash('sha256')
      .update(base64Response + saltKey)
      .digest('hex')
    const expectedChecksum = `${hash}###${saltIndex}`
    const a = Buffer.from(expectedChecksum)
    const b = Buffer.from(checksum)
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}
