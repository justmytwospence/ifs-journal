import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { openai } from '@/lib/openai'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { demoGuard } from '@/lib/demo-guard'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prevent demo users from creating conversations
    const demoCheck = await demoGuard()
    if (demoCheck) return demoCheck

    const { partId, message, conversationHistory } = await request.json()

    if (!partId || !message) {
      return NextResponse.json({ error: 'Part ID and message are required' }, { status: 400 })
    }

    // Fetch the part with its analyses and related journal entries
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

    // Load the conversation prompt template
    const promptPath = join(process.cwd(), 'lib', 'prompts', 'part-conversation.md')
    let promptTemplate = await readFile(promptPath, 'utf-8')

    // Prepare part quotes
    const allQuotes = part.partAnalyses.flatMap(analysis => analysis.highlights)
    const uniqueQuotes = [...new Set(allQuotes)].slice(0, 10) // Limit to 10 most relevant
    const quotesText = uniqueQuotes.map((quote, i) => `${i + 1}. "${quote}"`).join('\n')

    // Prepare journal entries context
    const journalEntriesText = part.partAnalyses
      .slice(0, 5) // Limit to 5 most recent entries
      .map((analysis, i) => {
        const entry = analysis.entry
        const date = new Date(entry.createdAt).toLocaleDateString()
        return `### Entry ${i + 1} (${date})
**Prompt:** ${entry.prompt}
**Content:** ${entry.content.substring(0, 500)}${entry.content.length > 500 ? '...' : ''}
**Highlighted expressions:** ${analysis.highlights.join('; ')}`
      })
      .join('\n\n')

    // Replace template variables
    promptTemplate = promptTemplate
      .replace('{{partName}}', part.name)
      .replace('{{partRole}}', part.role)
      .replace('{{partDescription}}', part.description || 'No description available')
      .replace('{{partQuotes}}', quotesText || 'No quotes available yet')
      .replace('{{journalEntries}}', journalEntriesText || 'No journal entries available yet')

    // Build conversation messages
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: promptTemplate,
      },
    ]

    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: { role: string; content: string }) => {
        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.content })
        } else if (msg.role === 'part') {
          messages.push({ role: 'assistant', content: msg.content })
        }
      })
    }

    // Add the new user message
    messages.push({
      role: 'user',
      content: message,
    })

    // Call OpenAI API with streaming
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.8,
      max_tokens: 200,
      stream: true,
    })

    // Create a readable stream for the response
    const encoder = new TextEncoder()
    let fullResponse = ''

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              fullResponse += content
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
            }
          }

          // Save the conversation to the database after streaming completes
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
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Conversation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
