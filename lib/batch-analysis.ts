import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PrismaClient } from '@prisma/client'
import { ANALYSIS_MODEL, anthropic } from './anthropic'
import { type ParsedPart, parseCitationsResponse } from './citation-parser'
import { debugLog } from './logger'
import { deduplicateParts, normalizeName } from './part-similarity'
import { slugify } from './slug-utils'

const PART_COLORS = {
  Protector: '#ef4444',
  Manager: '#f59e0b',
  Firefighter: '#f97316',
  Exile: '#8b5cf6',
}

const CONTEXT_LENGTH = 32

export interface BatchAnalysisResult {
  partsCreated: number
  entriesAnalyzed: number
}

/**
 * Reanalyze every journal entry for a user via Anthropic Citations, replacing
 * their existing parts / analyses / highlights. Used both by the API route
 * (POST /api/parts/batch-reanalysis) and by the seed script after it creates
 * fresh demo entries.
 */
export async function runBatchAnalysis(
  prisma: PrismaClient,
  userId: string,
  options: { signal?: AbortSignal } = {}
): Promise<BatchAnalysisResult> {
  const entries = await prisma.journalEntry.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  })

  if (entries.length === 0) {
    return { partsCreated: 0, entriesAnalyzed: 0 }
  }

  const templatePath = join(process.cwd(), 'lib/prompts/batch-entries-reanalysis.md')
  const systemPrompt = await readFile(templatePath, 'utf-8')

  const documentBlocks = entries.map((entry, i) => ({
    type: 'document' as const,
    source: { type: 'text' as const, data: entry.content, media_type: 'text/plain' as const },
    title: `Entry ${i + 1} — ${entry.createdAt.toISOString().split('T')[0]}`,
    citations: { enabled: true },
  }))

  // Streaming is required for long-running calls (max_tokens this large
  // would otherwise trip the SDK's >10 min HTTP-timeout guard).
  const stream = anthropic.messages.stream(
    {
      model: ANALYSIS_MODEL,
      max_tokens: 32000,
      thinking: { type: 'adaptive' },
      // Cache the full system prompt — batch reanalysis is rerun on
      // demand and during seed; identical prefix across calls.
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                `Below are ${entries.length} journal entries by this user, in chronological order. Each has a prompt shown to the writer:\n\n` +
                entries.map((e, i) => `Entry ${i + 1} prompt: ${e.prompt}`).join('\n'),
            },
            ...documentBlocks,
            {
              type: 'text',
              text: 'Analyze all entries holistically and identify up to 9 distinct parts. Cite passages from across the entries that evidence each part.',
            },
          ],
        },
      ],
    },
    options.signal ? { signal: options.signal } : undefined
  )
  const response = await stream.finalMessage()

  const usage = response.usage
  console.log(
    `batch-analysis entries=${entries.length} cache_read=${usage.cache_read_input_tokens ?? 0} cache_write=${usage.cache_creation_input_tokens ?? 0} input=${usage.input_tokens} output=${usage.output_tokens}`
  )

  const rawParts = parseCitationsResponse(response.content)
  console.log(`Claude returned ${rawParts.length} parts across ${entries.length} entries`)

  const partsWithTempId = rawParts.map((p, i) => ({ ...p, tempId: `p${i}` }))

  const tempIdToCanonical = deduplicateParts(
    partsWithTempId.map((p) => ({
      tempId: p.tempId,
      name: p.name,
      role: p.role,
      description: p.description ?? '',
    }))
  )

  const seenNormalizedNames = new Set<string>()
  const deduplicatedParts = partsWithTempId.filter((p) => {
    if (tempIdToCanonical.get(p.tempId) !== p.tempId) {
      debugLog(`Skipping "${p.name}" — merged via similarity`)
      return false
    }
    const normalized = normalizeName(p.name)
    if (seenNormalizedNames.has(normalized)) {
      debugLog(`Skipping duplicate normalized name: ${p.name} → ${normalized}`)
      return false
    }
    seenNormalizedNames.add(normalized)
    return true
  })

  const finalParts = deduplicatedParts.slice(0, 9)
  if (deduplicatedParts.length > 9) {
    console.log(`Trimmed ${deduplicatedParts.length} parts down to 9`)
  }

  const createdParts = await prisma.$transaction(
    async (tx) => {
      await tx.highlight.deleteMany({
        where: { partAnalysis: { entry: { userId } } },
      })
      await tx.partAnalysis.deleteMany({ where: { entry: { userId } } })
      await tx.part.deleteMany({ where: { userId } })

      await tx.journalEntry.updateMany({
        where: { userId },
        data: { analysisStatus: 'processing' },
      })

      const partsMap = new Map<string, { id: string; name: string }>()

      for (const part of finalParts) {
        const created = await tx.part.create({
          data: {
            userId,
            name: part.name,
            slug: slugify(part.name),
            description: part.description ?? '',
            role: part.role,
            color: PART_COLORS[part.role as keyof typeof PART_COLORS] || '#6366f1',
            icon: part.icon ?? '●',
          },
        })
        partsMap.set(part.tempId, created)
      }

      type InstanceWithCitations = ParsedPart['instances'][number]
      const analysisCache = new Map<string, string>()
      const processedEntryIds = new Set<string>()

      async function ensureAnalysis(partDbId: string, entryId: string, confidence: number) {
        const key = `${entryId}:${partDbId}`
        const cached = analysisCache.get(key)
        if (cached) return cached
        const analysis = await tx.partAnalysis.create({
          data: { entryId, partId: partDbId, confidence },
        })
        analysisCache.set(key, analysis.id)
        processedEntryIds.add(entryId)
        return analysis.id
      }

      for (const part of finalParts) {
        const dbPart = partsMap.get(part.tempId)
        if (!dbPart) continue

        for (const instance of part.instances as InstanceWithCitations[]) {
          for (const citation of instance.citations) {
            const entry = entries[citation.documentIndex]
            if (!entry) continue

            const analysisId = await ensureAnalysis(dbPart.id, entry.id, part.confidence)

            await tx.highlight.create({
              data: {
                partAnalysisId: analysisId,
                startOffset: citation.startOffset,
                endOffset: citation.endOffset,
                exact: citation.citedText,
                prefix: entry.content.slice(
                  Math.max(0, citation.startOffset - CONTEXT_LENGTH),
                  citation.startOffset
                ),
                suffix: entry.content.slice(
                  citation.endOffset,
                  Math.min(entry.content.length, citation.endOffset + CONTEXT_LENGTH)
                ),
                reasoning: instance.reasoning,
                isStale: false,
              },
            })
          }
        }
      }

      await tx.journalEntry.updateMany({
        where: { userId },
        data: { analysisStatus: 'completed' },
      })

      const unmapped = entries.filter((e) => !processedEntryIds.has(e.id))
      if (unmapped.length > 0) {
        console.log(`${unmapped.length} entries had no part citations`)
      }

      return partsMap
    },
    { timeout: 120000 }
  )

  return {
    partsCreated: createdParts.size,
    entriesAnalyzed: entries.length,
  }
}
