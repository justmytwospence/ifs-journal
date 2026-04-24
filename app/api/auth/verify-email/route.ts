import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
import { captureException } from '@/lib/logger'
import { enforceRateLimit, getClientIp, HOUR_MS } from '@/lib/rate-limit'
import { hashToken } from '@/lib/tokens'

const bodySchema = z.object({
  token: z.string().min(1).max(200),
})

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const limited = await enforceRateLimit({
      subjectKey: `ip:${ip}`,
      bucket: 'auth:verify-email',
      limit: 30,
      windowMs: HOUR_MS,
    })
    if (limited) return limited

    const { token } = bodySchema.parse(await request.json())
    const row = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
    })

    if (!row || row.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This verification link is invalid or has expired.' },
        { status: 400 }
      )
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: row.userId }, data: { emailVerified: true } }),
      prisma.emailVerificationToken.deleteMany({ where: { userId: row.userId } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    captureException(error, { route: 'POST /api/auth/verify-email' })
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
