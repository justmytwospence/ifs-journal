import { compare } from 'bcryptjs'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import prisma from '@/lib/db'
import { emailField, normalizeEmail } from '@/lib/email-utils'
import { captureException } from '@/lib/logger'
import { checkRateLimit, getClientIp, HOUR_MS } from '@/lib/rate-limit'

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(8).max(200),
})

const DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL
  ? normalizeEmail(process.env.DEMO_USER_EMAIL)
  : undefined

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  providers: [
    // Passwordless demo provider. The demo user's stored passwordHash is
    // random bytes that nothing else knows, so no one can sign into the demo
    // account via the normal credentials flow — but a server-initiated
    // signIn('demo') always succeeds (subject to rate limiting). NextAuth's
    // built-in CSRF guards the callback endpoint against cross-origin abuse.
    Credentials({
      id: 'demo',
      credentials: {},
      authorize: async (_credentials, request) => {
        try {
          if (!DEMO_USER_EMAIL) return null

          const ip = getClientIp(request?.headers ?? new Headers())
          const limit = await checkRateLimit({
            subjectKey: `ip:${ip}`,
            bucket: 'auth:demo',
            limit: 30,
            windowMs: HOUR_MS,
          })
          if (!limit.allowed) return null

          const user = await prisma.user.findUnique({
            where: { email: DEMO_USER_EMAIL },
          })
          if (!user) return null

          return {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            isDemo: true,
          }
        } catch (error) {
          captureException(error, { route: 'authorize:demo' })
          return null
        }
      },
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials, request) => {
        try {
          const { email, password } = loginSchema.parse(credentials)

          // Rate-limit BEFORE the password check so spraying costs an attacker
          // a quota hit regardless of hit/miss. Two keys: per-IP (burst cap)
          // and per-email (single-account brute-force cap). Either hitting its
          // ceiling denies the attempt.
          const ip = getClientIp(request?.headers ?? new Headers())
          const ipLimit = await checkRateLimit({
            subjectKey: `ip:${ip}`,
            bucket: 'auth:login',
            limit: 30,
            windowMs: HOUR_MS,
          })
          if (!ipLimit.allowed) return null

          const emailLimit = await checkRateLimit({
            subjectKey: `email:${email}`,
            bucket: 'auth:login',
            limit: 10,
            windowMs: HOUR_MS,
          })
          if (!emailLimit.allowed) return null

          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user) {
            return null
          }

          const isValidPassword = await compare(password, user.passwordHash)

          if (!isValidPassword) {
            return null
          }

          const isDemoAccount =
            DEMO_USER_EMAIL !== undefined && user.email.toLowerCase() === DEMO_USER_EMAIL

          // Block sign-in for unverified accounts. Demo user is seeded with
          // emailVerified=false but allowed as a read-only account.
          if (!user.emailVerified && !isDemoAccount) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            isDemo: isDemoAccount,
          }
        } catch (error) {
          // Log unexpected errors (rate-limit DB hiccup, schema failure) so we
          // don't silently deny legitimate users without a trace in Sentry.
          if (!(error instanceof z.ZodError)) {
            captureException(error, { route: 'authorize' })
          }
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.isDemo = user.isDemo || false
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.isDemo = token.isDemo || false
      }
      return session
    },
  },
})
