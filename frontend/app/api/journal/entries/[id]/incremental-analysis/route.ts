import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { openai } from '@/lib/openai'
import prisma from '@/lib/db'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { computeSelector } from '@/lib/anchoring'
import { slugify } from '@/lib/slug-utils'
import { findSimilarPart } from '@/lib/part-similarity'

const PART_COLORS = {
  Protector: '#ef4444',
  Manager: '#f59e0b',
  Firefighter: '#f97316',
  Exile: '#8b5cf6',
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: entryId } = await params

    // Get the journal entry
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId, userId: session.user.id },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Update status to processing
    await prisma.journalEntry.update({
      where: { id: entryId },
      data: { analysisStatus: 'processing' },
    })

    // Get existing parts for this user
    const existingParts = await prisma.part.findMany({
      where: { userId: session.user.id },
      include: { partAnalyses: true },
    })

    // Load prompt template for incremental entry analysis
    const templatePath = join(process.cwd(), 'lib/prompts/incremental-entry-analysis.md')
    const template = await readFile(templatePath, 'utf-8')

    // Build existing parts context
    const partsContext = existingParts.length > 0
      ? existingParts.map(p => `- ${p.name} (${p.role}): ${p.description}`).join('\n')
      : 'No existing parts yet.'

    const systemPrompt = template
      .replace('{{EXISTING_PARTS}}', partsContext)
      .replace('{{PROMPT}}', entry.prompt)
      .replace('{{CONTENT}}', entry.content)

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Analyze this journal entry for parts.' },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0]?.message?.content || '{"parts":[]}')

    // Process each identified part
    for (const partData of result.parts) {
      let part

      // Check if AI matched an existing part
      let matchedPartId = partData.id && existingParts.find(p => p.id === partData.id) ? partData.id : null

      // If AI didn't match, do our own similarity check
      if (!matchedPartId) {
        matchedPartId = findSimilarPart(partData, existingParts)
        if (matchedPartId) {
          console.log(`Similarity check matched "${partData.name}" to existing part ID: ${matchedPartId}`)
        } else {
          console.log(`No similar part found for "${partData.name}", creating new part`)
        }
      }

      if (matchedPartId) {
        // Use existing part
        part = existingParts.find(p => p.id === matchedPartId)
      } else {
        // Check if we need to enforce 9-part maximum
        if (existingParts.length >= 9) {
          // Find the part with lowest confidence across all analyses
          const partsWithConfidence = await Promise.all(
            existingParts.map(async (p) => {
              const analyses = await prisma.partAnalysis.findMany({
                where: { partId: p.id },
                select: { confidence: true },
              })
              const avgConfidence = analyses.length > 0
                ? analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length
                : 0
              return { part: p, avgConfidence }
            })
          )

          const lowestConfidencePart = partsWithConfidence.reduce((min, curr) =>
            curr.avgConfidence < min.avgConfidence ? curr : min
          )

          // Delete the lowest confidence part and its analyses
          await prisma.highlight.deleteMany({
            where: { partAnalysis: { partId: lowestConfidencePart.part.id } },
          })
          await prisma.partAnalysis.deleteMany({
            where: { partId: lowestConfidencePart.part.id },
          })
          await prisma.part.delete({
            where: { id: lowestConfidencePart.part.id },
          })

          // Remove from existingParts array
          const index = existingParts.findIndex(p => p.id === lowestConfidencePart.part.id)
          if (index > -1) existingParts.splice(index, 1)
        }

        // Create new part using upsert to handle race conditions
        const partSlug = slugify(partData.name)
        part = await prisma.part.upsert({
          where: {
            userId_name: {
              userId: session.user.id,
              name: partData.name,
            },
          },
          update: {
            // If part was created by a concurrent request, no update needed
          },
          create: {
            userId: session.user.id,
            name: partData.name,
            slug: partSlug,
            description: partData.description,
            role: partData.role,
            color: PART_COLORS[partData.role as keyof typeof PART_COLORS] || '#6366f1',
          },
          include: { partAnalyses: true },
        })

        existingParts.push(part)
      }

      // Create or update PartAnalysis and Highlights
      if (part) {
        // Upsert PartAnalysis (one per entry+part combination)
        const partAnalysis = await prisma.partAnalysis.upsert({
          where: {
            entryId_partId: {
              entryId: entry.id,
              partId: part.id,
            },
          },
          update: {
            confidence: partData.confidence,
          },
          create: {
            entryId: entry.id,
            partId: part.id,
            confidence: partData.confidence,
          },
        })

        // Delete existing highlights for this analysis (if re-analyzing)
        await prisma.highlight.deleteMany({
          where: { partAnalysisId: partAnalysis.id },
        })

        // Create Highlight records with computed selectors
        const quotes: string[] = partData.quotes || []
        const reasoning: Record<string, string> = partData.reasoning || {}

        for (const quote of quotes) {
          const selector = computeSelector(entry.content, quote)
          
          if (selector) {
            await prisma.highlight.create({
              data: {
                entryId: entry.id,
                partAnalysisId: partAnalysis.id,
                startOffset: selector.startOffset,
                endOffset: selector.endOffset,
                exact: selector.exact,
                prefix: selector.prefix,
                suffix: selector.suffix,
                reasoning: reasoning[quote] || null,
                isStale: false,
              },
            })
          } else {
            console.warn(`Could not compute selector for quote: "${quote.substring(0, 50)}..."`)
          }
        }
      }
    }

    // Update entry status to completed
    await prisma.journalEntry.update({
      where: { id: entryId },
      data: { analysisStatus: 'completed' },
    })

    return NextResponse.json({ success: true, partsFound: result.parts.length })
  } catch (error) {
    console.error('Parts analysis error:', error)

    const { id: entryId } = await params

    // Update entry status to failed
    await prisma.journalEntry.update({
      where: { id: entryId },
      data: { analysisStatus: 'failed' },
    })

    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
