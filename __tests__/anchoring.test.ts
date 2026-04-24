import { describe, expect, it } from 'vitest'
import { computeContentHash, hasContentChanged } from '@/lib/anchoring/content-hash'
import { computeSelector, matchQuote, reanchorHighlight } from '@/lib/anchoring/match-quote'

describe('content-hash', () => {
  it('returns identical hashes for identical content', () => {
    const a = computeContentHash('The quick brown fox.')
    const b = computeContentHash('The quick brown fox.')
    expect(a).toBe(b)
  })

  it('returns different hashes for edits', () => {
    const a = computeContentHash('The quick brown fox.')
    const b = computeContentHash('The quick brown fox!')
    expect(a).not.toBe(b)
  })

  it('detects changes via helper', () => {
    const original = 'I noticed a tightness in my chest.'
    const hash = computeContentHash(original)
    expect(hasContentChanged(original, hash)).toBe(false)
    expect(hasContentChanged(`${original} And a shiver.`, hash)).toBe(true)
  })
})

describe('computeSelector', () => {
  const text =
    'I noticed a tightness in my chest when my boss gave me feedback today. ' +
    'It felt like shame washing over me.'

  it('finds an exact quote and returns its selector', () => {
    const sel = computeSelector(text, 'shame washing over me')
    expect(sel).not.toBeNull()
    expect(sel?.startOffset).toBe(text.indexOf('shame washing over me'))
    expect(sel?.exact).toBe('shame washing over me')
    expect(sel?.prefix.length).toBeLessThanOrEqual(32)
    expect(sel?.suffix.length).toBeLessThanOrEqual(32)
  })

  it('returns null when the quote is absent and too dissimilar to fuzzy-match', () => {
    const sel = computeSelector(text, 'entirely unrelated vocabulary zzzzzz')
    expect(sel).toBeNull()
  })
})

describe('matchQuote', () => {
  const text =
    'The Worrier scans every interaction for what might go wrong, ' +
    'rehearsing worst-case scenarios before they can happen.'

  it('finds an exact quote with a perfect score', () => {
    const match = matchQuote(text, 'rehearsing worst-case scenarios')
    expect(match).not.toBeNull()
    expect(match?.score).toBe(1)
    expect(text.slice(match?.start, match?.end)).toBe('rehearsing worst-case scenarios')
  })

  it('finds a quote after a small edit (fuzzy)', () => {
    // "worst-case" → "worst case" (hyphen removed)
    const match = matchQuote(text, 'rehearsing worst case scenarios')
    expect(match).not.toBeNull()
    expect(match?.score).toBeGreaterThan(0.8)
  })

  it('rejects when the quote has diverged too far from the text', () => {
    const match = matchQuote(text, 'the dog ran through the meadow at dawn')
    expect(match).toBeNull()
  })

  it('uses prefix/suffix as tie-breakers between identical candidate substrings', () => {
    const textTwo =
      'I felt stuck. I felt stuck for hours, replaying the same thought. I felt stuck.'
    // Same 12-char quote appears three times. Prefix pins the middle one.
    const match = matchQuote(textTwo, 'I felt stuck', {
      prefix: 'ck. ',
      suffix: ' for hours',
    })
    expect(match).not.toBeNull()
    // The correct one starts after the first ". "
    expect(match?.start).toBe(textTwo.indexOf('I felt stuck for hours'))
  })
})

describe('reanchorHighlight', () => {
  it('re-anchors a highlight after the surrounding text is edited', () => {
    const originalText =
      'Paragraph one about calm mornings. ' +
      'A tightness in my chest when my boss gave feedback. ' +
      'Paragraph three about the evening.'
    const quoteStart = originalText.indexOf('A tightness in my chest')
    const selector = {
      startOffset: quoteStart,
      endOffset: quoteStart + 'A tightness in my chest'.length,
      exact: 'A tightness in my chest',
      prefix: originalText.slice(Math.max(0, quoteStart - 32), quoteStart),
      suffix: originalText.slice(
        quoteStart + 'A tightness in my chest'.length,
        quoteStart + 'A tightness in my chest'.length + 32
      ),
    }

    // Edit: insert a whole paragraph before the quote. Old offsets are now wrong.
    const editedText =
      'A whole new paragraph that was added on retrospective review. ' + originalText

    const reanchored = reanchorHighlight(editedText, selector)
    expect(reanchored).not.toBeNull()
    expect(editedText.slice(reanchored?.startOffset, reanchored?.endOffset)).toBe(
      'A tightness in my chest'
    )
    expect(reanchored?.startOffset).not.toBe(selector.startOffset)
  })

  it('returns null when the quote text is no longer present and has no near-match', () => {
    const reanchored = reanchorHighlight('Totally unrelated paragraph about weather.', {
      exact: 'A tightness in my chest',
      prefix: 'paragraph one ',
      suffix: ' when my boss',
      startOffset: 50,
    })
    expect(reanchored).toBeNull()
  })
})
