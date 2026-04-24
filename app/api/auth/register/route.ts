import { hash } from 'bcryptjs'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
import { sendVerificationEmail } from '@/lib/email'
import { emailField } from '@/lib/email-utils'
import { captureException } from '@/lib/logger'
import { BCRYPT_ROUNDS, newPasswordSchema } from '@/lib/password-policy'
import { enforceRateLimit, getClientIp, HOUR_MS } from '@/lib/rate-limit'
import { generateToken, hashToken } from '@/lib/tokens'

const registerSchema = z.object({
  email: emailField,
  password: newPasswordSchema,
})

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24h

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const limited = await enforceRateLimit({
      subjectKey: `ip:${ip}`,
      bucket: 'auth:register',
      limit: 10,
      windowMs: HOUR_MS,
    })
    if (limited) return limited

    const body = await request.json()
    const { email, password } = registerSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    // Respond identically whether or not the account already exists, so the
    // endpoint can't be used to enumerate registered emails. We still need to
    // consume the bcrypt wall time on the collision path or response latency
    // would reveal account existence (BCRYPT_ROUNDS=14 is ~250ms — very
    // distinguishable from a sub-millisecond DB lookup).
    if (existingUser) {
      await hash(password, BCRYPT_ROUNDS)
      return NextResponse.json({ success: true, user: { email } }, { status: 201 })
    }

    const passwordHash = await hash(password, BCRYPT_ROUNDS)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        emailVerified: false,
      },
    })

    const token = generateToken()
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
      },
    })

    const emailResult = await sendVerificationEmail(email, token)
    if (!emailResult.ok) {
      captureException(new Error(`Verification email failed: ${emailResult.error}`), {
        route: 'POST /api/auth/register',
        userId: user.id,
      })
    }

    return NextResponse.json({ success: true, user: { email } }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }

    captureException(error, { route: 'POST /api/auth/register' })
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
