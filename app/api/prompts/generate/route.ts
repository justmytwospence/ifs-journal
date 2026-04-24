import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NextResponse } from 'next/server'
import { anthropic, CONTENT_MODEL } from '@/lib/anthropic'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const templatePath = join(process.cwd(), 'lib/prompts/journal-prompt-generation.md')
    const template = await readFile(templatePath, 'utf-8')

    const recentEntriesText =
      recentEntries.length > 0
        ? recentEntries
            .map((e, i) => {
              const date = new Date(e.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
              return `Entry ${i + 1} (${date}):\nPrompt: "${e.prompt}"\nResponse: ${e.content}\n`
            })
            .join('\n---\n\n')
        : "No previous entries. This is the user's first journal entry."

    const systemPrompt = template.replace('{{RECENT_ENTRIES}}', recentEntriesText)

    const response = await anthropic.messages.create({
      model: CONTENT_MODEL,
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Generate a journal prompt for me.' }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    let prompt =
      textBlock?.type === 'text' ? textBlock.text.trim() : 'What are you feeling right now?'

    if (
      (prompt.startsWith('"') && prompt.endsWith('"')) ||
      (prompt.startsWith("'") && prompt.endsWith("'"))
    ) {
      prompt = prompt.slice(1, -1)
    }

    return NextResponse.json({ prompt })
  } catch (error) {
    console.error('Generate prompt error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate prompt',
        fallback: 'What emotions are you experiencing right now?',
      },
      { status: 500 }
    )
  }
}
