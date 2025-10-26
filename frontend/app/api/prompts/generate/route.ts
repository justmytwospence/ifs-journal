import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { openai } from '@/lib/openai'
import prisma from '@/lib/db'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get recent entries for context
    const recentEntries = await prisma.journalEntry.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { prompt: true, content: true },
    })

    // Load prompt template
    const templatePath = join(process.cwd(), 'lib/prompts/journal-prompt-generation.md')
    const template = await readFile(templatePath, 'utf-8')

    // Build context
    const context = recentEntries.length > 0
      ? `Recent journal entries:\n${recentEntries.map((e, i) => `${i + 1}. Prompt: ${e.prompt}\nContent: ${e.content.substring(0, 200)}...`).join('\n\n')}`
      : 'This is the user\'s first journal entry.'

    const systemPrompt = template.replace('{{CONTEXT}}', context)

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate a journal prompt for me.' },
      ],
      temperature: 0.8,
      max_tokens: 150,
    })

    const prompt = completion.choices[0]?.message?.content?.trim() || 'What are you feeling right now?'

    return NextResponse.json({ prompt })
  } catch (error) {
    console.error('Generate prompt error:', error)
    return NextResponse.json(
      { error: 'Failed to generate prompt', fallback: 'What emotions are you experiencing right now?' },
      { status: 500 }
    )
  }
}
