import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

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

// Anthropic returns 529 when the upstream model fleet is saturated and 429 on
// per-org rate limits. Both are transient — the user should retry, not see a
// generic "Analysis failed" toast.
export function anthropicErrorResponse(error: unknown, fallbackMessage: string): NextResponse {
  if (error instanceof Anthropic.APIError) {
    if (error.status === 529 || error.status === 503) {
      return NextResponse.json(
        {
          error: 'Claude is overloaded right now. Try again in a moment.',
          retryable: true,
        },
        { status: 503 }
      )
    }
    if (error.status === 429) {
      return NextResponse.json(
        {
          error: 'Too many requests to Claude — try again in a minute.',
          retryable: true,
        },
        { status: 429 }
      )
    }
  }
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}
