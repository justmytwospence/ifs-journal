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
  /** Largest count of prompts that share the same first 3 tokens. Catches the
   *  "What's something you…" monoculture even when individual openers vary. */
  maxRepeatedTrigramOpener: number
  /** The trigram that hit that count (for the report). */
  mostRepeatedTrigram: string
}

export interface PromptStats {
  minLength: number
  medianLength: number
  maxLength: number
}

export interface WordCountDistribution {
  min: number
  p25: number
  median: number
  p75: number
  max: number
}

export interface PartsPerEntryDistribution {
  /** Includes entries with 0 — that's the load-bearing observation. */
  min: number
  median: number
  max: number
  /** avg parts per entry across the whole corpus, including zeros. */
  avg: number
}

export interface RoleDistribution {
  Manager: number
  Protector: number
  Firefighter: number
  Exile: number
  /** True when the persona's parts cover all four IFS roles. */
  allRolesPresent: boolean
}

export interface PartsScore {
  extracted: number
  entriesTotal: number
  entriesWithAttribution: number
  /** 0..1, fraction of highlights whose `exact` substring appears verbatim
   *  in the matching entry's content. 1.0 = no broken citations. */
  citationValidity: number
  curatedCount: number
  partsPerEntry: PartsPerEntryDistribution
  roles: RoleDistribution
  /** highlights / wordCount, per entry. Distribution. Catches "we're citing
   *  one sentence per entry" vs "we're citing every paragraph". */
  highlightDensity: { min: number; median: number; max: number }
  /** Number of (entry, part-A, part-B) triples where part-A's highlight and
   *  part-B's highlight have overlapping character ranges in the same entry.
   *  Signals genuine internal-disagreement capture (same passage evidencing
   *  two parts). */
  citationOverlapCount: number
}

export interface ScorecardSection {
  personaSlug: string
  ranAt: string
  complete: boolean
  entryCount: number
  forbidden: PromptForbiddenCounts
  diversity: PromptDiversity
  promptStats: PromptStats
  wordCount: WordCountDistribution
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

const IFS_ROLES = ['Manager', 'Protector', 'Firefighter', 'Exile'] as const

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

/** Returns the first 3 lowercased word-tokens of the prompt as a single key. */
function openingTrigram(prompt: string): string {
  return prompt
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .slice(0, 3)
    .map((t) => t.replace(/[^\w']/g, ''))
    .filter(Boolean)
    .join(' ')
}

/**
 * Counts proper-noun-ish tokens — capitalized words that aren't at the start
 * of a sentence. Naive, but good enough for "how often does the prompt name
 * a specific person/place".
 */
function properNounCount(prompt: string): number {
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

function quantile(numbers: number[], q: number): number {
  if (numbers.length === 0) return 0
  const sorted = [...numbers].sort((a, b) => a - b)
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  return base + 1 < sorted.length
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base]
}

function median(numbers: number[]): number {
  return quantile(numbers, 0.5)
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

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

function citationOverlap(highlights: SnapshotHighlight[]): number {
  // Group highlights by entry, then count overlapping pairs across distinct parts.
  const byEntry = new Map<number, SnapshotHighlight[]>()
  for (const h of highlights) {
    const list = byEntry.get(h.entryDaysAgo) ?? []
    list.push(h)
    byEntry.set(h.entryDaysAgo, list)
  }
  let overlaps = 0
  for (const list of byEntry.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]
        const b = list[j]
        if (a.partName === b.partName) continue
        if (rangesOverlap(a.startOffset, a.endOffset, b.startOffset, b.endOffset)) {
          overlaps++
        }
      }
    }
  }
  return overlaps
}

export function scoreSnapshot(snapshot: Snapshot): ScorecardSection {
  const prompts = snapshot.entries.map((e) => e.prompt)
  const wordCounts = snapshot.entries.map((e) => e.wordCount)
  const promptLengths = prompts.map((p) => p.length)

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

  // Trigram concentration — catches monoculture even when first verbs vary.
  const trigramCounts = new Map<string, number>()
  for (const p of prompts) {
    const tg = openingTrigram(p)
    if (tg) trigramCounts.set(tg, (trigramCounts.get(tg) ?? 0) + 1)
  }
  let maxRepeatedTrigramOpener = 0
  let mostRepeatedTrigram = ''
  for (const [tg, count] of trigramCounts) {
    if (count > maxRepeatedTrigramOpener) {
      maxRepeatedTrigramOpener = count
      mostRepeatedTrigram = tg
    }
  }

  // Per-entry parts distribution. Includes zeros — that's the point.
  const attributionsByEntry = new Map<number, number>()
  for (const e of snapshot.entries) attributionsByEntry.set(e.daysAgo, 0)
  for (const pa of snapshot.partAnalyses) {
    attributionsByEntry.set(pa.entryDaysAgo, (attributionsByEntry.get(pa.entryDaysAgo) ?? 0) + 1)
  }
  const perEntryCounts = [...attributionsByEntry.values()]
  const entriesWithAttribution = perEntryCounts.filter((c) => c > 0).length

  // Role distribution.
  const roleCounts: Record<(typeof IFS_ROLES)[number], number> = {
    Manager: 0,
    Protector: 0,
    Firefighter: 0,
    Exile: 0,
  }
  for (const p of snapshot.parts) {
    if (p.role in roleCounts) {
      roleCounts[p.role as (typeof IFS_ROLES)[number]]++
    }
  }
  const allRolesPresent = IFS_ROLES.every((r) => roleCounts[r] > 0)

  // Highlight density per entry.
  const wordCountByDaysAgo = new Map<number, number>(
    snapshot.entries.map((e) => [e.daysAgo, e.wordCount])
  )
  const highlightsPerEntry = new Map<number, number>()
  for (const e of snapshot.entries) highlightsPerEntry.set(e.daysAgo, 0)
  for (const h of snapshot.highlights) {
    highlightsPerEntry.set(h.entryDaysAgo, (highlightsPerEntry.get(h.entryDaysAgo) ?? 0) + 1)
  }
  const densities: number[] = []
  for (const [daysAgo, count] of highlightsPerEntry) {
    const wc = wordCountByDaysAgo.get(daysAgo) ?? 0
    if (wc > 0) densities.push((count / wc) * 1000) // highlights per 1k words
  }

  return {
    personaSlug: snapshot.personaSlug,
    ranAt: snapshot.ranAt,
    complete: snapshot.complete,
    entryCount: snapshot.entries.length,
    forbidden: { yesNoOpeners, genericOpeners, minimizingClosers, bannedVocabulary },
    diversity: {
      uniqueOpeningVerbs: verbs.size,
      totalPrompts: prompts.length,
      avgProperNounCount: prompts.length === 0 ? 0 : properTotal / prompts.length,
      maxRepeatedTrigramOpener,
      mostRepeatedTrigram,
    },
    promptStats: {
      minLength: promptLengths.length === 0 ? 0 : Math.min(...promptLengths),
      medianLength: Math.round(median(promptLengths)),
      maxLength: promptLengths.length === 0 ? 0 : Math.max(...promptLengths),
    },
    wordCount: {
      min: wordCounts.length === 0 ? 0 : Math.min(...wordCounts),
      p25: Math.round(quantile(wordCounts, 0.25)),
      median: Math.round(median(wordCounts)),
      p75: Math.round(quantile(wordCounts, 0.75)),
      max: wordCounts.length === 0 ? 0 : Math.max(...wordCounts),
    },
    parts: {
      extracted: snapshot.parts.length,
      entriesTotal: snapshot.entries.length,
      entriesWithAttribution,
      citationValidity: citationsValid(snapshot.highlights, snapshot.entries),
      curatedCount: Object.keys(snapshot.curatedFields).length,
      partsPerEntry: {
        min: perEntryCounts.length === 0 ? 0 : Math.min(...perEntryCounts),
        median: Math.round(median(perEntryCounts)),
        max: perEntryCounts.length === 0 ? 0 : Math.max(...perEntryCounts),
        avg:
          perEntryCounts.length === 0
            ? 0
            : perEntryCounts.reduce((s, n) => s + n, 0) / perEntryCounts.length,
      },
      roles: { ...roleCounts, allRolesPresent },
      highlightDensity: {
        min: densities.length === 0 ? 0 : Math.min(...densities),
        median: Math.round(median(densities) * 100) / 100,
        max: densities.length === 0 ? 0 : Math.max(...densities),
      },
      citationOverlapCount: citationOverlap(snapshot.highlights),
    },
  }
}

export function formatScorecard(s: ScorecardSection): string {
  const ok = (n: number, threshold = 0) => (n <= threshold ? '✓' : '✗')
  const pct = (x: number) => `${(x * 100).toFixed(0)}%`
  const r = s.parts.roles
  // Coverage threshold: anything below 80% gets ✗.
  const coverageOk = s.parts.entriesWithAttribution / Math.max(s.parts.entriesTotal, 1) >= 0.8
  // Trigram concentration threshold: 5 of N (12.5% on a 40-entry corpus) is OK.
  const trigramOk = s.diversity.maxRepeatedTrigramOpener <= 5
  return [
    `${s.personaSlug}/${s.ranAt}${s.complete ? '' : '  [INCOMPLETE]'}`,
    `  Entries:                ${s.entryCount}`,
    `  Word count distribution: min=${s.wordCount.min}  p25=${s.wordCount.p25}  median=${s.wordCount.median}  p75=${s.wordCount.p75}  max=${s.wordCount.max}`,
    `  Prompt length:          min=${s.promptStats.minLength}  median=${s.promptStats.medianLength}  max=${s.promptStats.maxLength}`,
    `  Forbidden prompt patterns:`,
    `    yes/no openers:       ${s.forbidden.yesNoOpeners}  ${ok(s.forbidden.yesNoOpeners)}`,
    `    generic openers:      ${s.forbidden.genericOpeners}  ${ok(s.forbidden.genericOpeners)}`,
    `    minimizing closers:   ${s.forbidden.minimizingClosers}  ${ok(s.forbidden.minimizingClosers)}`,
    `    banned vocabulary:    ${s.forbidden.bannedVocabulary}  ${ok(s.forbidden.bannedVocabulary)}`,
    `  Prompt diversity:`,
    `    unique opening verbs:    ${s.diversity.uniqueOpeningVerbs} / ${s.diversity.totalPrompts}`,
    `    proper-noun count avg:   ${s.diversity.avgProperNounCount.toFixed(2)} per prompt`,
    `    max repeated 3-word opener: ${s.diversity.maxRepeatedTrigramOpener}${s.diversity.mostRepeatedTrigram ? ` ("${s.diversity.mostRepeatedTrigram}")` : ''}  ${trigramOk ? '✓' : '✗'}`,
    `  Parts:`,
    `    extracted:               ${s.parts.extracted}`,
    `    coverage (≥1 attribution): ${s.parts.entriesWithAttribution} / ${s.parts.entriesTotal}  ${coverageOk ? '✓' : '✗'}`,
    `    parts per entry:         min=${s.parts.partsPerEntry.min}  median=${s.parts.partsPerEntry.median}  max=${s.parts.partsPerEntry.max}  avg=${s.parts.partsPerEntry.avg.toFixed(2)}`,
    `    role coverage:           Manager=${r.Manager}  Protector=${r.Protector}  Firefighter=${r.Firefighter}  Exile=${r.Exile}  ${r.allRolesPresent ? '✓ all four' : '✗ missing role(s)'}`,
    `    highlight density (per 1k words): min=${s.parts.highlightDensity.min.toFixed(2)}  median=${s.parts.highlightDensity.median.toFixed(2)}  max=${s.parts.highlightDensity.max.toFixed(2)}`,
    `    citation overlap pairs:  ${s.parts.citationOverlapCount}`,
    `    citation validity:       ${pct(s.parts.citationValidity)}  ${ok(1 - s.parts.citationValidity, 0.001)}`,
    `    curated parts:           ${s.parts.curatedCount}`,
  ].join('\n')
}
