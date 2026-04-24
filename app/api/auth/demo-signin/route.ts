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

  // CSRF: Origin must match the host this request actually came in on.
  // Vercel's proxy can populate any of a few host-ish headers, so accept
  // a match against any of them. NextAuth has its own CSRF token on the
  // callback endpoint — this is defense in depth, not the primary guard.
  const origin = request.headers.get('origin')
  let originHost: string | null = null
  try {
    originHost = origin ? new URL(origin).host : null
  } catch {
    originHost = null
  }
  const candidateHosts = new Set<string>()
  for (const h of [request.headers.get('host'), request.headers.get('x-forwarded-host')]) {
    if (h) candidateHosts.add(h.toLowerCase())
  }
  try {
    candidateHosts.add(new URL(request.url).host.toLowerCase())
  } catch {
    // ignore
  }
  if (!originHost || !candidateHosts.has(originHost.toLowerCase())) {
    return NextResponse.json(
      {
        error: 'Invalid origin.',
        debug: {
          origin,
          originHost,
          candidates: [...candidateHosts],
          requestUrl: request.url,
        },
      },
      { status: 403 }
    )
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
