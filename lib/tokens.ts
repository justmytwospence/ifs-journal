import { createHash, randomBytes } from 'node:crypto'

// 32 bytes → 256 bits of entropy. Stored as URL-safe base64 (no padding).
export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}
