import { describe, expect, it } from 'vitest'

import { containsPhoneNumber, redactPhoneNumbers, safeContentPreview } from './phone-filter'

// ---------------------------------------------------------------------------
// Positive cases — should detect a phone number
// ---------------------------------------------------------------------------

describe('containsPhoneNumber — should detect', () => {
  const POSITIVE: Array<[string, string]> = [
    ['9876543210', 'bare 10 digits'],
    ['98765 43210', 'space-separated'],
    ['987-654-3210', 'dash-separated 3-3-4'],
    ['98765-43210', 'dash-separated 5-5'],
    ['98765.43210', 'dot-separated'],
    ['98765,43210', 'comma-separated (non-price context)'],
    ['98765_43210', 'underscore'],
    ['98765|43210', 'pipe'],
    ['(98765) 43210', 'parentheses grouping'],
    ['+91 9876543210', '+91 country code'],
    ['+919876543210', '+91 no space'],
    ['0091-9876543210', '0091 country code'],
    ['91-98765-43210', 'bare 91 prefix'],
    ['my number is 9876543210', 'inline in sentence'],
    ['nine eight seven six five four three two one zero', 'all English words'],
    ['9876 five four three two one zero', 'mixed digits and words'],
    ['9876543210 is my number', 'number at start'],
    ['९८७६५४३२१०', 'Devanagari digits'],
    ['９８７６５４３２１０', 'full-width digits'],
    ['٩٨٧٦٥٤٣٢١٠', 'Eastern Arabic-Indic digits'],
    ['9876S432lO', 'leet S=5 l=1 O=0 in digit-heavy token'],
    ['call me at 98765 and then 43210 ok', 'noise-word split'],
    ['98765*43210', 'asterisk separator'],
    ['98765#43210', 'hash separator'],
    ['nau aath saat chhe paanch char teen do ek sifar', 'Hindi words'],
    ['9876 saat char teen do ek sifar', 'mixed digits and Hindi'],
    ['9 8 7 6 5 4 3 2 1 0', 'single-digit space split'],
    ['7878787878', 'another valid number (starts with 7)'],
    ['6000000000', 'starts with 6'],
    ['+91-6000000000', 'starts with 6, +91 prefix'],
  ]

  for (const [text, label] of POSITIVE) {
    it(label, () => {
      expect(containsPhoneNumber(text)).toBe(true)
    })
  }
})

// ---------------------------------------------------------------------------
// Negative cases — should NOT detect
// ---------------------------------------------------------------------------

describe('containsPhoneNumber — should NOT detect', () => {
  const NEGATIVE: Array<[string, string]> = [
    ['price is ₹98,75,000', 'INR price (7 digits after comma strip)'],
    ['₹98,75,43,210 total cost', 'price with currency prefix'],
    ['property area is 1200 sq ft', 'area measurement'],
    ['pincode 400001', 'pincode only (6 digits)'],
    ['IFSC: SBIN0012345', 'IFSC code (alphanumeric)'],
    ['flat no 12345 on floor 3', 'short numbers in sentence'],
    ['the year 2024', '4-digit year'],
    ['12 noon to 6 pm', 'time range'],
    ['floor 4 building 2', 'short numbers'],
    ['price Rs. 85,00,000', 'Rs. prefix price'],
    ['hello how are you', 'no numbers at all'],
    ['amount: INR 9500000', 'INR prefix (7 digits, starts with 9 but only 7 digits)'],
  ]

  for (const [text, label] of NEGATIVE) {
    it(label, () => {
      expect(containsPhoneNumber(text)).toBe(false)
    })
  }
})

// ---------------------------------------------------------------------------
// skipPatterns option
// ---------------------------------------------------------------------------

describe('containsPhoneNumber — skipPatterns', () => {
  it('ignores a known order ID format', () => {
    // Without skip: detected as phone number
    expect(containsPhoneNumber('Order 9876543210')).toBe(true)
    // With skip: safe
    expect(containsPhoneNumber('Order 9876543210', { skipPatterns: [/Order \d{10}/g] })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// checkReversed option
// ---------------------------------------------------------------------------

describe('containsPhoneNumber — reversed numbers', () => {
  it('detects a reversed valid Indian number', () => {
    // 9876543210 reversed = 0123456789 — after reversing candidate "0123456789"
    // we get "9876543210" which starts with 9 — should be caught
    expect(containsPhoneNumber('0123456789', { checkReversed: true })).toBe(true)
  })

  it('skips reversed check when disabled', () => {
    expect(containsPhoneNumber('0123456789', { checkReversed: false })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// redactPhoneNumbers
// ---------------------------------------------------------------------------

describe('redactPhoneNumbers', () => {
  it('redacts a bare number', () => {
    expect(redactPhoneNumbers('call 9876543210 now')).toContain('[PHONE REDACTED]')
    expect(redactPhoneNumbers('call 9876543210 now')).not.toContain('9876543210')
  })

  it('redacts +91 prefix variant', () => {
    const result = redactPhoneNumbers('reach me at +91 9876543210')
    expect(result).toContain('[PHONE REDACTED]')
    expect(result).not.toContain('9876543210')
  })
})

// ---------------------------------------------------------------------------
// safeContentPreview
// ---------------------------------------------------------------------------

describe('safeContentPreview', () => {
  it('truncates long content', () => {
    const long = 'a'.repeat(200)
    const preview = safeContentPreview(long, 80)
    expect(preview.length).toBeLessThanOrEqual(82) // 80 + "…"
  })

  it('redacts phone numbers in preview', () => {
    const preview = safeContentPreview('my number is 9876543210 please call')
    expect(preview).not.toContain('9876543210')
  })
})
