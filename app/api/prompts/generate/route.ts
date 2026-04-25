import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NextResponse } from 'next/server'
import { anthropic, PROMPT_MODEL } from '@/lib/anthropic'
import { auth } from '@/lib/auth'
import { captureException } from '@/lib/logger'
import { loadPriorEntriesContext } from '@/lib/prior-entries-context'
import { enforceRateLimit, HOUR_MS } from '@/lib/rate-limit'

// Used for first-time users with no entries. We deliberately do NOT call the
// model here: with empty context the template's "reach back to past entries"
// examples nudge the model to hallucinate fake personal details (e.g. an
// invented sister), and the user's first prompt is too load-bearing to risk.
const FIRST_TIME_PROMPTS = [
  "What's been sitting with you the last few days? Walk me through it.",
  'Take me through your week — what stands out, good or bad?',
  "Describe a moment from the last few days that's still bouncing around in your head.",
  "What's something on your mind right now that you haven't said out loud to anyone yet?",
  'Tell me about a conversation from this week that you keep replaying.',
  "What's been taking up the most space in your head lately? Walk me through where it shows up.",
  'Describe a recent moment where you surprised yourself — for better or worse — and tell me what was going through your head.',
]

function pickFirstTimePrompt(): string {
  return FIRST_TIME_PROMPTS[Math.floor(Math.random() * FIRST_TIME_PROMPTS.length)]
}

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

    if (!context.hasAny) {
      return NextResponse.json({ prompt: pickFirstTimePrompt() })
    }

    const templatePath = join(process.cwd(), 'lib/prompts/journal-prompt-generation.md')
    const template = await readFile(templatePath, 'utf-8')

    const systemPrompt = template.replace('{{RECENT_ENTRIES}}', context.text)

    const response = await anthropic.messages.create({
      model: PROMPT_MODEL,
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
