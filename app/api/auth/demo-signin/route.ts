import { NextResponse } from 'next/server'
import { signIn } from '@/lib/auth'
import { captureException } from '@/lib/logger'
import { enforceRateLimit, getClientIp, HOUR_MS } from '@/lib/rate-limit'

// Server-side demo sign-in. Credentials are read from env so they never ship
// in the client bundle or responses. See DEMO_USER_EMAIL / DEMO_USER_PASSWORD.
export async function POST(request: Request) {
  const email = process.env.DEMO_USER_EMAIL
  const password = process.env.DEMO_USER_PASSWORD

  if (!email || !password) {
    return NextResponse.json({ error: 'Demo is not configured.' }, { status: 503 })
  }

  // CSRF: only accept requests from our own origin. A cross-site POST could
  // otherwise trigger a demo-account sign-in on a visiting user's browser
  // (session fixation). NEXTAUTH_URL is the canonical origin; requests with a
  // missing or mismatched Origin header are rejected.
  const expected = process.env.NEXTAUTH_URL
  if (!expected) {
    return NextResponse.json({ error: 'Demo is not configured.' }, { status: 503 })
  }
  const origin = request.headers.get('origin')
  try {
    if (!origin || new URL(origin).origin !== new URL(expected).origin) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
  }

  // Rate-limit so an attacker (or a misbehaving client) can't burn the bcrypt
  // budget by hammering this endpoint.
  const ip = getClientIp(request.headers)
  const limited = await enforceRateLimit({
    subjectKey: `ip:${ip}`,
    bucket: 'auth:demo-signin',
    limit: 10,
    windowMs: HOUR_MS,
  })
  if (limited) return limited

  try {
    // signIn with redirect: false returns without throwing on success; any
    // session cookie it sets propagates in the response headers.
    await signIn('credentials', { email, password, redirect: false })
    return NextResponse.json({ success: true })
  } catch (error) {
    captureException(error, { route: 'POST /api/auth/demo-signin' })
    return NextResponse.json({ error: 'Demo sign-in failed.' }, { status: 500 })
  }
}
