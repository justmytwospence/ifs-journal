import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSec: number
}

type CheckOpts = {
  subjectKey: string
  bucket: string
  limit: number
  windowMs: number
}

// Fixed-window counter. Each (subjectKey, bucket, windowStart) row tracks a count.
// Atomic via unique constraint + upsert — concurrent requests either create the
// row with count=1 or increment the existing row.
export async function checkRateLimit(opts: CheckOpts): Promise<RateLimitResult> {
  const { subjectKey, bucket, limit, windowMs } = opts
  const now = Date.now()
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs)
  const windowEnd = windowStart.getTime() + windowMs

  const row = await prisma.rateLimit.upsert({
    where: {
      subjectKey_bucket_windowStart: { subjectKey, bucket, windowStart },
    },
    create: { subjectKey, bucket, windowStart, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  })

  const remaining = Math.max(0, limit - row.count)
  const retryAfterSec = Math.max(0, Math.ceil((windowEnd - now) / 1000))

  return {
    allowed: row.count <= limit,
    remaining,
    retryAfterSec,
  }
}

// Extract a best-effort client IP from a Next.js request headers object.
// Trust x-forwarded-for first hop (Vercel sets this); fall back to remote if present.
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || 'unknown'
  return headers.get('x-real-ip') || 'unknown'
}

// Convenience wrapper: runs the limiter and returns a 429 Response if blocked.
// Returns null if the request is within budget (caller proceeds).
export async function enforceRateLimit(opts: CheckOpts): Promise<NextResponse | null> {
  const result = await checkRateLimit(opts)
  if (result.allowed) return null
  return NextResponse.json(
    { error: 'Too many requests. Please slow down and try again later.' },
    {
      status: 429,
      headers: { 'Retry-After': String(result.retryAfterSec) },
    }
  )
}

// Bucket window presets.
export const HOUR_MS = 60 * 60 * 1000
export const DAY_MS = 24 * HOUR_MS
