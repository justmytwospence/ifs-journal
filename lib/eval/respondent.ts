import type Anthropic from '@anthropic-ai/sdk'
import type { Persona } from './persona-loader'

// The respondent uses the same model as the live content surfaces —
// CONTENT_MODEL in lib/anthropic.ts. Hardcoded here so eval code has no
// runtime dependency on app modules that may pull in DB / auth.
export const RESPONDENT_MODEL = 'claude-sonnet-4-6'

export interface PriorResponse {
  prompt: string
  content: string
}

/**
 * Renders the user-message that asks the respondent to write the next entry.
 * Two shapes — first entry has no prior history; subsequent entries include
 * the persona's own previous responses verbatim so it can stay continuous.
 *
 * Crucially the respondent only ever sees the persona's prior RESPONSES —
 * never the parts the app extracted, never the prompt-gen template, never
 * any internal app state. That's the property that makes this an
 * adversarial test.
 */
function userMessage(prompt: string, prior: PriorResponse[]): string {
  if (prior.length === 0) {
    return [
      'Here is the prompt your journaling app gave you today:',
      '',
      `> ${prompt}`,
      '',
      'Write a journal entry in response. Length: 700–1200 words. Just the entry, no preamble, no headings.',
    ].join('\n')
  }
  const rendered = prior
    .map((p, i) => `### Entry ${i + 1}\n\nPrompt: ${p.prompt}\n\n${p.content}\n`)
    .join('\n---\n\n')
  return [
    'You have written previous entries (most recent last):',
    '',
    rendered,
    "Today's prompt is:",
    '',
    `> ${prompt}`,
    '',
    'Write the next entry. Length: 700–1200 words. Just the entry, no preamble, no headings.',
  ].join('\n')
}

export interface RespondAsPersonaInput {
  client: Anthropic
  persona: Persona
  prompt: string
  prior: PriorResponse[]
  maxTokens?: number
}

export async function respondAsPersona({
  client,
  persona,
  prompt,
  prior,
  maxTokens = 4096,
}: RespondAsPersonaInput): Promise<string> {
  const response = await client.messages.create({
    model: RESPONDENT_MODEL,
    max_tokens: maxTokens,
    system: persona.body,
    messages: [{ role: 'user', content: userMessage(prompt, prior) }],
  })
  return response.content
    .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
}
