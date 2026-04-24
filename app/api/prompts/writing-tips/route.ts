import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { openai } from '@/lib/openai'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prompt, content } = await request.json()

    if (!content || content.trim().length < 50) {
      return NextResponse.json(
        { error: 'Content too short for tips' },
        { status: 400 }
      )
    }

    // Load the writing tips prompt template
    const promptPath = join(process.cwd(), 'lib', 'prompts', 'writing-tips.md')
    const promptTemplate = await readFile(promptPath, 'utf-8')

    // Replace template variables
    const systemPrompt = promptTemplate
      .replace('{{PROMPT}}', prompt)
      .replace('{{CONTENT}}', content)

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    })

    const tip = completion.choices[0]?.message?.content?.trim()

    if (!tip) {
      throw new Error('No tip generated')
    }

    return NextResponse.json({ tip })
  } catch (error) {
    console.error('Writing tips generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate writing tip' },
      { status: 500 }
    )
  }
}
