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

    // Get last 3 entries for context
    const recentEntries = await prisma.journalEntry.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { 
        prompt: true, 
        content: true,
        createdAt: true,
      },
    })

    // Load prompt template
    const templatePath = join(process.cwd(), 'lib/prompts/journal-prompt-generation.md')
    const template = await readFile(templatePath, 'utf-8')

    // Build context with full entries
    const recentEntriesText = recentEntries.length > 0
      ? recentEntries.map((e, i) => {
          const date = new Date(e.createdAt).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })
          return `Entry ${i + 1} (${date}):\nPrompt: "${e.prompt}"\nResponse: ${e.content}\n`
        }).join('\n---\n\n')
      : 'No previous entries. This is the user\'s first journal entry.'

    const systemPrompt = template.replace('{{RECENT_ENTRIES}}', recentEntriesText)

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

    let prompt = completion.choices[0]?.message?.content?.trim() || 'What are you feeling right now?'
    
    // Remove surrounding quotes if present
    if ((prompt.startsWith('"') && prompt.endsWith('"')) || 
        (prompt.startsWith("'") && prompt.endsWith("'"))) {
      prompt = prompt.slice(1, -1)
    }

    return NextResponse.json({ prompt })
  } catch (error) {
    console.error('Generate prompt error:', error)
    return NextResponse.json(
      { error: 'Failed to generate prompt', fallback: 'What emotions are you experiencing right now?' },
      { status: 500 }
    )
  }
}
