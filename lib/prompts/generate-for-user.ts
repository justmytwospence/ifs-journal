import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { anthropic, CONTENT_MODEL } from '@/lib/anthropic'
import { loadPriorEntriesContext } from '@/lib/prior-entries-context'

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

export interface GeneratePromptForUserOptions {
  userId: string
  rejectedPrompts?: string[]
}

/**
 * Production prompt generation: loads the user's prior-entries context,
 * renders the journal-prompt-generation template, and asks the content
 * model for a single prompt. Used by the /api/prompts/generate route AND
 * by the persona eval harness so both surfaces exercise the same code.
 */
export async function generatePromptForUser({
  userId,
  rejectedPrompts = [],
}: GeneratePromptForUserOptions): Promise<string> {
  const context = await loadPriorEntriesContext(userId, {
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

  return prompt
}
