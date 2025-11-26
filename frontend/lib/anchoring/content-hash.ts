/**
 * Content hashing utility for change detection.
 * 
 * Uses SHA-256 to create a hash of journal entry content.
 * When content is edited, the hash changes, allowing us to
 * detect when highlights may be stale.
 */

import { createHash } from 'crypto'

/**
 * Compute SHA-256 hash of content.
 * 
 * @param content - The text content to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function computeContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

/**
 * Check if content has changed by comparing hashes.
 * 
 * @param content - Current content
 * @param storedHash - Previously stored hash
 * @returns true if content has changed
 */
export function hasContentChanged(content: string, storedHash: string): boolean {
  return computeContentHash(content) !== storedHash
}
