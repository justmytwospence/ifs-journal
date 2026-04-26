import type { Snapshot, SnapshotEntry, SnapshotHighlight } from './capture'

export interface PromptForbiddenCounts {
  yesNoOpeners: number
  genericOpeners: number
  minimizingClosers: number
  bannedVocabulary: number
}

export interface PromptDiversity {
  uniqueOpeningVerbs: number
  totalPrompts: number
  avgProperNounCount: number
}

export interface PartsScore {
  extracted: number
  entriesTotal: number
  entriesWithAttribution: number
  /** 0..1, fraction of highlights whose `exact` substring appears verbatim
   *  in the matching entry's content. 1.0 = no broken citations. */
  citationValidity: number
  curatedCount: number
}

export interface ScorecardSection {
  personaSlug: string
  ranAt: string
  complete: boolean
  entryCount: number
  medianWordCount: number
  forbidden: PromptForbiddenCounts
  diversity: PromptDiversity
  parts: PartsScore
}

// Patterns mirror lib/prompts/journal-prompt-generation.md "Forbidden prompt
// shapes" + "Banned vocabulary" + "Forbidden closers" sections. Heuristic —
// false positives are tolerable, false negatives matter more.

const YES_NO_OPENER =
  /^(did|have|has|are|is|was|were|do|does|will|would|could|should|can|may|might|am)\b/i

// Generic openers from the template's forbidden list. These are matched
// against the WHOLE prompt because they're meant to feel like a small-talk
// recap question.
const GENERIC_OPENER_PATTERNS: RegExp[] = [
  /^what did you do (today|this evening|this morning|this afternoon|tonight|yesterday)\??\s*$/i,
  /^how was your (day|week|weekend|morning|evening)\??\s*$/i,
  /^what'?s on your mind\??\s*$/i,
  /^how are you\??\s*$/i,
  /^how are you doing\??\s*$/i,
]

const MINIMIZING_CLOSER_PATTERNS: RegExp[] = [
  /\bin just one sentence\b/i,
  /\bin a sentence or two\b/i,
  /\bin (a few|three|two|one) words?\b/i,
  /\bin one sentence\b/i,
  /\bjust the first (sentence|thing|line|word)\b/i,
  /\bthe first thing you'?d say\b/i,
  /\bjust (a|the) (first|one) /i,
  /\bjust briefly\b/i,
  /\bbriefly[.,!?]?\s*$/i,
]

const BANNED_VOCAB = [
  'protector',
  'firefighter',
  'manager part',
  'exile part',
  'inner critic',
  'inner child',
  'self-energy',
  'self energy',
  'parts work',
  'hold space',
  'integrate',
  'process this',
  'reflect on patterns',
]

/**
 * Heuristic: extract the first verb-ish token. Strips a leading question word
 * (what / how / when / where / why / who) and returns the next word, lowercased.
 * Used only for diversity counting — not exact linguistics.
 */
function openingVerb(prompt: string): string {
  const cleaned = prompt
    .trim()
    .replace(/^[*_>"'`]+/, '')
    .toLowerCase()
  const tokens = cleaned.split(/\s+/)
  if (tokens.length === 0) return ''
  const skip = new Set(['what', 'how', 'when', 'where', 'why', 'who', 'which'])
  for (const tok of tokens) {
    const word = tok.replace(/[^a-z']/g, '')
    if (!word) continue
    if (skip.has(word)) continue
    return word
  }
  return tokens[0]
}

/**
 * Counts proper-noun-ish tokens — capitalized words that aren't at the start
 * of a sentence. Naive, but good enough for "how often does the prompt name
 * a specific person/place".
 */
function properNounCount(prompt: string): number {
  // Drop the first word of each sentence (not capitalized = proper noun).
  // Sentences split on . ! ? followed by whitespace.
  const sentences = prompt.split(/(?<=[.!?])\s+/)
  let count = 0
  for (const s of sentences) {
    const tokens = s.trim().split(/\s+/)
    for (let i = 1; i < tokens.length; i++) {
      const t = tokens[i].replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '')
      if (t.length >= 2 && /^[A-Z][a-z]/.test(t)) count++
    }
  }
  return count
}

function median(numbers: number[]): number {
  if (numbers.length === 0) return 0
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function citationsValid(highlights: SnapshotHighlight[], entries: SnapshotEntry[]): number {
  if (highlights.length === 0) return 1
  const contentByDaysAgo = new Map<number, string>(entries.map((e) => [e.daysAgo, e.content]))
  let valid = 0
  for (const h of highlights) {
    const content = contentByDaysAgo.get(h.entryDaysAgo)
    if (content?.includes(h.exact)) valid++
  }
  return valid / highlights.length
}

export function scoreSnapshot(snapshot: Snapshot): ScorecardSection {
  const prompts = snapshot.entries.map((e) => e.prompt)
  const wordCounts = snapshot.entries.map((e) => e.wordCount)

  const yesNoOpeners = prompts.filter((p) => YES_NO_OPENER.test(p.trim())).length
  const genericOpeners = prompts.filter((p) =>
    GENERIC_OPENER_PATTERNS.some((re) => re.test(p.trim()))
  ).length
  const minimizingClosers = prompts.filter((p) =>
    MINIMIZING_CLOSER_PATTERNS.some((re) => re.test(p))
  ).length
  const bannedVocabulary = prompts.filter((p) => {
    const lower = p.toLowerCase()
    return BANNED_VOCAB.some((word) => lower.includes(word))
  }).length

  const verbs = new Set(prompts.map((p) => openingVerb(p)).filter(Boolean))
  const properTotal = prompts.reduce((sum, p) => sum + properNounCount(p), 0)

  const entriesWithAttribution = new Set(snapshot.partAnalyses.map((pa) => pa.entryDaysAgo)).size

  return {
    personaSlug: snapshot.personaSlug,
    ranAt: snapshot.ranAt,
    complete: snapshot.complete,
    entryCount: snapshot.entries.length,
    medianWordCount: Math.round(median(wordCounts)),
    forbidden: {
      yesNoOpeners,
      genericOpeners,
      minimizingClosers,
      bannedVocabulary,
    },
    diversity: {
      uniqueOpeningVerbs: verbs.size,
      totalPrompts: prompts.length,
      avgProperNounCount: prompts.length === 0 ? 0 : properTotal / prompts.length,
    },
    parts: {
      extracted: snapshot.parts.length,
      entriesTotal: snapshot.entries.length,
      entriesWithAttribution,
      citationValidity: citationsValid(snapshot.highlights, snapshot.entries),
      curatedCount: Object.keys(snapshot.curatedFields).length,
    },
  }
}

export function formatScorecard(s: ScorecardSection): string {
  const ok = (n: number) => (n === 0 ? '✓' : '✗')
  const pct = (x: number) => `${(x * 100).toFixed(0)}%`
  return [
    `${s.personaSlug}/${s.ranAt}${s.complete ? '' : '  [INCOMPLETE]'}`,
    `  Entries:           ${s.entryCount}`,
    `  Median word count: ${s.medianWordCount}`,
    `  Forbidden prompt patterns:`,
    `    yes/no openers:    ${s.forbidden.yesNoOpeners}  ${ok(s.forbidden.yesNoOpeners)}`,
    `    generic openers:   ${s.forbidden.genericOpeners}  ${ok(s.forbidden.genericOpeners)}`,
    `    minimizing closers:${s.forbidden.minimizingClosers}  ${ok(s.forbidden.minimizingClosers)}`,
    `    banned vocabulary: ${s.forbidden.bannedVocabulary}  ${ok(s.forbidden.bannedVocabulary)}`,
    `  Prompt diversity:`,
    `    unique opening verbs: ${s.diversity.uniqueOpeningVerbs} / ${s.diversity.totalPrompts}`,
    `    proper-noun count avg: ${s.diversity.avgProperNounCount.toFixed(2)} per prompt`,
    `  Parts:`,
    `    extracted: ${s.parts.extracted}`,
    `    coverage (entries with ≥1 attribution): ${s.parts.entriesWithAttribution} / ${s.parts.entriesTotal}`,
    `    citation validity (highlight.exact present in entry content): ${pct(s.parts.citationValidity)}`,
    `    curated parts: ${s.parts.curatedCount}`,
  ].join('\n')
}
