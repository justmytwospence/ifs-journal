import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { anthropic, CONVERSATION_MODEL } from '@/lib/anthropic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { captureException } from '@/lib/logger'
import { enforceLlmBudget, enforceRateLimit, HOUR_MS } from '@/lib/rate-limit'

const conversationMessageSchema = z.object({
  role: z.enum(['user', 'part']),
  content: z.string().max(4_000),
})

const conversationBodySchema = z.object({
  partId: z.string().min(1).max(64),
  message: z.string().min(1).max(4_000),
  conversationHistory: z.array(conversationMessageSchema).max(50).optional().default([]),
})

type ConversationMessage = z.infer<typeof conversationMessageSchema>

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Demo users can chat — conversation is the signature UX — but their
    // responses aren't persisted (see partConversation.create below).
    const isDemo = session.user.isDemo === true

    const limited = await enforceRateLimit({
      subjectKey: `user:${session.user.id}`,
      bucket: 'conversations',
      limit: 30,
      windowMs: HOUR_MS,
    })
    if (limited) return limited

    const overBudget = await enforceLlmBudget(session.user.id)
    if (overBudget) return overBudget

    let partId: string
    let message: string
    let conversationHistory: ConversationMessage[]
    try {
      const parsed = conversationBodySchema.parse(await request.json())
      partId = parsed.partId
      message = parsed.message
      conversationHistory = parsed.conversationHistory
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
      }
      throw err
    }

    const part = await prisma.part.findFirst({
      where: {
        id: partId,
        userId: session.user.id,
      },
      include: {
        partAnalyses: {
          include: {
            entry: {
              select: {
                id: true,
                content: true,
                prompt: true,
                createdAt: true,
              },
            },
            highlights: {
              select: {
                exact: true,
                reasoning: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!part) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    }

    const promptPath = join(process.cwd(), 'lib', 'prompts', 'part-conversation.md')
    let promptTemplate = await readFile(promptPath, 'utf-8')

    const allQuotes = part.partAnalyses.flatMap((analysis) =>
      analysis.highlights.map((h) => h.exact)
    )
    const uniqueQuotes = [...new Set(allQuotes)].slice(0, 10)
    const quotesText = uniqueQuotes.map((quote, i) => `${i + 1}. "${quote}"`).join('\n')

    const journalEntriesText = part.partAnalyses
      .slice(0, 5)
      .map((analysis, i) => {
        const entry = analysis.entry
        const date = new Date(entry.createdAt).toLocaleDateString()
        const highlightTexts = analysis.highlights.map((h) => h.exact)
        return `### Entry ${i + 1} (${date})
**Prompt:** ${entry.prompt}
**Content:** ${entry.content.substring(0, 500)}${entry.content.length > 500 ? '...' : ''}
**Highlighted expressions:** ${highlightTexts.join('; ') || 'None'}`
      })
      .join('\n\n')

    // If the user has chosen a custom name for this part, speak as that name.
    // Other user-curated fields (ageImpression, positiveIntent, fearedOutcome,
    // whatItProtects, userNotes) are things the user has learned — we surface
    // them so the part's voice is grounded in those observations rather than
    // re-inferring from scratch each message.
    const displayName = part.customName?.trim() || part.name
    const userLearned: string[] = []
    if (part.ageImpression) userLearned.push(`- I feel about **${part.ageImpression}** old.`)
    if (part.positiveIntent) userLearned.push(`- What I'm trying to do: ${part.positiveIntent}`)
    if (part.fearedOutcome)
      userLearned.push(`- What I'm afraid would happen if I stopped: ${part.fearedOutcome}`)
    if (part.whatItProtects) userLearned.push(`- What I'm protecting: ${part.whatItProtects}`)
    if (part.userNotes) userLearned.push(`- Notes the user has recorded: ${part.userNotes}`)
    const userLearnedBlock =
      userLearned.length > 0
        ? userLearned.join('\n')
        : '(The user has not yet recorded anything specific about me. Speak from the quotes and entries below.)'

    promptTemplate = promptTemplate
      .replace('{{partName}}', displayName)
      .replace('{{partRole}}', part.role)
      .replace('{{partDescription}}', part.description || 'No description available')
      .replace('{{userLearnedBlock}}', userLearnedBlock)
      .replace('{{partQuotes}}', quotesText || 'No quotes available yet')
      .replace('{{journalEntries}}', journalEntriesText || 'No journal entries available yet')

    // The system prompt is large (template + quotes + recent entries) and
    // stable for the duration of a conversation — cache it so follow-up
    // messages in the same session hit the cache.
    const systemBlocks = [
      {
        type: 'text' as const,
        text: promptTemplate,
        cache_control: { type: 'ephemeral' as const },
      },
    ]

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

    for (const msg of conversationHistory) {
      if (msg.role === 'user') {
        messages.push({ role: 'user', content: msg.content })
      } else if (msg.role === 'part') {
        messages.push({ role: 'assistant', content: msg.content })
      }
    }

    messages.push({ role: 'user', content: message })

    // Pass the request signal through so closing the tab / hitting Stop
    // aborts the upstream Anthropic call instead of burning tokens on a
    // stream the client is no longer listening to.
    const stream = anthropic.messages.stream(
      {
        model: CONVERSATION_MODEL,
        max_tokens: 1024,
        system: systemBlocks,
        messages,
      },
      { signal: request.signal }
    )

    const encoder = new TextEncoder()
    let fullResponse = ''

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          stream.on('text', (delta) => {
            fullResponse += delta
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`))
          })

          await stream.finalMessage()

          if (!isDemo) {
            await prisma.partConversation.create({
              data: {
                partId: part.id,
                userId: session.user.id,
                userMessage: message,
                partResponse: fullResponse || 'I need a moment to think about that.',
              },
            })
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          captureException(error, { route: 'POST /api/conversations', phase: 'stream' })
          controller.error(error)
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    captureException(error, { route: 'POST /api/conversations' })
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 })
  }
}
