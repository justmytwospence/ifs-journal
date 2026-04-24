import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NextResponse } from 'next/server'
import { anthropic, CONTENT_MODEL } from '@/lib/anthropic'
import { auth } from '@/lib/auth'
import { captureException } from '@/lib/logger'
import { loadPriorEntriesContext } from '@/lib/prior-entries-context'
import { enforceRateLimit, HOUR_MS } from '@/lib/rate-limit'

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await enforceRateLimit({
      subjectKey: `user:${session.user.id}`,
      bucket: 'prompts:generate',
      limit: 60,
      windowMs: HOUR_MS,
    })
    if (limited) return limited

    const context = await loadPriorEntriesContext(session.user.id, {
      verbatimCount: 3,
      summaryCount: 7,
      maxTotalEntries: 30,
    })

    const templatePath = join(process.cwd(), 'lib/prompts/journal-prompt-generation.md')
    const template = await readFile(templatePath, 'utf-8')

    const systemPrompt = template.replace('{{RECENT_ENTRIES}}', context.text)

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
    captureException(error, { route: 'POST /api/prompts/generate' })
    return NextResponse.json(
      {
        error: 'Failed to generate prompt',
        fallback: "What's something that's sitting with you today?",
      },
      { status: 500 }
    )
  }
}
