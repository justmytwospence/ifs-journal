import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { anthropic, CONTENT_MODEL } from '@/lib/anthropic'
import { auth } from '@/lib/auth'
import { captureException } from '@/lib/logger'
import { loadPriorEntriesContext } from '@/lib/prior-entries-context'
import { enforceRateLimit, HOUR_MS } from '@/lib/rate-limit'

const writingTipsSchema = z.object({
  prompt: z.string().max(500),
  content: z.string().min(50).max(20_000),
  recentTips: z.array(z.string().max(500)).max(5).optional().default([]),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await enforceRateLimit({
      subjectKey: `user:${session.user.id}`,
      bucket: 'prompts:writing-tips',
      limit: 60,
      windowMs: HOUR_MS,
    })
    if (limited) return limited

    let prompt: string
    let content: string
    let recentTips: string[]
    try {
      const parsed = writingTipsSchema.parse(await request.json())
      prompt = parsed.prompt
      content = parsed.content
      recentTips = parsed.recentTips
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
      }
      throw err
    }

    // Lighter fidelity than prompt generation — tips are triggered on every
    // 3-second idle during typing, so we keep the context small.
    const priorContext = await loadPriorEntriesContext(session.user.id, {
      verbatimCount: 2,
      summaryCount: 3,
      maxTotalEntries: 15,
      verbatimCharLimit: 600,
    })

    const recentTipsText =
      recentTips.length > 0
        ? recentTips
            .map((t, i) => `${i === recentTips.length - 1 ? '(most recent) ' : ''}"${t}"`)
            .join('\n')
        : '(no tips shown yet this draft)'

    const promptPath = join(process.cwd(), 'lib', 'prompts', 'writing-tips.md')
    const promptTemplate = await readFile(promptPath, 'utf-8')

    const systemPrompt = promptTemplate
      .replace('{{PROMPT}}', prompt)
      .replace('{{CONTENT}}', content)
      .replace('{{RECENT_TIPS}}', recentTipsText)
      .replace('{{PRIOR_CONTEXT}}', priorContext.text)

    const response = await anthropic.messages.create({
      model: CONTENT_MODEL,
      max_tokens: 150,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Generate the writing tip.' }],
    })

    const tipBlock = response.content.find((b) => b.type === 'text')
    const tip = tipBlock?.type === 'text' ? tipBlock.text.trim() : ''

    if (!tip) {
      throw new Error('No tip generated')
    }

    return NextResponse.json({ tip })
  } catch (error) {
    captureException(error, { route: 'POST /api/prompts/writing-tips' })
    return NextResponse.json({ error: 'Failed to generate writing tip' }, { status: 500 })
  }
}
