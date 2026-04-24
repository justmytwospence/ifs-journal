import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type NextRequest, NextResponse } from 'next/server'
import { anthropic, CONVERSATION_MODEL } from '@/lib/anthropic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { demoGuard } from '@/lib/demo-guard'

type ConversationMessage = { role: 'user' | 'part'; content: string }

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const demoCheck = await demoGuard()
    if (demoCheck) return demoCheck

    const { partId, message, conversationHistory } = await request.json()

    if (!partId || !message) {
      return NextResponse.json({ error: 'Part ID and message are required' }, { status: 400 })
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

    promptTemplate = promptTemplate
      .replace('{{partName}}', part.name)
      .replace('{{partRole}}', part.role)
      .replace('{{partDescription}}', part.description || 'No description available')
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

    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory as ConversationMessage[]) {
        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.content })
        } else if (msg.role === 'part') {
          messages.push({ role: 'assistant', content: msg.content })
        }
      }
    }

    messages.push({ role: 'user', content: message })

    const stream = anthropic.messages.stream({
      model: CONVERSATION_MODEL,
      max_tokens: 1024,
      system: systemBlocks,
      messages,
    })

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

          await prisma.partConversation.create({
            data: {
              partId: part.id,
              userId: session.user.id,
              userMessage: message,
              partResponse: fullResponse || 'I need a moment to think about that.',
            },
          })

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
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
    console.error('Conversation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate response',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
