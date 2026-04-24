import type Anthropic from '@anthropic-ai/sdk'
import { describe, expect, it } from 'vitest'
import { parseCitationsResponse } from '@/lib/citation-parser'

type ContentBlock = Anthropic.ContentBlock
type Citation = NonNullable<Extract<ContentBlock, { type: 'text' }>['citations']>[number]

// Helper: construct a text block. Citations are char_location type unless overridden.
const text = (t: string, citations: Citation[] = []): ContentBlock =>
  ({ type: 'text', text: t, citations: citations.length ? citations : null }) as ContentBlock

// Helper: build a char_location citation. Fields marked ! are the ones the parser reads.
const cite = (opts: {
  cited_text: string
  start: number
  end: number
  document_index?: number
}): Citation =>
  ({
    type: 'char_location',
    cited_text: opts.cited_text,
    start_char_index: opts.start,
    end_char_index: opts.end,
    document_index: opts.document_index ?? 0,
    document_title: null,
    file_id: null,
  }) as unknown as Citation

describe('parseCitationsResponse', () => {
  it('parses a single part with a cited instance body', () => {
    // The XML tags sit in their own text block; the quoted passage sits in its
    // own text block so the citation attaches naturally to that block.
    const content: ContentBlock[] = [
      text(
        '<part name="The Critic" role="Manager" icon="⚖️" confidence="0.85">\n' +
          '<description>Tracks my mistakes.</description>\n' +
          '<instance reasoning="Self-judgment">'
      ),
      text('I keep cataloguing every error.', [
        cite({ cited_text: 'I keep cataloguing every error.', start: 42, end: 73 }),
      ]),
      text('</instance>\n</part>'),
    ]

    const parts = parseCitationsResponse(content)
    expect(parts).toHaveLength(1)
    expect(parts[0]).toMatchObject({
      name: 'The Critic',
      role: 'Manager',
      icon: '⚖️',
      description: 'Tracks my mistakes.',
      confidence: 0.85,
    })
    expect(parts[0].instances).toHaveLength(1)
    expect(parts[0].instances[0].reasoning).toBe('Self-judgment')
    expect(parts[0].instances[0].citations).toHaveLength(1)
    expect(parts[0].instances[0].citations[0]).toMatchObject({
      citedText: 'I keep cataloguing every error.',
      startOffset: 42,
      endOffset: 73,
      documentIndex: 0,
    })
  })

  it('parses multiple parts in a single response', () => {
    const content: ContentBlock[] = [
      text(
        '<part name="The Critic" role="Manager" icon="⚖️" confidence="0.9">\n' +
          '<instance reasoning="r1">'
      ),
      text('passage one', [cite({ cited_text: 'passage one', start: 0, end: 11 })]),
      text(
        '</instance></part>\n<part name="The Worrier" role="Manager" icon="🌀" confidence="0.7">\n' +
          '<instance reasoning="r2">'
      ),
      text('passage two', [cite({ cited_text: 'passage two', start: 20, end: 31 })]),
      text('</instance></part>'),
    ]

    const parts = parseCitationsResponse(content)
    expect(parts.map((p) => p.name)).toEqual(['The Critic', 'The Worrier'])
  })

  it('drops instances that have no citations', () => {
    // The prompt requires every instance to be grounded in a citation. An
    // un-cited instance is the model hallucinating a quote — drop it silently.
    const content: ContentBlock[] = [
      text(
        '<part name="The Critic" role="Manager" icon="⚖️" confidence="0.85">\n' +
          '<instance reasoning="no citation here">free-form prose with no quoted passage</instance>\n' +
          '</part>'
      ),
    ]
    const parts = parseCitationsResponse(content)
    expect(parts).toHaveLength(0)
  })

  it('drops a part with zero valid (cited) instances', () => {
    const content: ContentBlock[] = [
      text('<part name="The Empty" role="Manager" icon="X" confidence="0.5"></part>'),
    ]
    expect(parseCitationsResponse(content)).toHaveLength(0)
  })

  it('skips a part tag missing required attrs (name or role)', () => {
    const content: ContentBlock[] = [
      text('<part role="Manager" icon="?" confidence="0.5"><instance reasoning="x">'),
      text('quoted', [cite({ cited_text: 'quoted', start: 0, end: 6 })]),
      text('</instance></part>'),
    ]
    expect(parseCitationsResponse(content)).toHaveLength(0)
  })

  it('clamps confidence into [0, 1] and defaults to 0.8 when missing/invalid', () => {
    const content: ContentBlock[] = [
      text('<part name="A" role="Manager" icon="a" confidence="-5"><instance reasoning="x">'),
      text('aa', [cite({ cited_text: 'aa', start: 0, end: 2 })]),
      text(
        '</instance></part>\n<part name="B" role="Manager" icon="b" confidence="99"><instance reasoning="y">'
      ),
      text('bb', [cite({ cited_text: 'bb', start: 5, end: 7 })]),
      text(
        '</instance></part>\n<part name="C" role="Manager" icon="c" confidence="not-a-number"><instance reasoning="z">'
      ),
      text('cc', [cite({ cited_text: 'cc', start: 10, end: 12 })]),
      text('</instance></part>'),
    ]
    const parts = parseCitationsResponse(content)
    expect(parts.map((p) => ({ name: p.name, conf: p.confidence }))).toEqual([
      { name: 'A', conf: 0 },
      { name: 'B', conf: 1 },
      { name: 'C', conf: 0.8 },
    ])
  })

  it('deduplicates identical citations within a single instance', () => {
    // Same citation appearing twice (e.g. from two overlapping text spans)
    // should be reported once per instance.
    const dup = cite({ cited_text: 'same text', start: 10, end: 19 })
    const content: ContentBlock[] = [
      text('<part name="X" role="Manager" icon="x" confidence="0.8"><instance reasoning="r">'),
      text('same text', [dup]),
      text('same text', [dup]),
      text('</instance></part>'),
    ]
    const parts = parseCitationsResponse(content)
    expect(parts[0].instances[0].citations).toHaveLength(1)
  })

  it('ignores non-char_location citations', () => {
    const weird = {
      type: 'page_location',
      cited_text: 'should not appear',
      document_index: 0,
    } as unknown as Citation
    const content: ContentBlock[] = [
      text('<part name="X" role="Manager" icon="x" confidence="0.8"><instance reasoning="r">'),
      text('body', [weird]),
      text('</instance></part>'),
    ]
    const parts = parseCitationsResponse(content)
    // No valid citations → instance dropped → part dropped
    expect(parts).toHaveLength(0)
  })

  it('returns [] on an empty response', () => {
    expect(parseCitationsResponse([])).toEqual([])
  })

  it('ignores non-text blocks', () => {
    const toolUse: ContentBlock = {
      type: 'tool_use',
      id: 'tu_1',
      name: 'noop',
      input: {},
    } as unknown as ContentBlock
    const content: ContentBlock[] = [
      toolUse,
      text('<part name="X" role="Manager" icon="x" confidence="0.8"><instance reasoning="r">'),
      text('q', [cite({ cited_text: 'q', start: 0, end: 1 })]),
      text('</instance></part>'),
      toolUse,
    ]
    const parts = parseCitationsResponse(content)
    expect(parts).toHaveLength(1)
    expect(parts[0].name).toBe('X')
  })

  it('handles an instance whose body spans multiple text blocks', () => {
    // The <instance> body is split across three text blocks; the citation
    // attaches to the middle one. Parser must still associate the citation
    // with this instance, not a neighbor.
    const content: ContentBlock[] = [
      text('<part name="X" role="Manager" icon="x" confidence="0.9"><instance reasoning="multi">'),
      text('prose before the quote '),
      text('the exact quoted passage', [
        cite({ cited_text: 'the exact quoted passage', start: 0, end: 24 }),
      ]),
      text(' and prose after'),
      text('</instance></part>'),
    ]
    const parts = parseCitationsResponse(content)
    expect(parts).toHaveLength(1)
    expect(parts[0].instances[0].citations).toHaveLength(1)
    expect(parts[0].instances[0].citations[0].citedText).toBe('the exact quoted passage')
  })

  it('does not leak citations from one instance into another', () => {
    const content: ContentBlock[] = [
      text('<part name="X" role="Manager" icon="x" confidence="0.9"><instance reasoning="first">'),
      text('passage A', [cite({ cited_text: 'passage A', start: 0, end: 9 })]),
      text('</instance><instance reasoning="second">'),
      text('passage B', [cite({ cited_text: 'passage B', start: 20, end: 29 })]),
      text('</instance></part>'),
    ]
    const parts = parseCitationsResponse(content)
    expect(parts).toHaveLength(1)
    expect(parts[0].instances).toHaveLength(2)
    expect(parts[0].instances[0].citations[0].citedText).toBe('passage A')
    expect(parts[0].instances[1].citations[0].citedText).toBe('passage B')
  })
})
