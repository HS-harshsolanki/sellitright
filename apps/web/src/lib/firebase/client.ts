import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
}

export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  )
}

// Singleton — safe to call multiple times (HMR-safe, StrictMode-safe)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

export const firebaseAuth = getAuth(app)

// In development, use the local Firebase Auth Emulator.
// appVerificationDisabledForTesting prevents the SDK from loading reCAPTCHA scripts at all.
// NEXT_PUBLIC_FIREBASE_EMULATOR_HOST lets the emulator be reached from a phone on the LAN
// (set to e.g. 192.168.1.5:9099 in .env.local when testing from another device).
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  firebaseAuth.settings.appVerificationDisabledForTesting = true
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { connectAuthEmulator } = require('firebase/auth') as typeof import('firebase/auth')
  const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST ?? '127.0.0.1:9099'
  try {
    connectAuthEmulator(firebaseAuth, `http://${emulatorHost}`, { disableWarnings: true })
  } catch {
    // Already connected on HMR re-run — safe to ignore
  }
}

export default app
