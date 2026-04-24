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

  // CSRF: Origin must match the request's own Host. On Vercel each preview
  // deployment has its own host, so comparing against a configured
  // NEXTAUTH_URL would break previews; comparing to the host Vercel actually
  // routed this request through is both simpler and more correct. NextAuth
  // has its own CSRF token on the callback endpoint — this is defense in
  // depth, not the primary guard.
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  try {
    if (!origin || !host || new URL(origin).host !== host) {
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
