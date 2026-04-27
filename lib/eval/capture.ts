import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PrismaClient } from '@prisma/client'
import { captureGitContext, type GitContext } from './git-context'
import { type Persona, stripPersonaFrontmatter } from './persona-loader'

export interface SnapshotEntry {
  daysAgo: number
  prompt: string
  content: string
  wordCount: number
}

export interface SnapshotPart {
  name: string
  role: string
  color: string
  icon: string
  description: string
}

export interface SnapshotPartAnalysis {
  entryDaysAgo: number
  partName: string
  confidence: number
}

export interface SnapshotHighlight {
  entryDaysAgo: number
  partName: string
  exact: string
  prefix: string
  suffix: string
  startOffset: number
  endOffset: number
  reasoning: string | null
}

export interface SnapshotCuratedFields {
  customName?: string
  ageImpression?: string
  positiveIntent?: string
  fearedOutcome?: string
  whatItProtects?: string
  userNotes?: string
}

/** Parts/analyses/highlights as observed at one point in the run. */
export interface SnapshotPartsState {
  parts: SnapshotPart[]
  partAnalyses: SnapshotPartAnalysis[]
  highlights: SnapshotHighlight[]
}

export interface Snapshot {
  personaSlug: string
  /** Set true after batch analysis succeeds. Seed refuses to load when false. */
  complete: boolean
  ranAt: string
  git: GitContext
  /** SHA-256 of the persona body (frontmatter excluded). */
  personaBodyHash: string
  /** SHA-256 of lib/prompts/journal-prompt-generation.md verbatim. */
  promptTemplateHash: string
  /** "n/a" — the respondent has no separate template; persona body IS the prompt. */
  respondentTemplateHash: 'n/a'
  model: { promptGen: string; respondent: string; analysis: string }
  schedule: number[]
  entries: SnapshotEntry[]
  /** Top-level fields hold the BATCH-stage state — what the seed loader and
   *  the demo experience consume. Unchanged contract. */
  parts: SnapshotPart[]
  partAnalyses: SnapshotPartAnalysis[]
  highlights: SnapshotHighlight[]
  /** State after the per-entry incremental analyses ran, captured BEFORE
   *  batch reanalysis wiped it. Optional for backward compat with snapshots
   *  written before this field existed. */
  incremental?: SnapshotPartsState
  /** Keyed by part name. Only present for parts that were curated. */
  curatedFields: Record<string, SnapshotCuratedFields>
}

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

export interface CaptureSnapshotInput {
  prisma: PrismaClient
  userId: string
  persona: Persona
  scheduleDaysAgo: number[]
  startedAt: Date
  /** Map from JournalEntry.id → daysAgo, populated as run-persona saves entries.
   *  Snapshot uses daysAgo for cross-references rather than DB row IDs so the
   *  output survives being loaded into a different DB. */
  entryDaysAgoByEntryId: Map<string, number>
  /** Models used during the run, for lineage. */
  models: Snapshot['model']
  /** Parts state from the per-entry incremental analyses, captured before
   *  batch reanalysis wiped it. Caller is responsible for calling
   *  `readPartsState` at the right moment (after the entry loop, before
   *  `runBatchAnalysis`). Optional — omit for runs that don't exercise
   *  incremental analysis. */
  incremental?: SnapshotPartsState
}

/**
 * Read the current parts/partAnalyses/highlights for a user from Prisma
 * and shape them into snapshot-ready records. Used twice during an eval
 * run: once after incremental analyses (pre-batch), once after batch
 * (the final state). The daysAgo map is used to translate entry rowids
 * into stable cross-DB references.
 */
export async function readPartsState(
  prisma: PrismaClient,
  userId: string,
  entryDaysAgoByEntryId: Map<string, number>
): Promise<SnapshotPartsState> {
  const parts = await prisma.part.findMany({
    where: { userId },
    include: {
      partAnalyses: { include: { highlights: true } },
    },
    orderBy: { name: 'asc' },
  })

  const daysAgoFor = (entryId: string): number => {
    const v = entryDaysAgoByEntryId.get(entryId)
    if (v === undefined) {
      throw new Error(
        `readPartsState: no daysAgo recorded for entry ${entryId} — run-persona must populate the map`
      )
    }
    return v
  }

  const snapshotParts: SnapshotPart[] = parts.map((p) => ({
    name: p.name,
    role: p.role,
    color: p.color,
    icon: p.icon,
    description: p.description,
  }))

  const snapshotPartAnalyses: SnapshotPartAnalysis[] = parts.flatMap((p) =>
    p.partAnalyses.map((pa) => ({
      entryDaysAgo: daysAgoFor(pa.entryId),
      partName: p.name,
      confidence: pa.confidence,
    }))
  )

  const snapshotHighlights: SnapshotHighlight[] = parts.flatMap((p) =>
    p.partAnalyses.flatMap((pa) =>
      pa.highlights.map((h) => ({
        entryDaysAgo: daysAgoFor(pa.entryId),
        partName: p.name,
        exact: h.exact,
        prefix: h.prefix,
        suffix: h.suffix,
        startOffset: h.startOffset,
        endOffset: h.endOffset,
        reasoning: h.reasoning,
      }))
    )
  )

  return {
    parts: snapshotParts,
    partAnalyses: snapshotPartAnalyses,
    highlights: snapshotHighlights,
  }
}

export async function captureSnapshot({
  prisma,
  userId,
  persona,
  scheduleDaysAgo,
  startedAt,
  entryDaysAgoByEntryId,
  models,
  incremental,
}: CaptureSnapshotInput): Promise<Snapshot> {
  const entries = await prisma.journalEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })

  const daysAgoFor = (entryId: string): number => {
    const v = entryDaysAgoByEntryId.get(entryId)
    if (v === undefined) {
      throw new Error(
        `captureSnapshot: no daysAgo recorded for entry ${entryId} — run-persona must populate the map`
      )
    }
    return v
  }

  const snapshotEntries: SnapshotEntry[] = entries.map((e) => ({
    daysAgo: daysAgoFor(e.id),
    prompt: e.prompt,
    content: e.content,
    wordCount: e.wordCount,
  }))

  const batchState = await readPartsState(prisma, userId, entryDaysAgoByEntryId)

  // Curated fields are read from the post-batch state — they were applied
  // by `applyCuratedFields` after batch ran. Only populated for parts that
  // had at least one curated value set.
  const partsForCuration = await prisma.part.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  })
  const curatedFields: Record<string, SnapshotCuratedFields> = {}
  for (const p of partsForCuration) {
    if (
      p.customName ||
      p.ageImpression ||
      p.positiveIntent ||
      p.fearedOutcome ||
      p.whatItProtects ||
      p.userNotes
    ) {
      curatedFields[p.name] = {
        customName: p.customName ?? undefined,
        ageImpression: p.ageImpression ?? undefined,
        positiveIntent: p.positiveIntent ?? undefined,
        fearedOutcome: p.fearedOutcome ?? undefined,
        whatItProtects: p.whatItProtects ?? undefined,
        userNotes: p.userNotes ?? undefined,
      }
    }
  }

  const promptTemplate = await readFile('lib/prompts/journal-prompt-generation.md', 'utf-8')

  return {
    personaSlug: persona.slug,
    complete: false,
    ranAt: startedAt.toISOString(),
    git: captureGitContext(),
    personaBodyHash: sha256(stripPersonaFrontmatter(persona.raw)),
    promptTemplateHash: sha256(promptTemplate),
    respondentTemplateHash: 'n/a',
    model: models,
    schedule: scheduleDaysAgo,
    entries: snapshotEntries,
    parts: batchState.parts,
    partAnalyses: batchState.partAnalyses,
    highlights: batchState.highlights,
    incremental,
    curatedFields,
  }
}

export const SNAPSHOTS_ROOT = 'evals/snapshots'

/** Filename-safe version of an ISO timestamp (no `:` or `.`). */
export function snapshotFileName(isoTimestamp: string): string {
  return `${isoTimestamp.replace(/[:.]/g, '-')}.json`
}

export async function writeSnapshot(snapshot: Snapshot): Promise<string> {
  const dir = join(SNAPSHOTS_ROOT, snapshot.personaSlug)
  await mkdir(dir, { recursive: true })
  const path = join(dir, snapshotFileName(snapshot.ranAt))
  await writeFile(path, `${JSON.stringify(snapshot, null, 2)}\n`)
  return path
}
