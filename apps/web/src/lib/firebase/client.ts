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

// Lazy singleton — only initializes on the client, never during SSR prerender
function getFirebaseApp() {
  if (typeof window === 'undefined') return null
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
}

const firebaseApp = getFirebaseApp()
export const firebaseAuth = firebaseApp
  ? getAuth(firebaseApp)
  : (null as unknown as ReturnType<typeof getAuth>)

// In development, use the local Firebase Auth Emulator.
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && firebaseAuth) {
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

export default firebaseApp
