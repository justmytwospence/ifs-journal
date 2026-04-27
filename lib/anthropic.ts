import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Opus across all surfaces — prompt quality is load-bearing for the
// product (a weak prompt never recovers in the entry that follows), so
// the cost / quality tradeoff has tipped in favor of using the strongest
// model on the prompt-gen and writing-tips surfaces too.
export const ANALYSIS_MODEL = 'claude-opus-4-7'
export const CONVERSATION_MODEL = 'claude-opus-4-7'
export const CONTENT_MODEL = 'claude-opus-4-7'
