import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { openai } from '@/lib/openai'
import prisma from '@/lib/db'
import { readFile } from 'fs/promises'
import { join } from 'path'

const PART_COLORS = {
  Protector: '#ef4444',
  Manager: '#f59e0b',
  Firefighter: '#f97316',
  Exile: '#8b5cf6',
}

// Calculate Levenshtein distance for string similarity
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

// Calculate name similarity (0-1 score)
function calculateNameSimilarity(name1: string, name2: string): number {
  // Normalize: lowercase, remove articles, and common suffixes
  const normalize = (name: string) =>
    name.toLowerCase()
      .replace(/^(the|a|an)\s+/, '')
      .replace(/\s+(part|one|self)$/i, '')
      .trim()

  const n1 = normalize(name1)
  const n2 = normalize(name2)

  // Exact match after normalization
  if (n1 === n2) return 1.0

  // Check if one name contains the other (high similarity)
  if (n1.includes(n2) || n2.includes(n1)) {
    const shorter = Math.min(n1.length, n2.length)
    const longer = Math.max(n1.length, n2.length)
    return shorter / longer
  }

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(n1, n2)
  const maxLength = Math.max(n1.length, n2.length)

  // Convert distance to similarity score (0-1)
  return 1 - distance / maxLength
}

// Calculate keyword overlap score (0-1)
function calculateKeywordOverlap(desc1: string, desc2: string): number {
  const keywords = [
    'critic',
    'judge',
    'perfectionist',
    'worrier',
    'anxious',
    'fear',
    'avoider',
    'procrastinator',
    'escape',
    'hurt',
    'abandoned',
    'lonely',
    'angry',
    'protector',
    'guardian',
    'shield',
    'control',
    'plan',
    'prevent',
    'distract',
    'numb',
    'shame',
    'vulnerable',
    'compassion',
    'observer',
    'witness',
    'watcher',
    'kind',
    'gentle',
    'caring',
    'understanding',
  ]

  const d1Lower = desc1.toLowerCase()
  const d2Lower = desc2.toLowerCase()

  let sharedCount = 0
  let totalCount = 0

  for (const keyword of keywords) {
    const in1 = d1Lower.includes(keyword)
    const in2 = d2Lower.includes(keyword)

    if (in1 || in2) totalCount++
    if (in1 && in2) sharedCount++
  }

  return totalCount > 0 ? sharedCount / totalCount : 0
}

// Helper function to check if a new part is too similar to existing parts
// Returns the ID of the most similar existing part if similarity > 75%, otherwise null
function findSimilarPart(
  newPartData: { name: string; role: string; description: string },
  existingParts: Array<{
    id: string
    name: string
    role: string
    description: string
  }>
): string | null {
  let bestMatch: { id: string; score: number } | null = null

  for (const existing of existingParts) {
    // Calculate similarity scores
    const nameScore = calculateNameSimilarity(newPartData.name, existing.name)
    const roleMatch = newPartData.role === existing.role ? 1.0 : 0.0
    const keywordScore = calculateKeywordOverlap(
      newPartData.description,
      existing.description
    )

    // Weighted overall similarity: name (50%), role (25%), keywords (25%)
    const overallScore = nameScore * 0.5 + roleMatch * 0.25 + keywordScore * 0.25

    // Track best match (lowered threshold to 65% to catch more duplicates)
    if (overallScore > 0.65 && (!bestMatch || overallScore > bestMatch.score)) {
      bestMatch = {
        id: existing.id,
        score: overallScore,
      }
    }
  }

  return bestMatch?.id || null
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
      temperature: 0.7,
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
        // Update existing part with new quotes (avoid duplicates)
        const existingPart = existingParts.find(p => p.id === matchedPartId)
        const newQuotes = partData.quotes.filter(
          (q: string) => !existingPart?.quotes.includes(q)
        )

        if (newQuotes.length > 0) {
          part = await prisma.part.update({
            where: { id: matchedPartId },
            data: {
              quotes: {
                push: newQuotes,
              },
            },
          })
        } else {
          part = existingPart
        }
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

        // Create new part
        part = await prisma.part.create({
          data: {
            userId: session.user.id,
            name: partData.name,
            description: partData.description,
            role: partData.role,
            color: PART_COLORS[partData.role as keyof typeof PART_COLORS] || '#6366f1',
            quotes: partData.quotes,
          },
          include: { partAnalyses: true },
        })

        existingParts.push(part)
      }

      // Create part analysis linking entry to part
      if (part) {
        await prisma.partAnalysis.create({
          data: {
            entryId: entry.id,
            partId: part.id,
            highlights: partData.quotes,
            reasoning: partData.reasoning || {},
            confidence: partData.confidence,
          },
        })
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
