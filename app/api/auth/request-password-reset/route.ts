import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'
import { emailField } from '@/lib/email-utils'
import { captureException } from '@/lib/logger'
import { enforceRateLimit, getClientIp, HOUR_MS } from '@/lib/rate-limit'
import { generateToken, hashToken } from '@/lib/tokens'

const bodySchema = z.object({
  email: emailField,
})

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1h

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const limited = await enforceRateLimit({
      subjectKey: `ip:${ip}`,
      bucket: 'auth:request-password-reset',
      limit: 5,
      windowMs: HOUR_MS,
    })
    if (limited) return limited

    const { email } = bodySchema.parse(await request.json())

    // Per-email bucket in addition to the per-IP limit above, so an attacker
    // rotating IPs can't flood a single victim's inbox.
    const emailLimited = await enforceRateLimit({
      subjectKey: `email:${email}`,
      bucket: 'auth:request-password-reset',
      limit: 3,
      windowMs: HOUR_MS,
    })
    if (emailLimited) return emailLimited

    const user = await prisma.user.findUnique({ where: { email } })

    // Always respond success to avoid enumeration. Only send mail for real
    // accounts.
    if (user) {
      // Invalidate any outstanding reset tokens for this user before minting a
      // new one — otherwise each request stacks a live token until expiry.
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      })
      const token = generateToken()
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      })
      const emailResult = await sendPasswordResetEmail(email, token)
      if (!emailResult.ok) {
        captureException(new Error(`Password reset email failed: ${emailResult.error}`), {
          route: 'POST /api/auth/request-password-reset',
          userId: user.id,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    captureException(error, { route: 'POST /api/auth/request-password-reset' })
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}
