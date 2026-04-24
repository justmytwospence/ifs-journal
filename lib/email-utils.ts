import { z } from 'zod'

// Postgres @unique is case-sensitive, so `Foo@Bar.com` and `foo@bar.com` would
// become two separate accounts without normalization. Every auth entry point
// must go through one of these helpers.

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export const emailField = z.preprocess(
  (v) => (typeof v === 'string' ? normalizeEmail(v) : v),
  z.string().email().max(254)
)
