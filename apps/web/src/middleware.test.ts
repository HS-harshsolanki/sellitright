import { describe, it, expect } from 'vitest'

/**
 * Unit tests for the redirect-path sanitisation logic in middleware.ts.
 *
 * The middleware itself cannot be imported directly (it uses Next.js edge
 * globals), so we extract and test the sanitisation pure function inline.
 * This gives regression coverage for the open-redirect and loop fixes.
 */

function sanitiseNext(raw: string): string {
  return raw.startsWith('/') && !raw.startsWith('//') && raw !== '/login' && raw !== '/register'
    ? raw
    : '/'
}

describe('sanitiseNext — open-redirect guard', () => {
  it('should allow a normal relative path', () => {
    expect(sanitiseNext('/dashboard')).toBe('/dashboard')
  })

  it('should allow a nested relative path', () => {
    expect(sanitiseNext('/dashboard/profile')).toBe('/dashboard/profile')
  })

  it('should block a double-slash open redirect', () => {
    expect(sanitiseNext('//evil.com')).toBe('/')
  })

  it('should block an absolute URL', () => {
    expect(sanitiseNext('https://evil.com')).toBe('/')
  })

  it('should block an empty string', () => {
    expect(sanitiseNext('')).toBe('/')
  })

  it('should block /login to prevent infinite redirect loop', () => {
    expect(sanitiseNext('/login')).toBe('/')
  })

  it('should block /register to prevent infinite redirect loop', () => {
    expect(sanitiseNext('/register')).toBe('/')
  })

  it('should allow /sell as a valid post-login destination', () => {
    expect(sanitiseNext('/sell')).toBe('/sell')
  })

  it('should allow / as the home destination', () => {
    expect(sanitiseNext('/')).toBe('/')
  })
})

/**
 * Sanitisation used in auth/callback/route.ts (slightly different — only
 * guards /login, not /register, since callback is always post-OAuth).
 */
function sanitiseCallback(raw: string): string {
  return raw.startsWith('/') && !raw.startsWith('//') && raw !== '/login' ? raw : '/'
}

describe('sanitiseCallback — open-redirect guard', () => {
  it('should allow a normal relative path', () => {
    expect(sanitiseCallback('/dashboard')).toBe('/dashboard')
  })

  it('should block double-slash open redirect', () => {
    expect(sanitiseCallback('//evil.com')).toBe('/')
  })

  it('should block /login to prevent auth loop', () => {
    expect(sanitiseCallback('/login')).toBe('/')
  })

  it('should allow / as home destination', () => {
    expect(sanitiseCallback('/')).toBe('/')
  })
})
