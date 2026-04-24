import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
import { sendVerificationEmail } from '@/lib/email'
import { emailField } from '@/lib/email-utils'
import { captureException } from '@/lib/logger'
import { enforceRateLimit, getClientIp, HOUR_MS } from '@/lib/rate-limit'
import { generateToken, hashToken } from '@/lib/tokens'

const bodySchema = z.object({
  email: emailField,
})

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const limited = await enforceRateLimit({
      subjectKey: `ip:${ip}`,
      bucket: 'auth:resend-verification',
      limit: 5,
      windowMs: HOUR_MS,
    })
    if (limited) return limited

    const { email } = bodySchema.parse(await request.json())

    // Per-email bucket so IP rotation can't flood a single victim's inbox.
    const emailLimited = await enforceRateLimit({
      subjectKey: `email:${email}`,
      bucket: 'auth:resend-verification',
      limit: 3,
      windowMs: HOUR_MS,
    })
    if (emailLimited) return emailLimited

    const user = await prisma.user.findUnique({ where: { email } })

    // Respond success regardless of account existence / verification state to
    // avoid enumeration. Only send an email for an unverified real account.
    if (user && !user.emailVerified) {
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
        captureException(new Error(`Resend verification failed: ${emailResult.error}`), {
          route: 'POST /api/auth/resend-verification',
          userId: user.id,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    captureException(error, { route: 'POST /api/auth/resend-verification' })
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}
