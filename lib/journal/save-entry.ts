import type { JournalEntry } from '@prisma/client'
import { computeContentHash } from '@/lib/anchoring'
import prisma from '@/lib/db'
import { createEntrySlug } from '@/lib/slug-utils'

export interface SaveEntryOptions {
  userId: string
  prompt: string
  content: string
  wordCount: number
  /** Defaults to now. Pass an explicit date for back-dated seeds / eval runs. */
  createdAt?: Date
}

/**
 * Persists a journal entry. No analysis side-effects — callers that want
 * incremental analysis (the API route) wrap this with their own `after()`
 * hook; the eval harness runs batch analysis once at the end of a run.
 */
export async function saveEntry({
  userId,
  prompt,
  content,
  wordCount,
  createdAt = new Date(),
}: SaveEntryOptions): Promise<JournalEntry> {
  return prisma.journalEntry.create({
    data: {
      userId,
      slug: createEntrySlug(createdAt),
      prompt,
      content,
      contentHash: computeContentHash(content),
      wordCount,
      analysisStatus: 'pending',
      createdAt,
    },
  })
}
