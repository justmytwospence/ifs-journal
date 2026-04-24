import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Opus for extraction (part analysis) and part conversations — the quality-
// sensitive surfaces. Sonnet for high-volume, low-stakes content generation.
export const ANALYSIS_MODEL = 'claude-opus-4-7'
export const CONVERSATION_MODEL = 'claude-opus-4-7'
export const CONTENT_MODEL = 'claude-sonnet-4-6'
