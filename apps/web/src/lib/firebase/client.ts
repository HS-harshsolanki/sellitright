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

function getFirebaseApp() {
  if (typeof window === 'undefined') return null
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
}

// Returns null on SSR — all call sites must guard against null
export function getFirebaseAuth() {
  const app = getFirebaseApp()
  return app ? getAuth(app) : null
}

// In development, connect the Auth Emulator once
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const auth = getFirebaseAuth()
  if (auth) {
    auth.settings.appVerificationDisabledForTesting = true
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { connectAuthEmulator } = require('firebase/auth') as typeof import('firebase/auth')
    const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST ?? '127.0.0.1:9099'
    try {
      connectAuthEmulator(auth, `http://${emulatorHost}`, { disableWarnings: true })
    } catch {
      // Already connected on HMR re-run
    }
  }
}

export default getFirebaseApp()
