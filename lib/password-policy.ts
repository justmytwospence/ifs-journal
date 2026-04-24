import { z } from 'zod'

/**
 * Bcrypt work factor for password hashing.
 * 14 rounds → ~250ms per hash on modern hardware (Apple M-series).
 * Doubles every increment; 12 was the 2023 default.
 */
export const BCRYPT_ROUNDS = 14

/**
 * Password policy for NEW accounts.
 *
 * Length beats class rules — 12 chars is the 2025 baseline. We additionally
 * require one non-alphanumeric character as a cheap way to keep users from
 * using dictionary words padded with digits.
 *
 * Login (lib/auth.ts) still accepts min-8 passwords so accounts that predate
 * this policy can still authenticate. Only registration and future password
 * changes enforce the new floor.
 */
export const newPasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .refine(
    (pw) => /[^A-Za-z0-9]/.test(pw),
    'Password must include at least one non-alphanumeric character (e.g., !@#$%)'
  )

export const NEW_PASSWORD_HINT =
  'At least 12 characters, including one symbol (like !@#$%).'
