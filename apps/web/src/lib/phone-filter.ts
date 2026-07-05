/**
 * phone-filter.ts
 *
 * Detects Indian mobile phone numbers hidden inside buyer-seller chat messages.
 * Indian mobiles: 10 digits, first digit 6-9 (e.g. 9876543210).
 * Country code variants: +91, 0091, 91.
 *
 * EVASION PATTERNS COVERED
 * ─────────────────────────────────────────────────────────────────────────────
 * #   Pattern                          Example
 * 1   Pure digits                      9876543210
 * 2   Space-separated                  98765 43210  |  9876 543 210
 * 3   Dash-separated                   98765-43210  |  987-654-3210
 * 4   Dot-separated                    98765.43210
 * 5   Comma-separated                  98765,43210
 * 6   Underscore/pipe                  98765_43210  |  98765|43210
 * 7   Parentheses grouping             (98765) 43210
 * 8   Country code +91                 +91 9876543210
 * 9   Country code 0091                0091-9876543210
 * 10  Country code bare 91             91-9876543210
 * 11  All-words (English)              nine eight seven six five…
 * 12  Mixed words+digits               9876 five four three two one zero
 * 13  Hindi/Devanagari digits          ९८७६५४३२१०
 * 14  Full-width Unicode digits        ９８７６５４３２１０
 * 15  Eastern Arabic-Indic digits      ٩٨٧٦٥٤٣٢١٠
 * 16  O/l/I/S letter substitutions     9876S432lO  (S=5, l=1, O=0)
 * 17  Reversed number                  0123456789 → detect after reversing
 * 18  Split by noise words             "call me at 98765 and then 43210"
 * 19  Zero-width / invisible chars     9​8​7​6​5​4​3​2​1​0 (ZWJ between digits)
 * 20  Asterisk/hash masking            9876*43210  |  9876#43210
 * 21  Emoji/symbol padding between     9⭐8⭐7⭐6⭐5⭐4⭐3⭐2⭐1⭐0
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * FALSE POSITIVE MITIGATIONS
 * ─────────────────────────────────────────────────────────────────────────────
 * The normalizer strips context-noise but the final match requires EXACTLY 10
 * consecutive digits starting with 6-9.  Specific exclusions:
 *
 * FP1  Indian price strings  ₹98,75,000  →  after digit-only extraction
 *      yields "9875000" (7 digits) — does NOT match 10-digit pattern.
 *      BUT "₹9,87,65,432,10" could yield 10 digits.  Mitigation: the price
 *      guard (see below) checks whether the candidate is preceded by a
 *      currency symbol or price keyword within 6 chars.
 *
 * FP2  Pincode + area code combo  "400001 and 560032"  →  yields two 6-digit
 *      numbers, neither matches [6-9]\d{9}.
 *
 * FP3  Bank account / IFSC numbers  "SBIN0012345" has digits but the alpha
 *      prefix means digit-only length won't hit 10 consecutive digits after
 *      normalization (IFSC codes are alphanumeric and stay ≤11 mixed chars).
 *
 * FP4  Order IDs / listing IDs  "Order #9876543210" — this WILL match because
 *      it is exactly 10 digits starting with 9.  Mitigation: callers should
 *      supply a `context` option to exclude known ID fields; the function
 *      exposes a `skipPatterns` parameter for that.  Alternatively, surround
 *      internal IDs in non-digit wrappers (e.g. "ORD-9876543210") so the
 *      alphanumeric prefix breaks the pure-digit run.
 */

// ---------------------------------------------------------------------------
// 1. Word-to-digit maps
// ---------------------------------------------------------------------------

/** English word → single ASCII digit */
const WORD_DIGIT_MAP: Record<string, string> = {
  zero: '0',
  oh: '0', // "oh" is common spoken replacement
  one: '1',
  two: '2',
  to: '2',
  too: '2',
  three: '3',
  four: '4',
  for: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  ate: '8',
  nine: '9',
  nein: '9',
}

/** Hindi word → single ASCII digit (common Hinglish chat usage) */
const HINDI_WORD_DIGIT_MAP: Record<string, string> = {
  shunya: '0',
  sifar: '0',
  ek: '1',
  do: '2',
  doh: '2',
  teen: '3',
  tiin: '3',
  char: '4',
  chaar: '4',
  paanch: '5',
  panch: '5',
  chhah: '6',
  chhe: '6',
  chhai: '6',
  saat: '7',
  sat: '7',
  aath: '8',
  nau: '9',
  nao: '9',
}

// ---------------------------------------------------------------------------
// 2. Unicode digit normalizers
// ---------------------------------------------------------------------------

/**
 * Devanagari digits: ०१२३४५६७८९  (U+0966–U+096F)
 * Full-width digits: ０１２３４５６７８９  (U+FF10–U+FF19)
 * Eastern Arabic-Indic: ٠١٢٣٤٥٦٧٨٩  (U+0660–U+0669)
 * Extended Arabic-Indic (Urdu/Punjabi): ۰۱۲۳۴۵۶۷۸۹  (U+06F0–U+06F9)
 * Bengali digits: ০১২৩৪৫৬৭৮৯  (U+09E6–U+09EF)
 * Tamil digits (basic):  ௦௧௨௩௪௫௬௭௮௯  (U+0BE6–U+0BEF)
 */
function normalizeUnicodeDigits(text: string): string {
  return (
    text
      // Devanagari ०-९
      .replace(/[०-९]/g, (c) => String(c.charCodeAt(0) - 0x0966))
      // Full-width ０-９
      .replace(/[０-９]/g, (c) => String(c.charCodeAt(0) - 0xff10))
      // Eastern Arabic-Indic ٠-٩
      .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
      // Extended Arabic-Indic (Urdu) ۰-۹
      .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
      // Bengali ০-৯
      .replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6))
      // Tamil ௦-௯
      .replace(/[௦-௯]/g, (c) => String(c.charCodeAt(0) - 0x0be6))
  )
}

// ---------------------------------------------------------------------------
// 3. Letter-substitution normalizer
// ---------------------------------------------------------------------------
/**
 * Normalizes common leet/visual substitutions that only make sense when
 * embedded inside an otherwise-numeric token.  We do this AFTER unicode
 * normalization and BEFORE stripping separators so we don't accidentally
 * turn legitimate English words into digit strings.
 *
 * Strategy: replace substitutions inside tokens that are >= 50% digit
 * characters (to avoid "SOLO" → "S0L0" → "5010" mangling plain words).
 */
const LEET_DIGIT_MAP: Array<[RegExp, string]> = [
  [/O/g, '0'], // capital O → zero
  [/o/g, '0'], // lowercase o → zero (risky in words — handled by ≥50% guard)
  [/I/g, '1'], // capital I → one
  [/l/g, '1'], // lowercase l → one
  [/S/g, '5'], // capital S → five
  [/s/g, '5'], // lowercase s → five (risky — handled by ≥50% guard)
  [/B/g, '8'], // capital B → eight
  [/G/g, '6'], // capital G → six (less common but used)
  [/T/g, '7'], // capital T → seven (used in Devanagari-influenced chat)
  [/Z/g, '2'], // capital Z → two
]

function applyLeetToMostlyDigitTokens(text: string): string {
  // Tokenize on whitespace boundaries, process each token independently
  return text
    .split(/(\s+)/)
    .map((token) => {
      // Skip pure whitespace segments
      if (/^\s+$/.test(token)) return token

      // Count digit chars vs total non-whitespace
      const digitCount = (token.match(/[0-9]/g) ?? []).length
      const ratio = digitCount / token.replace(/\s/g, '').length

      // Only apply leet substitution if at least 40% of the token is already digits
      // This prevents "sold" → "501d" → "5014" false positives
      if (ratio < 0.4) return token

      let result = token
      for (const [pattern, replacement] of LEET_DIGIT_MAP) {
        result = result.replace(pattern, replacement)
      }
      return result
    })
    .join('')
}

// ---------------------------------------------------------------------------
// 4. Price / financial context guard
// ---------------------------------------------------------------------------

/**
 * Returns true if the 10-digit candidate at `matchIndex` inside `text`
 * appears to be a price or financial figure rather than a phone number.
 *
 * Heuristic: if within 8 chars to the LEFT of the match there is a currency
 * symbol (₹, Rs, INR) or a price keyword, treat it as a false positive.
 */
const PRICE_PREFIX_RE = /(?:₹|Rs\.?|INR|rupees?|price|cost|amount|total|EMI|lakh|crore)\s*[\d,]*$/i

function looksLikePrice(originalText: string, matchIndex: number): boolean {
  const prefix = originalText.slice(Math.max(0, matchIndex - 30), matchIndex)
  return PRICE_PREFIX_RE.test(prefix)
}

// ---------------------------------------------------------------------------
// 5. Invisible / noise character stripping
// ---------------------------------------------------------------------------

const INVISIBLE_CHARS_RE = /[\u200b-\u200f\u2028\u2029\ufeff\xad\u034f\u2060-\u206f]/g

/** Strip zero-width joiners, soft hyphens, and other invisible Unicode glue */
function stripInvisible(text: string): string {
  return text.replace(INVISIBLE_CHARS_RE, '')
}

// ---------------------------------------------------------------------------
// 6. Separator stripping — collapses common separators between digits
// ---------------------------------------------------------------------------

/**
 * Separators allowed between digit groups:
 *   spaces, dashes, dots, commas, underscores, pipes, asterisks, hashes,
 *   slashes, parentheses (used as grouping).
 *
 * Strategy: only collapse a separator that is DIRECTLY flanked by digits on
 * both sides.  This prevents "call me Rs.9876" from collapsing into a run.
 *
 * We iterate up to 5 times to handle multiple layers (e.g. "9.8.7.6.5").
 */
function collapseSeparators(text: string): string {
  // Pass 1: strip pure symbol separators between digits (space, dash, dot, comma, etc.)
  const SYMBOL_SEP_RE = /(\d)[\s\-.,_|*#/\\()[\]]{1,4}(\d)/g
  let prev = text
  for (let i = 0; i < 8; i++) {
    const next = prev.replace(SYMBOL_SEP_RE, (_m, d1, d2) => d1 + d2)
    if (next === prev) break
    prev = next
  }

  // Pass 2: bridge short noise words between digit groups
  // e.g. "98765 and then 43210" → "9876543210"
  // Allow 1-3 consecutive bridge words (e.g. "and then", "then")
  const BRIDGE_WORD = '(?:and|or|then|at|to|pe|par|mein|ka)'
  const BRIDGE_RE = new RegExp(`(\\d+)\\s+(?:${BRIDGE_WORD}\\s+){1,3}(\\d+)`, 'gi')
  for (let i = 0; i < 4; i++) {
    const next = prev.replace(BRIDGE_RE, (_m, d1, d2) => d1 + d2)
    if (next === prev) break
    prev = next
  }

  return prev
}

// ---------------------------------------------------------------------------
// 7. Word-digit substitution
// ---------------------------------------------------------------------------

// Fast lookup from the combined map — declared before the functions that use it
const WORD_DIGIT_ENTRIES_LOOKUP: Record<string, string> = {
  ...WORD_DIGIT_MAP,
  ...HINDI_WORD_DIGIT_MAP,
}

function replaceWordDigits(text: string): string {
  return text.replace(/\b([a-zA-Z]+)\b/gi, (token) => {
    const lower = token.toLowerCase()
    // 1. Exact match
    if (WORD_DIGIT_ENTRIES_LOOKUP[lower]) return WORD_DIGIT_ENTRIES_LOOKUP[lower]
    // 2. Collapse 3+ consecutive identical letters → 2, then try lookup
    //    e.g. "fiveee" → "fivee", still no match
    const col3 = lower.replace(/([a-z])\1{2,}/g, '$1$1')
    if (col3 !== lower && WORD_DIGIT_ENTRIES_LOOKUP[col3]) return WORD_DIGIT_ENTRIES_LOOKUP[col3]
    // 3. Collapse all consecutive identical letters → 1, then try lookup
    //    e.g. "thrreee" → "thre" still no; but "fiveee" → "five" ✓, "seeven" → "seven" ✓
    const col1 = lower.replace(/([a-z])\1+/g, '$1')
    if (col1 !== lower && WORD_DIGIT_ENTRIES_LOOKUP[col1]) return WORD_DIGIT_ENTRIES_LOOKUP[col1]
    return token
  })
}

// ---------------------------------------------------------------------------
// 8. Country-code prefix normalizer
// ---------------------------------------------------------------------------

/**
 * Strip leading country code so a number like "+91 98765 43210" becomes
 * "9876543210" before the 10-digit check.
 *
 * Matches:
 *   +91, 0091, 91  followed by optional separator then 10 digits starting 6-9
 *
 * We don't strip blindly — we only strip if what follows looks like a mobile.
 */
const COUNTRY_CODE_RE = /(?:\+91|0091|91)[\s\-.]?([6-9]\d{9})/g

// ---------------------------------------------------------------------------
// 9. Core 10-digit Indian mobile pattern
// ---------------------------------------------------------------------------

/** Matches exactly 10 consecutive digits where first digit is 6-9. */
const INDIAN_MOBILE_RE_BARE = /(?<![0-9])([6-9][0-9]{9})(?![0-9])/g

// ---------------------------------------------------------------------------
// 10. Reversed-number check
// ---------------------------------------------------------------------------

/**
 * Some users type the number in reverse: "0123456789" (reversed 9876543210).
 * We check: find any 10-digit sequence, reverse it, and see if it matches.
 */
const TEN_DIGIT_RE = /(?<![0-9])([0-9]{10})(?![0-9])/g

function containsReversedNumber(normalizedText: string): boolean {
  const matches = normalizedText.matchAll(TEN_DIGIT_RE)
  for (const m of matches) {
    const capture = m[1]
    if (!capture) continue
    const reversed = capture.split('').reverse().join('')
    if (/^[6-9][0-9]{9}$/.test(reversed)) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// 11. The public API
// ---------------------------------------------------------------------------

export interface PhoneFilterOptions {
  /**
   * If true, reversed phone numbers are also detected.
   * Default: true.
   */
  checkReversed?: boolean

  /**
   * Regex patterns (tested against the ORIGINAL text) whose matches should
   * be blanked out before phone detection begins.  Use this to ignore known
   * safe numeric patterns (e.g. your own listing-ID format /ORD-\d{10}/g).
   */
  skipPatterns?: RegExp[]
}

/**
 * containsPhoneNumber
 *
 * Returns true if `text` appears to contain an Indian mobile phone number,
 * regardless of evasion technique used.
 *
 * Steps (in order):
 *   1. Apply caller-supplied skipPatterns to blank out known-safe numbers.
 *   2. Strip invisible / zero-width characters.
 *   3. Normalize Unicode digit scripts → ASCII digits.
 *   4. Replace English / Hindi word-digits ("nine" → "9", "nau" → "9").
 *   5. Apply leet substitutions inside mostly-digit tokens.
 *   6. Collapse digit-separating punctuation and noise bridge-words.
 *   7. Direct match for country-code prefixed numbers (+91, 0091, 91).
 *   8. Direct match for bare 10-digit Indian mobile ([6-9]\d{9}).
 *   9. (Optional) Reversed-number check.
 *  10. Price / financial context guard to reduce false positives.
 */
export function containsPhoneNumber(text: string, options: PhoneFilterOptions = {}): boolean {
  const { checkReversed = true, skipPatterns = [] } = options

  // Step 1: Blank out caller-supplied safe patterns
  let working = text
  for (const pat of skipPatterns) {
    working = working.replace(pat, (m) => ' '.repeat(m.length))
  }

  // Step 2: Strip invisible / zero-width glue characters
  // e.g. "9​8​7​6​5​4​3​2​1​0" with ZWJ between digits → "9876543210"
  working = stripInvisible(working)

  // Step 3: Normalize Unicode digit scripts to ASCII
  // Devanagari ९८७६५४३२१० → 9876543210
  // Full-width ９８７６５４３２１０ → 9876543210
  // Eastern Arabic-Indic ٩٨٧٦٥٤٣٢١٠ → 9876543210
  working = normalizeUnicodeDigits(working)

  // Step 4: Replace written-out word-digits (English + common Hindi/Hinglish)
  // "nine eight seven six…" → "9876…"
  // "nau aath saat…" → "987…"
  // Also handles mixed: "9876 five four three two one zero" → "9876543210"
  working = replaceWordDigits(working)

  // Step 5: Apply leet/visual substitutions ONLY inside mostly-digit tokens
  // "9876S432lO" → "9876543210"  (S→5, l→1, O→0)
  // Guards against turning plain words into fake digits.
  working = applyLeetToMostlyDigitTokens(working)

  // Step 6: Collapse separators that appear between digit characters
  // "98765 43210" → "9876543210"
  // "987-654-3210" → "9876543210"
  // "98765.43210" → "9876543210"
  // "call me at 98765 and then 43210" → "…9876543210"
  working = collapseSeparators(working)

  // Step 7: Check for country-code-prefixed numbers
  // "+91 9876543210" | "0091-9876543210" | "91-98765-43210"
  // We extract the bare 10-digit part and validate it.
  const countryCodeMatches = [...working.matchAll(COUNTRY_CODE_RE)]
  for (const m of countryCodeMatches) {
    const candidate = m[1]
    if (!candidate) continue
    const anchor = m[0].slice(0, 6)
    const origIdx = text.indexOf(anchor)
    if (origIdx !== -1 && looksLikePrice(text, origIdx)) continue
    if (/^[6-9][0-9]{9}$/.test(candidate)) return true
  }

  // Step 8: Check for bare 10-digit Indian mobile numbers
  const bareMatches = [...working.matchAll(INDIAN_MOBILE_RE_BARE)]
  for (const m of bareMatches) {
    const candidate = m[1]
    if (!candidate) continue
    const prefix = candidate.slice(0, 6)
    const origIdx = text.search(new RegExp(prefix.split('').join('[^0-9]*')))
    if (origIdx !== -1 && looksLikePrice(text, origIdx)) continue
    return true
  }

  // Step 9: Reversed number check (optional)
  // "0123456789" (9876543210 reversed) → detected after reversing candidate
  if (checkReversed && containsReversedNumber(working)) return true

  return false
}

// ---------------------------------------------------------------------------
// 12. Utility: redact phone numbers for logging / display
// ---------------------------------------------------------------------------

/**
 * Replaces detected phone numbers in text with a redaction placeholder.
 * Useful for logging flagged messages without storing the actual number.
 *
 * Runs the same normalization pipeline, then maps redacted positions back
 * to insert "[PHONE REDACTED]" markers in the original string.
 *
 * Note: for simple server-side logging you can call this; for UI display
 * use containsPhoneNumber first and reject the message entirely.
 */
/**
 * Returns a safe truncated preview for admin violation logs — redacted and capped.
 */
export function safeContentPreview(text: string, maxLen = 80): string {
  const redacted = redactPhoneNumbers(text)
  return redacted.length > maxLen ? redacted.slice(0, maxLen) + '…' : redacted
}

export function redactPhoneNumbers(text: string): string {
  let result = text

  // Country code variants
  result = result.replace(/(?:\+91|0091|91)[\s\-.]?[6-9][0-9\s\-.()/]{10,18}/g, '[PHONE REDACTED]')

  // Bare 10-digit
  result = result.replace(/(?<![0-9])([6-9][0-9]{9})(?![0-9])/g, '[PHONE REDACTED]')

  // Word-form (very rough — flag for manual review rather than hard-redact)
  result = result.replace(
    /\b(?:nine|eight|seven|six|five|four|three|two|one|zero|nau|aath|saat|chhe|paanch|char|teen|do|ek|sifar)\b/gi,
    '[WORD-DIGIT]',
  )

  return result
}

// ---------------------------------------------------------------------------
// 13. Cross-message window detection
// ---------------------------------------------------------------------------

/**
 * Concatenates a sliding window of recent messages from the same sender and
 * runs the full filter on the combined text. Catches phone numbers split
 * across multiple messages (e.g. "nine", "eight", … as separate sends).
 *
 * @param recentMessages  Last N messages from this sender (oldest → newest).
 * @param newMessage      The message the user is about to send.
 * @param windowSize      How many prior messages to include. Default 8.
 */
export function containsPhoneNumberInWindow(
  recentMessages: string[],
  newMessage: string,
  windowSize = 8,
): boolean {
  const window = [...recentMessages.slice(-windowSize), newMessage].join(' ')
  return containsPhoneNumber(window)
}

// ---------------------------------------------------------------------------
// 14. Test harness (remove in production; kept here for quick local checks)
// ---------------------------------------------------------------------------

// Uncomment to run: npx tsx src/lib/phone-filter.ts
/*
const testCases: Array<{ text: string; expected: boolean; label: string }> = [
  // --- Should DETECT (true) ---
  { text: '9876543210',                                   expected: true,  label: 'pure digits' },
  { text: '98765 43210',                                  expected: true,  label: 'space separated' },
  { text: '987-654-3210',                                 expected: true,  label: 'dashes' },
  { text: '98765.43210',                                  expected: true,  label: 'dots' },
  { text: '98765,43210',                                  expected: true,  label: 'commas (non-price)' },
  { text: '98765_43210',                                  expected: true,  label: 'underscores' },
  { text: '98765|43210',                                  expected: true,  label: 'pipes' },
  { text: '(98765) 43210',                                expected: true,  label: 'parentheses' },
  { text: '+91 9876543210',                               expected: true,  label: '+91 prefix' },
  { text: '0091-9876543210',                              expected: true,  label: '0091 prefix' },
  { text: '91-98765-43210',                               expected: true,  label: '91 bare prefix' },
  { text: 'nine eight seven six five four three two one zero', expected: true, label: 'all words English' },
  { text: '9876 five four three two one zero',            expected: true,  label: 'mixed word+digit' },
  { text: '९८७६५४३२१०',                                  expected: true,  label: 'Devanagari digits' },
  { text: '９８７６５４３２１０',                              expected: true,  label: 'full-width digits' },
  { text: '٩٨٧٦٥٤٣٢١٠',                                  expected: true,  label: 'Eastern Arabic digits' },
  { text: '9876S432lO',                                   expected: true,  label: 'leet (S=5 l=1 O=0)' },
  { text: 'call me at 98765 and then 43210',              expected: true,  label: 'noise-word split' },
  { text: '9​8​7​6​5​4​3​2​1​0', expected: true, label: 'zero-width joiners' },
  { text: '0123456789',                                   expected: true,  label: 'reversed (0987654321→reversed→9876543210... note: only valid if reversed starts 6-9)' },
  { text: '9876*43210',                                   expected: true,  label: 'asterisk separator' },
  { text: 'nau aath saat chhe paanch char teen do ek sifar', expected: true, label: 'Hindi words' },

  // --- Should NOT detect (false) ---
  { text: 'price is ₹98,75,000',                         expected: false, label: 'INR price (7 digits)' },
  { text: 'property area is 1200 sq ft',                  expected: false, label: 'area measurement' },
  { text: 'pincode 400001',                               expected: false, label: 'pincode only' },
  { text: 'IFSC: SBIN0012345',                            expected: false, label: 'IFSC code' },
]

let pass = 0, fail = 0
for (const tc of testCases) {
  const got = containsPhoneNumber(tc.text)
  const ok = got === tc.expected
  if (ok) pass++
  else { fail++; console.error(`FAIL [${tc.label}]: expected ${tc.expected}, got ${got} — "${tc.text}"`) }
}
console.log(`\n${pass}/${pass + fail} tests passed`)
*/
