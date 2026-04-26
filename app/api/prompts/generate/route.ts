import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type NextRequest, NextResponse } from 'next/server'
import { anthropic, CONTENT_MODEL } from '@/lib/anthropic'
import { auth } from '@/lib/auth'
import { captureException } from '@/lib/logger'
import { loadPriorEntriesContext } from '@/lib/prior-entries-context'
import { enforceRateLimit, HOUR_MS } from '@/lib/rate-limit'

// Capped at 5 because the template only needs enough rejections to spot a
// theme. Longer history bloats the system prompt without helping.
const MAX_REJECTED_PROMPTS = 5
const MAX_REJECTED_PROMPT_CHARS = 500

function renderRejected(rejected: string[] | undefined): string {
  if (!rejected || rejected.length === 0) {
    return '(none — this is a fresh prompt request, no recent rejections to avoid.)'
  }
  return rejected
    .slice(0, MAX_REJECTED_PROMPTS)
    .map((p) => `- "${p.slice(0, MAX_REJECTED_PROMPT_CHARS).replace(/"/g, '\\"')}"`)
    .join('\n')
}

export async function POST(request: NextRequest) {
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

    // Body is optional; legacy callers send no body. New callers may include
    // `{ rejectedPrompts: string[] }` to signal "I just refreshed past these,
    // give me something materially different."
    let rejectedPrompts: string[] = []
    try {
      const body = await request.json()
      if (Array.isArray(body?.rejectedPrompts)) {
        rejectedPrompts = body.rejectedPrompts.filter(
          (p: unknown): p is string => typeof p === 'string' && p.trim().length > 0
        )
      }
    } catch {
      // No body or invalid JSON — treat as no rejections.
    }

    const context = await loadPriorEntriesContext(session.user.id, {
      verbatimCount: 3,
      summaryCount: 7,
      maxTotalEntries: 30,
    })

    const templatePath = join(process.cwd(), 'lib/prompts/journal-prompt-generation.md')
    const template = await readFile(templatePath, 'utf-8')

    const systemPrompt = template
      .replace('{{RECENT_ENTRIES}}', context.text)
      .replace('{{REJECTED_PROMPTS}}', renderRejected(rejectedPrompts))

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
