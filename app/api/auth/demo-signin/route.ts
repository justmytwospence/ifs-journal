import { NextResponse } from 'next/server'
import { signIn } from '@/lib/auth'
import { captureException } from '@/lib/logger'
import { enforceRateLimit, getClientIp, HOUR_MS } from '@/lib/rate-limit'

// Server-initiated demo sign-in. The demo user's password is random bytes
// nothing else knows — sign-in is authorized by matching DEMO_USER_EMAIL
// inside the passwordless `demo` NextAuth provider, not by a shared secret.
export async function POST(request: Request) {
  if (!process.env.DEMO_USER_EMAIL) {
    return NextResponse.json({ error: 'Demo is not configured.' }, { status: 503 })
  }

  // CSRF: only accept requests from our own origin. NextAuth has its own CSRF
  // protection on the callback endpoint, but we re-check here so this entry
  // point can't be triggered cross-site to sign a visiting user into demo.
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

  const ip = getClientIp(request.headers)
  const limited = await enforceRateLimit({
    subjectKey: `ip:${ip}`,
    bucket: 'auth:demo-signin',
    limit: 10,
    windowMs: HOUR_MS,
  })
  if (limited) return limited

  try {
    await signIn('demo', { redirect: false })
    return NextResponse.json({ success: true })
  } catch (error) {
    captureException(error, { route: 'POST /api/auth/demo-signin' })
    return NextResponse.json({ error: 'Demo sign-in failed.' }, { status: 500 })
  }
}
