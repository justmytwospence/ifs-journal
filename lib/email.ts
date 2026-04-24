import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
// Resend's shared test sender works without domain verification so first-time
// setup doesn't block on DNS. Override via EMAIL_FROM once your domain is
// verified in Resend (deliverability is much better with a verified domain).
const EMAIL_FROM = process.env.EMAIL_FROM || 'IFS Journal <onboarding@resend.dev>'
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

const client = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

export function isEmailConfigured(): boolean {
  return client !== null
}

type SendResult = { ok: true } | { ok: false; error: string }

async function send(to: string, subject: string, html: string, text: string): Promise<SendResult> {
  if (!client) {
    // Dev fallback: log to console so local flows still work without a Resend key.
    console.info(`[email:dev] to=${to} subject="${subject}"\n${text}`)
    return { ok: true }
  }
  const res = await client.emails.send({ from: EMAIL_FROM, to, subject, html, text })
  if (res.error) return { ok: false, error: res.error.message }
  return { ok: true }
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`
  const subject = 'Verify your IFS Journal email'
  const text = `Welcome to IFS Journal.\n\nConfirm your email to activate your account:\n${url}\n\nThis link expires in 24 hours. If you didn't sign up, you can ignore this email.`
  const html = `
    <p>Welcome to IFS Journal.</p>
    <p>Confirm your email to activate your account:</p>
    <p><a href="${url}">Verify email</a></p>
    <p style="color:#666;font-size:12px">This link expires in 24 hours. If you didn't sign up, you can ignore this email.</p>
  `
  return send(to, subject, html, text)
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`
  const subject = 'Reset your IFS Journal password'
  const text = `Someone requested a password reset for your IFS Journal account.\n\nReset your password:\n${url}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`
  const html = `
    <p>Someone requested a password reset for your IFS Journal account.</p>
    <p><a href="${url}">Reset password</a></p>
    <p style="color:#666;font-size:12px">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
  `
  return send(to, subject, html, text)
}
