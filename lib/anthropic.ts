import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Opus for extraction (part analysis), part conversations, and journal-prompt
// generation — quality-sensitive surfaces where one bad output is loud.
// Sonnet for high-volume, low-stakes content generation (writing tips fire
// every few seconds during typing — latency wins over fidelity).
export const ANALYSIS_MODEL = 'claude-opus-4-7'
export const CONVERSATION_MODEL = 'claude-opus-4-7'
export const PROMPT_MODEL = 'claude-opus-4-7'
export const CONTENT_MODEL = 'claude-sonnet-4-6'
