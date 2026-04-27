import { NextResponse } from 'next/server'
import { getDemoEmails, signIn } from '@/lib/auth'
import { captureException } from '@/lib/logger'
import { enforceRateLimit, getClientIp, HOUR_MS } from '@/lib/rate-limit'

// Server-initiated demo sign-in. The demo user's password is random bytes
// nothing else knows — sign-in is authorized by matching the persona slug
// against the demo allow-list inside the passwordless `demo` NextAuth
// provider, not by a shared secret.
//
// Body: { profile?: string } where `profile` is a persona slug from the
// /demo picker. Omitted = legacy single-account demo via DEMO_USER_EMAIL.
export async function POST(request: Request) {
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
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
  }

  // Reject early if there's no demo configured at all (no personas, no
  // legacy env var). Catches the "demo isn't deployed" case with a useful
  // error instead of a generic 500.
  if (getDemoEmails().size === 0) {
    return NextResponse.json({ error: 'Demo is not configured.' }, { status: 503 })
  }

  // `profile` is optional. If missing or invalid, the demo provider falls
  // back to the legacy account — that keeps legacy callers working during
  // the picker rollout.
  let profile: string | undefined
  try {
    const body = await request.json()
    if (typeof body?.profile === 'string' && body.profile.trim()) {
      profile = body.profile.trim()
    }
  } catch {
    // No body — legacy single-account flow.
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
    await signIn('demo', { profile, redirect: false })
    return NextResponse.json({ success: true })
  } catch (error) {
    captureException(error, { route: 'POST /api/auth/demo-signin' })
    return NextResponse.json({ error: 'Demo sign-in failed.' }, { status: 500 })
  }
}
