import { hash } from 'bcryptjs'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
import { captureException } from '@/lib/logger'
import { BCRYPT_ROUNDS, newPasswordSchema } from '@/lib/password-policy'
import { enforceRateLimit, getClientIp, HOUR_MS } from '@/lib/rate-limit'
import { hashToken } from '@/lib/tokens'

const bodySchema = z.object({
  token: z.string().min(1).max(200),
  password: newPasswordSchema,
})

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const limited = await enforceRateLimit({
      subjectKey: `ip:${ip}`,
      bucket: 'auth:reset-password',
      limit: 10,
      windowMs: HOUR_MS,
    })
    if (limited) return limited

    const { token, password } = bodySchema.parse(await request.json())

    const row = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    })

    if (!row || row.usedAt || row.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired.' },
        { status: 400 }
      )
    }

    const passwordHash = await hash(password, BCRYPT_ROUNDS)

    await prisma.$transaction([
      prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate any other outstanding reset tokens for this user.
      prisma.passwordResetToken.updateMany({
        where: { userId: row.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    captureException(error, { route: 'POST /api/auth/reset-password' })
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 })
  }
}
