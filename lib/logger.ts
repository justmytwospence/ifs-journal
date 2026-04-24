// Thin wrapper around Sentry so route handlers don't import it directly.
// When SENTRY_DSN is missing (local dev, misconfigured prod), falls back to console.

import * as Sentry from '@sentry/nextjs'

const sentryEnabled = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)

export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (sentryEnabled) {
    Sentry.captureException(err, context ? { extra: context } : undefined)
  } else {
    console.error('[logger]', err, context ?? '')
  }
}

export function captureMessage(message: string, context?: Record<string, unknown>) {
  if (sentryEnabled) {
    Sentry.captureMessage(message, context ? { extra: context } : undefined)
  } else {
    console.info('[logger]', message, context ?? '')
  }
}
