/**
 * Text anchoring utilities based on W3C Web Annotation Data Model
 * Adapted from Hypothesis client (https://github.com/hypothesis/client)
 * 
 * Provides:
 * - computeSelector: Create TextPositionSelector + TextQuoteSelector from quote text
 * - matchQuote: Fuzzy re-anchor a quote when content has changed
 */

import approxSearch from 'approx-string-match'
import type { Match as StringMatch } from 'approx-string-match'

/** Context length for prefix/suffix (W3C convention) */
const CONTEXT_LENGTH = 32

export interface TextSelector {
  /** Start character offset in the text */
  startOffset: number
  /** End character offset in the text */
  endOffset: number
  /** The exact quoted text */
  exact: string
  /** Up to 32 characters before the quote for disambiguation */
  prefix: string
  /** Up to 32 characters after the quote for disambiguation */
  suffix: string
}

export interface QuoteMatch {
  /** Start offset of the match */
  start: number
  /** End offset of the match */
  end: number
  /** Match quality score between 0 and 1 */
  score: number
}

/**
 * Find the best approximate matches for `str` in `text` allowing up to `maxErrors` errors.
 */
function search(text: string, str: string, maxErrors: number): StringMatch[] {
  // Fast path: exact matches
  let matchPos = 0
  const exactMatches: StringMatch[] = []
  while (matchPos !== -1) {
    matchPos = text.indexOf(str, matchPos)
    if (matchPos !== -1) {
      exactMatches.push({
        start: matchPos,
        end: matchPos + str.length,
        errors: 0,
      })
      matchPos += 1
    }
  }
  if (exactMatches.length > 0) {
    return exactMatches
  }

  // Slow path: approximate matches
  return approxSearch(text, str, maxErrors)
}

/**
 * Compute similarity score between two strings (0 to 1).
 */
function textMatchScore(text: string, str: string): number {
  if (str.length === 0 || text.length === 0) {
    return 0.0
  }
  const matches = search(text, str, str.length)
  return 1 - matches[0].errors / str.length
}

export interface MatchContext {
  /** Expected text before the quote */
  prefix?: string
  /** Expected text after the quote */
  suffix?: string
  /** Expected offset of match in text (used as tie-breaker) */
  hint?: number
}

/**
 * Find the best approximate match for a quote in text.
 * 
 * Uses the approx-string-match algorithm with weighted scoring based on:
 * - Quote similarity (50%)
 * - Prefix context match (20%)
 * - Suffix context match (20%)
 * - Position hint proximity (10%)
 * 
 * @param text - The full document text to search in
 * @param quote - The quote text to find
 * @param context - Optional prefix, suffix, and position hint
 * @returns Match with start/end offsets and quality score, or null if no acceptable match
 */
export function matchQuote(
  text: string,
  quote: string,
  context: MatchContext = {}
): QuoteMatch | null {
  if (quote.length === 0) {
    return null
  }

  // Maximum errors to allow (up to half the quote length, capped at 256)
  const maxErrors = Math.min(256, Math.floor(quote.length / 2))
  const matches = search(text, quote, maxErrors)

  if (matches.length === 0) {
    return null
  }

  const scoreMatch = (match: StringMatch): number => {
    const quoteWeight = 50
    const prefixWeight = 20
    const suffixWeight = 20
    const posWeight = 10

    const quoteScore = 1 - match.errors / quote.length

    const prefixScore = context.prefix
      ? textMatchScore(
          text.slice(Math.max(0, match.start - context.prefix.length), match.start),
          context.prefix
        )
      : 1.0

    const suffixScore = context.suffix
      ? textMatchScore(
          text.slice(match.end, match.end + context.suffix.length),
          context.suffix
        )
      : 1.0

    let posScore = 1.0
    if (typeof context.hint === 'number') {
      const offset = Math.abs(match.start - context.hint)
      posScore = 1.0 - offset / text.length
    }

    const rawScore =
      quoteWeight * quoteScore +
      prefixWeight * prefixScore +
      suffixWeight * suffixScore +
      posWeight * posScore

    const maxScore = quoteWeight + prefixWeight + suffixWeight + posWeight
    return rawScore / maxScore
  }

  // Score and rank matches
  const scoredMatches = matches.map((m) => ({
    start: m.start,
    end: m.end,
    score: scoreMatch(m),
  }))

  scoredMatches.sort((a, b) => b.score - a.score)

  // Reject matches below quality threshold
  const bestMatch = scoredMatches[0]
  if (bestMatch.score < 0.5) {
    return null
  }

  return bestMatch
}

/**
 * Compute a complete text selector (position + quote) for a quote in text.
 * 
 * This creates both a TextPositionSelector (offsets) and TextQuoteSelector
 * (exact text + prefix/suffix context) following W3C Web Annotation Data Model.
 * 
 * @param text - The full document text
 * @param quote - The exact quote text to find
 * @param startHint - Optional hint for where the quote should be (for disambiguation)
 * @returns TextSelector with all fields, or null if quote not found
 */
export function computeSelector(
  text: string,
  quote: string,
  startHint?: number
): TextSelector | null {
  // Find the quote position
  let start: number

  if (typeof startHint === 'number') {
    // Verify the hint is correct
    const foundText = text.slice(startHint, startHint + quote.length)
    if (foundText === quote) {
      start = startHint
    } else {
      // Fall back to searching
      start = text.indexOf(quote)
    }
  } else {
    start = text.indexOf(quote)
  }

  if (start === -1) {
    // Try fuzzy match as last resort
    const match = matchQuote(text, quote)
    if (!match || match.score < 0.95) {
      return null
    }
    start = match.start
  }

  const end = start + quote.length

  // Extract context (prefix and suffix)
  const prefix = text.slice(Math.max(0, start - CONTEXT_LENGTH), start)
  const suffix = text.slice(end, Math.min(text.length, end + CONTEXT_LENGTH))

  return {
    startOffset: start,
    endOffset: end,
    exact: text.slice(start, end),
    prefix,
    suffix,
  }
}

/**
 * Re-anchor a stale highlight using fuzzy matching.
 * 
 * When content has changed and stored offsets are invalid, this function
 * attempts to find the original quote using the TextQuoteSelector fields.
 * 
 * @param text - The current document text
 * @param selector - The stored selector with exact, prefix, suffix
 * @returns Updated offsets, or null if re-anchoring failed
 */
export function reanchorHighlight(
  text: string,
  selector: { exact: string; prefix: string; suffix: string; startOffset: number }
): { startOffset: number; endOffset: number } | null {
  const match = matchQuote(text, selector.exact, {
    prefix: selector.prefix,
    suffix: selector.suffix,
    hint: selector.startOffset,
  })

  if (!match) {
    return null
  }

  return {
    startOffset: match.start,
    endOffset: match.end,
  }
}
