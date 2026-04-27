import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
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

// Demo accounts are derived from the filesystem: every persona under
// evals/personas/ that has a corresponding evals/snapshots/<slug>/latest.json
// becomes one demo account, plus the legacy DEMO_USER_EMAIL for backwards
// compatibility during rollout. Cached after first call so the directory
// scan happens at most once per process.
//
// The fs reads are inside a function (not at module init) because lib/auth.ts
// is also imported by middleware (proxy.ts), which runs in a context where
// dragging in fs at load time would be inappropriate. authorize() runs in
// Node API routes only, so the lazy load is safe there.
let cachedDemoEmails: Set<string> | null = null

function loadDemoEmails(): Set<string> {
  if (cachedDemoEmails) return cachedDemoEmails
  const out = new Set<string>()
  if (process.env.DEMO_USER_EMAIL) {
    out.add(normalizeEmail(process.env.DEMO_USER_EMAIL))
  }
  try {
    const files = readdirSync('evals/personas')
    for (const f of files) {
      if (!f.endsWith('.md')) continue
      const slug = f.replace(/\.md$/, '')
      if (existsSync(join('evals/snapshots', slug, 'latest.json'))) {
        out.add(normalizeEmail(`demo-${slug}@ifsjournal.me`))
      }
    }
  } catch {
    // evals/personas doesn't exist (fresh checkout, tests) — fall back to env-only.
  }
  cachedDemoEmails = out
  return out
}

export function getDemoEmails(): Set<string> {
  return loadDemoEmails()
}

// Admin emails come from a comma-separated env var. Same lazy-load + cache
// pattern as the demo set so module init stays cheap and proxy.ts doesn't
// pay the cost on every middleware invocation.
let cachedAdminEmails: Set<string> | null = null

function loadAdminEmails(): Set<string> {
  if (cachedAdminEmails) return cachedAdminEmails
  const out = new Set<string>()
  const raw = process.env.ADMIN_EMAILS ?? ''
  for (const part of raw.split(',')) {
    const email = part.trim()
    if (email) out.add(normalizeEmail(email))
  }
  cachedAdminEmails = out
  return out
}

export function isAdminEmail(email: string): boolean {
  return loadAdminEmails().has(normalizeEmail(email))
}

/**
 * Resolves a `profile` argument from the demo picker into an actual demo
 * email, or null if the slug isn't on the allow-list. Validates against the
 * derived set so a hostile `profile` can't become an arbitrary user lookup.
 */
function emailFromProfile(profile: unknown): string | null {
  if (typeof profile !== 'string') return null
  const slug = profile
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
  if (!slug) return null
  const email = normalizeEmail(`demo-${slug}@ifsjournal.me`)
  return loadDemoEmails().has(email) ? email : null
}

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
      credentials: {
        // `profile` is the persona slug from the demo picker. When omitted,
        // the legacy single-account demo (DEMO_USER_EMAIL) is used.
        profile: { label: 'Persona', type: 'text' },
      },
      authorize: async (credentials, request) => {
        try {
          // Resolve the demo email: prefer an allow-listed `profile`, fall
          // back to the legacy DEMO_USER_EMAIL for backwards compatibility
          // during rollout. Either way the result must be on the demo
          // allow-list — `loadDemoEmails()` is the single source of truth.
          const profileEmail = emailFromProfile(credentials?.profile)
          const legacyEmail = process.env.DEMO_USER_EMAIL
            ? normalizeEmail(process.env.DEMO_USER_EMAIL)
            : null
          const email = profileEmail ?? legacyEmail
          if (!email || !loadDemoEmails().has(email)) return null

          const ip = getClientIp(request?.headers ?? new Headers())
          const limit = await checkRateLimit({
            subjectKey: `ip:${ip}`,
            bucket: 'auth:demo',
            limit: 30,
            windowMs: HOUR_MS,
          })
          if (!limit.allowed) return null

          const user = await prisma.user.findUnique({ where: { email } })
          if (!user) return null

          return {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            isDemo: true,
            isAdmin: false,
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

          const isDemoAccount = loadDemoEmails().has(user.email.toLowerCase())

          // Block sign-in for unverified accounts. Demo users are seeded with
          // emailVerified=false but allowed as a read-only account.
          if (!user.emailVerified && !isDemoAccount) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            isDemo: isDemoAccount,
            isAdmin: loadAdminEmails().has(user.email.toLowerCase()),
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
        token.isAdmin = user.isAdmin || false
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.isDemo = token.isDemo || false
        session.user.isAdmin = token.isAdmin || false
      }
      return session
    },
  },
})
