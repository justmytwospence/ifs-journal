import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type NextRequest, NextResponse } from 'next/server'
import { anthropic, CONTENT_MODEL } from '@/lib/anthropic'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prompt, content } = await request.json()

    if (!content || content.trim().length < 50) {
      return NextResponse.json({ error: 'Content too short for tips' }, { status: 400 })
    }

    const promptPath = join(process.cwd(), 'lib', 'prompts', 'writing-tips.md')
    const promptTemplate = await readFile(promptPath, 'utf-8')

    const systemPrompt = promptTemplate
      .replace('{{PROMPT}}', prompt)
      .replace('{{CONTENT}}', content)

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
    console.error('Writing tips generation error:', error)
    return NextResponse.json({ error: 'Failed to generate writing tip' }, { status: 500 })
  }
}
