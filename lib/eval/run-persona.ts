import { randomBytes } from 'node:crypto'
import type Anthropic from '@anthropic-ai/sdk'
import type { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { runBatchAnalysis } from '@/lib/batch-analysis'
import { runIncrementalAnalysis } from '@/lib/incremental-analysis'
import { saveEntry } from '@/lib/journal/save-entry'
import { generatePromptForUser } from '@/lib/prompts/generate-for-user'
import { captureSnapshot, readPartsState, type Snapshot, writeSnapshot } from './capture'
import type { Persona } from './persona-loader'
import { type PriorResponse, RESPONDENT_MODEL, respondAsPersona } from './respondent'

// Hardcoded to mirror the live API surfaces — keep in sync with
// CONTENT_MODEL / ANALYSIS_MODEL in lib/anthropic.ts.
const PROMPT_GEN_MODEL = 'claude-opus-4-7'
const ANALYSIS_MODEL = 'claude-opus-4-7'

const wordCountOf = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

const daysAgoToDate = (days: number): Date => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

/**
 * Idempotent persona-user setup: looks up `demo-<slug>@ifsjournal.me`,
 * creates if missing, wipes any prior parts + entries so the run starts
 * clean. The bcrypt hash is over random bytes nothing else knows — the
 * demo provider in lib/auth.ts authenticates these accounts without a
 * password, so the column is just satisfying NOT NULL.
 */
async function ensurePersonaUser(prisma: PrismaClient, slug: string): Promise<string> {
  const email = `demo-${slug}@ifsjournal.me`
  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 14)
    user = await prisma.user.create({
      data: { email, passwordHash, emailVerified: true },
    })
  } else {
    // Wipe everything we're about to recreate. Delete parts first — that
    // cascades to PartAnalysis, Highlight, PartConversation, and
    // PartsOperation via the schema's onDelete: Cascade. Then delete
    // journal entries.
    await prisma.part.deleteMany({ where: { userId: user.id } })
    await prisma.journalEntry.deleteMany({ where: { userId: user.id } })
  }
  return user.id
}

/**
 * Apply curated user-fields to the top 3 parts (by highlight count). The
 * text comes from `persona.curatedByRole`, which was loaded from a sibling
 * `<slug>.curated.json` file the respondent never sees. Keyed by IFS role,
 * so we don't depend on whichever name the LLM happened to assign.
 *
 * If the persona has no curated.json, this is a no-op. If a top-3 part has
 * a role that isn't covered in the curated file, that part is skipped.
 */
async function applyCuratedFields(
  prisma: PrismaClient,
  userId: string,
  persona: Persona
): Promise<number> {
  if (!persona.curatedByRole) return 0

  const partsForCuration = await prisma.part.findMany({
    where: { userId },
    include: {
      partAnalyses: { include: { _count: { select: { highlights: true } } } },
    },
  })
  const ranked = partsForCuration
    .map((p) => ({
      id: p.id,
      role: p.role,
      highlights: p.partAnalyses.reduce((sum, pa) => sum + pa._count.highlights, 0),
    }))
    .sort((a, b) => b.highlights - a.highlights)
    .slice(0, 3)

  let curated = 0
  for (const p of ranked) {
    const roleKey = p.role.toLowerCase() as keyof NonNullable<Persona['curatedByRole']>
    const template = persona.curatedByRole[roleKey]
    if (!template) continue
    await prisma.part.update({ where: { id: p.id }, data: template })
    curated++
  }
  return curated
}

export interface RunPersonaInput {
  prisma: PrismaClient
  client: Anthropic
  persona: Persona
  schedule: number[]
  /**
   * Receives free-form lines about the run (prompts, responses, batch
   * progress). When personas run in parallel, each gets its own logger so
   * the output streams stay separable. Defaults to no-op.
   */
  log?: (line: string) => void
}

export interface RunPersonaResult {
  snapshotPath: string
  userId: string
  partsCreated: number
  entriesAnalyzed: number
  curated: number
}

/**
 * One end-to-end eval run for one persona:
 *   1. Wipe + recreate the persona's demo user.
 *   2. For each scheduled daysAgo: prompt-gen → respondent → save → run
 *      incremental analysis (production per-entry path).
 *   3. Capture parts state from incremental analyses (before batch wipes it).
 *   4. Run batch analysis once at the end (the post-hoc holistic re-pass).
 *   5. Curate the top 3 parts using persona-specific text.
 *   6. Capture and write a snapshot — top-level fields hold the BATCH state
 *      (what the seed loader consumes), and `incremental` holds the
 *      pre-batch state for comparison.
 */
export async function runPersona({
  prisma,
  client,
  persona,
  schedule,
  log = () => {},
}: RunPersonaInput): Promise<RunPersonaResult> {
  const startedAt = new Date()
  const userId = await ensurePersonaUser(prisma, persona.slug)
  const respondentHistory: PriorResponse[] = []
  const entryDaysAgoByEntryId = new Map<string, number>()

  log(
    `[${persona.slug}] start at ${startedAt.toISOString()} — ${schedule.length} entries scheduled`
  )

  for (let i = 0; i < schedule.length; i++) {
    const daysAgo = schedule[i]
    const idx = `${String(i + 1).padStart(2, ' ')}/${schedule.length}`

    log('')
    log(`========== [${idx}] daysAgo=${daysAgo} ==========`)

    log(`[${idx}] generating prompt...`)
    const promptStart = Date.now()
    const prompt = await generatePromptForUser({ userId, rejectedPrompts: [] })
    const promptMs = Date.now() - promptStart
    log(`[${idx}] PROMPT (${prompt.length} chars, ${promptMs}ms):`)
    log(prompt)

    log('')
    log(`[${idx}] generating response...`)
    const respStart = Date.now()
    const content = await respondAsPersona({ client, persona, prompt, prior: respondentHistory })
    const respMs = Date.now() - respStart
    const wc = wordCountOf(content)
    log(`[${idx}] RESPONSE (${content.length} chars, ${wc} words, ${respMs}ms):`)
    log(content)

    log('')
    log(`[${idx}] saving entry...`)
    const entry = await saveEntry({
      userId,
      prompt,
      content,
      wordCount: wc,
      createdAt: daysAgoToDate(daysAgo),
    })
    entryDaysAgoByEntryId.set(entry.id, daysAgo)
    respondentHistory.push({ prompt, content })
    log(`[${idx}] saved (entry id ${entry.id})`)

    log(`[${idx}] running incremental analysis...`)
    const incStart = Date.now()
    const incResult = await runIncrementalAnalysis({ entryId: entry.id, userId })
    const incMs = Date.now() - incStart
    if (incResult.ok) {
      log(`[${idx}] incremental analysis: ${incResult.partsFound} parts (${incMs}ms)`)
    } else {
      log(`[${idx}] incremental analysis FAILED (${incResult.reason}) (${incMs}ms)`)
    }
  }

  // Capture incremental state BEFORE batch reanalysis — batch wipes all
  // parts (lib/batch-analysis.ts:127-134), so without this snapshot we
  // lose the entire incremental record.
  log('')
  log(`[${persona.slug}] capturing incremental state...`)
  const incremental = await readPartsState(prisma, userId, entryDaysAgoByEntryId)
  log(
    `[${persona.slug}] incremental: ${incremental.parts.length} parts, ${incremental.partAnalyses.length} analyses, ${incremental.highlights.length} highlights`
  )

  log(`[${persona.slug}] running batch analysis...`)
  const { partsCreated, entriesAnalyzed } = await runBatchAnalysis(prisma, userId)
  log(`[${persona.slug}] batch analysis: ${partsCreated} parts, ${entriesAnalyzed} entries`)

  log(`[${persona.slug}] applying curated fields...`)
  const curated = await applyCuratedFields(prisma, userId, persona)
  log(`[${persona.slug}] curated ${curated} parts`)

  log(`[${persona.slug}] capturing snapshot...`)
  const snapshot: Snapshot = await captureSnapshot({
    prisma,
    userId,
    persona,
    scheduleDaysAgo: schedule,
    startedAt,
    entryDaysAgoByEntryId,
    models: {
      promptGen: PROMPT_GEN_MODEL,
      respondent: RESPONDENT_MODEL,
      analysis: ANALYSIS_MODEL,
    },
    incremental,
  })
  // Mark complete only after everything succeeded. Snapshots written with
  // complete=false signal an interrupted run; the seed loader refuses them.
  snapshot.complete = true

  const snapshotPath = await writeSnapshot(snapshot)
  log(`[${persona.slug}] wrote snapshot: ${snapshotPath}`)

  return { snapshotPath, userId, partsCreated, entriesAnalyzed, curated }
}
