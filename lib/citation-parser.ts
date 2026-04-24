/**
 * Parse Claude's parts-analysis response into ParsedPart[].
 *
 * Why XML-tagged text rather than tool_use: the Anthropic Citations API
 * attaches citations to TEXT content blocks, not to tool_use input fields.
 * Part extraction needs BOTH guaranteed part metadata AND automatic passage
 * anchoring; the XML-inside-text pattern keeps citations naturally aligned
 * to each <instance> body without a separate bridging mechanism.
 *
 * Robustness is enforced by __tests__/citation-parser.test.ts — edit that
 * suite when extending the accepted schema.
 */

import type Anthropic from '@anthropic-ai/sdk'

export interface ParsedCitation {
  citedText: string
  startOffset: number
  endOffset: number
  documentIndex: number
}

export interface ParsedInstance {
  reasoning: string | null
  citations: ParsedCitation[]
}

export interface ParsedPart {
  name: string
  role: string
  icon: string | null
  description: string | null
  confidence: number
  instances: ParsedInstance[]
}

type TextBlock = Extract<Anthropic.ContentBlock, { type: 'text' }>
type Citation = NonNullable<TextBlock['citations']>[number]

interface Span {
  flatStart: number
  flatEnd: number
  citations: ParsedCitation[]
}

function toParsedCitation(c: Citation): ParsedCitation | null {
  if (c.type !== 'char_location') return null
  return {
    citedText: c.cited_text,
    startOffset: c.start_char_index,
    endOffset: c.end_char_index,
    documentIndex: c.document_index,
  }
}

function flatten(content: Anthropic.ContentBlock[]): { flat: string; spans: Span[] } {
  let flat = ''
  const spans: Span[] = []
  for (const block of content) {
    if (block.type !== 'text') continue
    const flatStart = flat.length
    flat += block.text
    const flatEnd = flat.length
    const citations = (block.citations ?? [])
      .map(toParsedCitation)
      .filter((c): c is ParsedCitation => c !== null)
    spans.push({ flatStart, flatEnd, citations })
  }
  return { flat, spans }
}

function parseAttributes(openTag: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const m of openTag.matchAll(/(\w+)\s*=\s*"([^"]*)"/g)) {
    attrs[m[1]] = m[2]
  }
  return attrs
}

function collectCitationsInRange(spans: Span[], start: number, end: number): ParsedCitation[] {
  const seen = new Set<string>()
  const out: ParsedCitation[] = []
  for (const span of spans) {
    if (span.flatEnd <= start || span.flatStart >= end) continue
    for (const c of span.citations) {
      const key = `${c.documentIndex}:${c.startOffset}:${c.endOffset}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(c)
    }
  }
  return out
}

export function parseCitationsResponse(content: Anthropic.ContentBlock[]): ParsedPart[] {
  const { flat, spans } = flatten(content)
  const parts: ParsedPart[] = []

  for (const partMatch of flat.matchAll(/<part\b([^>]*)>([\s\S]*?)<\/part>/g)) {
    const attrs = parseAttributes(partMatch[1])
    const partIndex = partMatch.index
    const innerStart = partIndex + partMatch[0].indexOf('>') + 1
    const inner = partMatch[2]

    const name = attrs.name?.trim()
    const role = attrs.role?.trim()
    if (!name || !role) continue

    const confidenceRaw = Number(attrs.confidence)
    const confidence = Number.isFinite(confidenceRaw)
      ? Math.max(0, Math.min(1, confidenceRaw))
      : 0.8

    const descMatch = /<description>([\s\S]*?)<\/description>/.exec(inner)
    const description = descMatch ? descMatch[1].trim() : null

    const instances: ParsedInstance[] = []
    for (const instMatch of inner.matchAll(/<instance\b([^>]*)>([\s\S]*?)<\/instance>/g)) {
      const instAttrs = parseAttributes(instMatch[1])
      const instFlatStart = innerStart + instMatch.index + instMatch[0].indexOf('>') + 1
      const instFlatEnd = innerStart + instMatch.index + instMatch[0].length - '</instance>'.length
      const citations = collectCitationsInRange(spans, instFlatStart, instFlatEnd)
      if (citations.length === 0) continue
      instances.push({
        reasoning: instAttrs.reasoning?.trim() || null,
        citations,
      })
    }

    if (instances.length === 0) continue

    parts.push({
      name,
      role,
      icon: attrs.icon?.trim() || null,
      description,
      confidence,
      instances,
    })
  }

  return parts
}
