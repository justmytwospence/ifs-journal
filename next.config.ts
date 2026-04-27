import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Include markdown prompt files in serverless function bundles
  outputFileTracingIncludes: {
    '/api/parts/batch-reanalysis': ['./lib/prompts/**/*'],
    '/api/journal/entries/[id]/incremental-analysis': ['./lib/prompts/**/*'],
    '/api/prompts/generate': ['./lib/prompts/**/*'],
    '/api/prompts/writing-tips': ['./lib/prompts/**/*'],
    '/api/conversations': ['./lib/prompts/**/*'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

// Only wrap with Sentry when the required env vars are present. Without a DSN
// the wrapper would still instrument the build but log a warning on every
// prod build; with SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN present it
// uploads source maps so stack traces are readable instead of minified.
const sentryConfigured =
  process.env.SENTRY_ORG && process.env.SENTRY_PROJECT && process.env.SENTRY_AUTH_TOKEN

export default sentryConfigured
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
    })
  : nextConfig
