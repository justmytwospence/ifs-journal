import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ANALYSIS_MODEL, anthropic } from '@/lib/anthropic'
import { type ParsedPart, parseCitationsResponse } from '@/lib/citation-parser'
import prisma from '@/lib/db'
import { captureException } from '@/lib/logger'
import { findSimilarPart } from '@/lib/part-similarity'
import { slugify } from '@/lib/slug-utils'

const PART_COLORS = {
  Protector: '#ef4444',
  Manager: '#f59e0b',
  Firefighter: '#f97316',
  Exile: '#8b5cf6',
}

const CONTEXT_LENGTH = 32

// Entries stuck in `processing` for more than this are considered orphaned
// (function killed mid-run by Vercel's 60/300s timeout, or a concurrent crash)
// and will be reaped back to `failed` so the UI doesn't hang forever.
export const STUCK_PROCESSING_MS = 5 * 60 * 1000

function buildSelector(
  text: string,
  citation: ParsedPart['instances'][number]['citations'][number]
) {
  const { startOffset, endOffset, citedText } = citation
  return {
    startOffset,
    endOffset,
    exact: citedText,
    prefix: text.slice(Math.max(0, startOffset - CONTEXT_LENGTH), startOffset),
    suffix: text.slice(endOffset, Math.min(text.length, endOffset + CONTEXT_LENGTH)),
  }
}

export type RunIncrementalAnalysisResult =
  | { ok: true; partsFound: number }
  | { ok: false; reason: 'not-found' | 'error' }

// Runs the full incremental analysis pipeline for one entry. Safe to call from
// a route handler (for explicit retries) or via `after()` (for post-response
// work triggered by entry creation). Owns all status transitions — callers
// should not touch analysisStatus themselves.
export async function runIncrementalAnalysis({
  entryId,
  userId,
  signal,
}: {
  entryId: string
  userId: string
  signal?: AbortSignal
}): Promise<RunIncrementalAnalysisResult> {
  try {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId, userId },
    })

    if (!entry) {
      return { ok: false, reason: 'not-found' }
    }

    await prisma.journalEntry.update({
      where: { id: entryId },
      data: { analysisStatus: 'processing' },
    })

    const existingParts = await prisma.part.findMany({
      where: { userId },
      include: { partAnalyses: true },
    })

    const templatePath = join(process.cwd(), 'lib/prompts/incremental-entry-analysis.md')
    const template = await readFile(templatePath, 'utf-8')

    // Placeholder is at the end of the template so the front (large, stable)
    // is cacheable and the user-specific parts list is the only uncached tail.
    const [templatePrefix] = template.split('{{EXISTING_PARTS}}')

    const partsContext =
      existingParts.length > 0
        ? existingParts.map((p) => `- ${p.name} (${p.role}): ${p.description}`).join('\n')
        : 'No existing parts yet.'

    // Pass the request signal through so a client disconnect aborts the
    // upstream Anthropic call instead of racking up tokens on an abandoned
    // stream. Streaming matches batch-analysis.ts; a sync create() silently
    // dies at Vercel's 60s function timeout on slow responses.
    const stream = anthropic.messages.stream(
      {
        model: ANALYSIS_MODEL,
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        system: [
          {
            type: 'text',
            text: templatePrefix,
            cache_control: { type: 'ephemeral' },
          },
          { type: 'text', text: `## Existing Parts\n\n${partsContext}` },
        ],
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Journal prompt shown to the writer: ${entry.prompt}`,
              },
              {
                type: 'document',
                source: { type: 'text', data: entry.content, media_type: 'text/plain' },
                title: 'Journal Entry',
                citations: { enabled: true },
              },
              {
                type: 'text',
                text: 'Analyze this journal entry for internal parts. Cite passages that evidence each part.',
              },
            ],
          },
        ],
      },
      signal ? { signal } : undefined
    )
    const response = await stream.finalMessage()

    const parsedParts = parseCitationsResponse(response.content)

    for (const partData of parsedParts) {
      const partDataForMatch = {
        name: partData.name,
        role: partData.role,
        description: partData.description ?? '',
      }

      const matchedPartId = findSimilarPart(
        partDataForMatch,
        existingParts.map((p) => ({
          id: p.id,
          name: p.name,
          role: p.role,
          description: p.description,
        }))
      )

      let part: (typeof existingParts)[number] | undefined
      if (matchedPartId) {
        part = existingParts.find((p) => p.id === matchedPartId)
      } else {
        if (existingParts.length >= 9) {
          const partsWithConfidence = await Promise.all(
            existingParts.map(async (p) => {
              const analyses = await prisma.partAnalysis.findMany({
                where: { partId: p.id },
                select: { confidence: true },
              })
              const avgConfidence =
                analyses.length > 0
                  ? analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length
                  : 0
              return { part: p, avgConfidence }
            })
          )

          const lowestConfidencePart = partsWithConfidence.reduce((min, curr) =>
            curr.avgConfidence < min.avgConfidence ? curr : min
          )

          await prisma.highlight.deleteMany({
            where: { partAnalysis: { partId: lowestConfidencePart.part.id } },
          })
          await prisma.partAnalysis.deleteMany({
            where: { partId: lowestConfidencePart.part.id },
          })
          await prisma.part.delete({
            where: { id: lowestConfidencePart.part.id },
          })

          const index = existingParts.findIndex((p) => p.id === lowestConfidencePart.part.id)
          if (index > -1) existingParts.splice(index, 1)
        }

        part = await prisma.part.upsert({
          where: {
            userId_name: {
              userId,
              name: partData.name,
            },
          },
          update: {},
          create: {
            userId,
            name: partData.name,
            slug: slugify(partData.name),
            description: partData.description ?? '',
            role: partData.role,
            color: PART_COLORS[partData.role as keyof typeof PART_COLORS] || '#6366f1',
            icon: partData.icon ?? '●',
          },
          include: { partAnalyses: true },
        })

        existingParts.push(part)
      }

      if (!part) continue

      const partAnalysis = await prisma.partAnalysis.upsert({
        where: {
          entryId_partId: { entryId: entry.id, partId: part.id },
        },
        update: { confidence: partData.confidence },
        create: {
          entryId: entry.id,
          partId: part.id,
          confidence: partData.confidence,
        },
      })

      await prisma.highlight.deleteMany({
        where: { partAnalysisId: partAnalysis.id },
      })

      for (const instance of partData.instances) {
        for (const citation of instance.citations) {
          if (citation.documentIndex !== 0) continue
          const selector = buildSelector(entry.content, citation)
          await prisma.highlight.create({
            data: {
              partAnalysisId: partAnalysis.id,
              startOffset: selector.startOffset,
              endOffset: selector.endOffset,
              exact: selector.exact,
              prefix: selector.prefix,
              suffix: selector.suffix,
              reasoning: instance.reasoning,
              isStale: false,
            },
          })
        }
      }
    }

    await prisma.journalEntry.update({
      where: { id: entryId },
      data: { analysisStatus: 'completed' },
    })

    return { ok: true, partsFound: parsedParts.length }
  } catch (error) {
    captureException(error, { route: 'runIncrementalAnalysis', entryId, userId })
    try {
      await prisma.journalEntry.update({
        where: { id: entryId },
        data: { analysisStatus: 'failed' },
      })
    } catch (updateError) {
      captureException(updateError, { route: 'runIncrementalAnalysis:setFailed', entryId })
    }
    return { ok: false, reason: 'error' }
  }
}

// Sweep entries stuck in `processing` for too long back to `failed`. Called
// opportunistically on list reads — no cron needed for low volume.
export async function reapStuckAnalyses(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - STUCK_PROCESSING_MS)
  await prisma.journalEntry.updateMany({
    where: {
      userId,
      analysisStatus: 'processing',
      updatedAt: { lt: cutoff },
    },
    data: { analysisStatus: 'failed' },
  })
}
