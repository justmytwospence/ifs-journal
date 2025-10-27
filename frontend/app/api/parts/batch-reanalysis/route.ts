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

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all journal entries for this user
    const entries = await prisma.journalEntry.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
    })

    if (entries.length === 0) {
      return NextResponse.json({
        message: 'No journal entries to analyze',
        entriesAnalyzed: 0
      })
    }

    // Delete all existing parts for this user
    const deletedParts = await prisma.part.deleteMany({
      where: { userId: session.user.id },
    })
    console.log(`Deleted ${deletedParts.count} parts for user ${session.user.id}`)

    // Reset all entry statuses to processing
    await prisma.journalEntry.updateMany({
      where: { userId: session.user.id },
      data: { analysisStatus: 'processing' },
    })

    // Load prompt template for batch entries reanalysis
    const templatePath = join(process.cwd(), 'lib/prompts/batch-entries-reanalysis.md')
    const template = await readFile(templatePath, 'utf-8')

    // Build entries context for batch analysis
    const entriesContext = entries.map((entry, index) =>
      `Entry ${index + 1} (ID: ${entry.id}):\nPrompt: ${entry.prompt}\nContent: ${entry.content}\n`
    ).join('\n---\n\n')

    const systemPrompt = template
      .replace('{{ENTRIES_CONTEXT}}', entriesContext)
      .replace('{{ENTRY_COUNT}}', entries.length.toString())

    // Call OpenAI for batch analysis
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Analyze all these journal entries together and identify up to 9 distinct parts.' },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0]?.message?.content || '{"parts":[],"entryMappings":[]}')

    console.log(`AI returned ${result.parts?.length || 0} parts and ${result.entryMappings?.length || 0} entry mappings`)

    // Find which parts are actually used in entry mappings
    const usedPartIds = new Set<string>()
    for (const mapping of result.entryMappings) {
      for (const partRef of mapping.parts) {
        usedPartIds.add(partRef.tempId)
      }
    }

    // Filter to only parts that are used, then enforce max 10
    const usedParts = result.parts.filter((p: { tempId: string }) => usedPartIds.has(p.tempId))
    
    if (usedParts.length > 9) {
      console.log(`AI returned ${usedParts.length} used parts, limiting to 9`)
    }

    // Create only the parts that are actually mapped to entries (max 9)
    const createdParts = new Map<string, { id: string; name: string }>()

    for (const partData of usedParts.slice(0, 9)) {

      const part = await prisma.part.create({
        data: {
          userId: session.user.id,
          name: partData.name,
          description: partData.description,
          role: partData.role,
          color: PART_COLORS[partData.role as keyof typeof PART_COLORS] || '#6366f1',
          icon: partData.icon || '●',
          quotes: partData.quotes || [],
        },
      })

      createdParts.set(partData.tempId, part)
    }

    // Create part analyses for each entry
    const processedEntryIds = new Set<string>()

    for (const mapping of result.entryMappings) {
      const entry = entries.find(e => e.id === mapping.entryId)
      if (!entry) continue

      processedEntryIds.add(entry.id)

      for (const partRef of mapping.parts) {
        const part = createdParts.get(partRef.tempId)
        if (!part) {
          console.log(`Warning: Part with tempId ${partRef.tempId} not found in createdParts`)
          continue
        }

        const analysis = await prisma.partAnalysis.create({
          data: {
            entryId: entry.id,
            partId: part.id,
            highlights: partRef.highlights || [],
            reasoning: partRef.reasoning || {},
            confidence: partRef.confidence || 0.8,
          },
        })
        console.log(`Created analysis ${analysis.id} for part ${part.name} in entry ${entry.id}`)
      }

      // Update entry status to completed
      await prisma.journalEntry.update({
        where: { id: entry.id },
        data: { analysisStatus: 'completed' },
      })
    }

    // Update any entries that weren't mapped to completed status as well
    const unmappedEntries = entries.filter(e => !processedEntryIds.has(e.id))
    if (unmappedEntries.length > 0) {
      await prisma.journalEntry.updateMany({
        where: {
          id: { in: unmappedEntries.map(e => e.id) }
        },
        data: { analysisStatus: 'completed' },
      })
      console.log(`Updated ${unmappedEntries.length} unmapped entries to completed status`)
    }

    // Verify parts were created with analyses
    const verifyParts = await prisma.part.findMany({
      where: { userId: session.user.id },
      include: {
        partAnalyses: true,
      },
    })

    console.log(`Batch reanalysis complete: Created ${createdParts.size} parts for ${entries.length} entries`)
    console.log(`Verification: Found ${verifyParts.length} parts in database`)
    verifyParts.forEach(p => {
      console.log(`  - ${p.name}: ${p.partAnalyses.length} analyses`)
    })

    return NextResponse.json({
      success: true,
      message: `Reanalysis complete: ${createdParts.size} parts identified`,
      entriesAnalyzed: entries.length,
      partsCreated: createdParts.size
    })
  } catch (error) {
    console.error('Reanalyze error:', error)
    return NextResponse.json({ error: 'Failed to reanalyze entries' }, { status: 500 })
  }
}
