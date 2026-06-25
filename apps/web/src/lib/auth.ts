import NextAuth from 'next-auth'
import type { Session } from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'

const nextAuth = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      id: 'phone-otp',
      name: 'Phone OTP',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        otp: { label: 'OTP', type: 'text' },
      },
      async authorize(credentials) {
        // TODO: replace with a real OTP verification call (MSG91 or similar)
        // SECURITY: Never hardcode or compare OTP values in source code.
        // The OTP must be verified against a time-limited code stored server-side
        // (e.g. in Redis or Postgres) that was sent via SMS.
        const validOtp = process.env.DEV_OTP_BYPASS
        if (
          credentials?.phone &&
          credentials?.otp &&
          process.env.NODE_ENV === 'development' &&
          validOtp &&
          credentials.otp === validOtp
        ) {
          return {
            id: 'user-phone-' + credentials.phone,
            name: 'User',
            phone: credentials.phone as string,
          }
        }
        return null
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})

export const handlers: { GET: typeof nextAuth.handlers.GET; POST: typeof nextAuth.handlers.POST } =
  nextAuth.handlers
export const signIn: typeof nextAuth.signIn = nextAuth.signIn
export const signOut: typeof nextAuth.signOut = nextAuth.signOut
export const auth: () => Promise<Session | null> = nextAuth.auth as () => Promise<Session | null>
