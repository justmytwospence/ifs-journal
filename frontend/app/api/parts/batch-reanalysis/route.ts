import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { anthropic, ANALYSIS_MODEL } from '@/lib/anthropic'
import prisma from '@/lib/db'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { slugify } from '@/lib/slug-utils'
import { deduplicateParts, normalizeName } from '@/lib/part-similarity'
import { parseCitationsResponse, type ParsedPart } from '@/lib/citation-parser'

const PART_COLORS = {
  Protector: '#ef4444',
  Manager: '#f59e0b',
  Firefighter: '#f97316',
  Exile: '#8b5cf6',
}

const CONTEXT_LENGTH = 32

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const entries = await prisma.journalEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    })

    if (entries.length === 0) {
      return NextResponse.json({
        message: 'No journal entries to analyze',
        entriesAnalyzed: 0,
      })
    }

    const templatePath = join(process.cwd(), 'lib/prompts/batch-entries-reanalysis.md')
    const systemPrompt = await readFile(templatePath, 'utf-8')

    const documentBlocks = entries.map((entry, i) => ({
      type: 'document' as const,
      source: { type: 'text' as const, data: entry.content, media_type: 'text/plain' as const },
      title: `Entry ${i + 1} — ${entry.createdAt.toISOString().split('T')[0]}`,
      citations: { enabled: true },
    }))

    const response = await anthropic.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 32000,
      thinking: { type: 'adaptive' },
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Below are ${entries.length} journal entries by this user, in chronological order. Each has a prompt shown to the writer:\n\n` +
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
    })

    const rawParts = parseCitationsResponse(response.content)
    console.log(`Claude returned ${rawParts.length} parts across ${entries.length} entries`)

    const partsWithTempId = rawParts.map((p, i) => ({
      ...p,
      tempId: `p${i}`,
    }))

    const tempIdToCanonical = deduplicateParts(
      partsWithTempId.map(p => ({
        tempId: p.tempId,
        name: p.name,
        role: p.role,
        description: p.description ?? '',
      }))
    )

    const seenNormalizedNames = new Set<string>()
    const deduplicatedParts = partsWithTempId.filter(p => {
      if (tempIdToCanonical.get(p.tempId) !== p.tempId) {
        console.log(`Skipping "${p.name}" — merged via similarity`)
        return false
      }
      const normalized = normalizeName(p.name)
      if (seenNormalizedNames.has(normalized)) {
        console.log(`Skipping duplicate normalized name: ${p.name} → ${normalized}`)
        return false
      }
      seenNormalizedNames.add(normalized)
      return true
    })

    const finalParts = deduplicatedParts.slice(0, 9)
    if (deduplicatedParts.length > 9) {
      console.log(`Trimmed ${deduplicatedParts.length} parts down to 9`)
    }

    const createdParts = await prisma.$transaction(async (tx) => {
      await tx.highlight.deleteMany({
        where: { partAnalysis: { entry: { userId } } },
      })
      await tx.partAnalysis.deleteMany({
        where: { entry: { userId } },
      })
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

      const unmapped = entries.filter(e => !processedEntryIds.has(e.id))
      if (unmapped.length > 0) {
        console.log(`${unmapped.length} entries had no part citations`)
      }

      return partsMap
    }, {
      timeout: 120000,
    })

    const verifyParts = await prisma.part.findMany({
      where: { userId },
      include: { partAnalyses: { include: { highlights: true } } },
    })

    console.log(`Batch reanalysis complete: Created ${createdParts.size} parts for ${entries.length} entries`)
    verifyParts.forEach(p => {
      const highlightCount = p.partAnalyses.reduce((sum, a) => sum + a.highlights.length, 0)
      console.log(`  - ${p.name}: ${p.partAnalyses.length} analyses, ${highlightCount} highlights`)
    })

    return NextResponse.json({
      success: true,
      message: `Reanalysis complete: ${createdParts.size} parts identified`,
      entriesAnalyzed: entries.length,
      partsCreated: createdParts.size,
    })
  } catch (error) {
    console.error('Reanalyze error:', error)
    return NextResponse.json({ error: 'Failed to reanalyze entries' }, { status: 500 })
  }
}
