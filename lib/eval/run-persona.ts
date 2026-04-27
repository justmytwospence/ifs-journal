import { randomBytes } from 'node:crypto'
import type Anthropic from '@anthropic-ai/sdk'
import type { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { runBatchAnalysis } from '@/lib/batch-analysis'
import { saveEntry } from '@/lib/journal/save-entry'
import { generatePromptForUser } from '@/lib/prompts/generate-for-user'
import { captureSnapshot, type Snapshot, writeSnapshot } from './capture'
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

// Curated user-fields applied to the top 3 parts (by highlight count) after
// batch analysis. Keyed by role so we don't depend on whichever names the
// LLM happened to assign — Manager / Protector / Firefighter / Exile are the
// four roles the schema allows.
//
// v1 uses uniform text across personas. The voice was written for a
// 30-something knowledge worker (Maya); on Riley/Kai it will sound slightly
// off but still functional. Future work: move per-persona curated text into
// the persona files.
const CURATED_BY_ROLE: Record<
  string,
  {
    customName: string
    ageImpression: string
    positiveIntent: string
    fearedOutcome: string
    whatItProtects: string
    userNotes: string
  }
> = {
  manager: {
    customName: 'The Planner',
    ageImpression: '34',
    positiveIntent:
      'Keep the day from going off the rails so I can be reliable for the people counting on me.',
    fearedOutcome:
      'Letting something slip and watching someone notice — the small flicker of "oh, you didn\'t" that I can\'t un-see.',
    whatItProtects:
      'A quieter part of me that goes blank when too many things are happening at once.',
    userNotes:
      'Loudest on Sunday evenings reviewing the week ahead, and on Monday mornings when the inbox loads. Quieter on Friday afternoons, almost absent on long walks.',
  },
  protector: {
    customName: 'The Caretaker',
    ageImpression: '29',
    positiveIntent: 'Make sure no one I care about feels let down or under-prioritized.',
    fearedOutcome:
      'Saying the wrong thing — or saying nothing — and losing the warmth of a relationship I depend on.',
    whatItProtects:
      'A part of me that just wants to be liked, that has a hard time when someone is even mildly disappointed.',
    userNotes:
      'Says yes before the rest of me has caught up. The resentment that arrives a day or two later is the tell.',
  },
  firefighter: {
    customName: 'The Off-Switch',
    ageImpression: '17',
    positiveIntent:
      'Stop the buildup. Make the heaviness pause for an hour even if nothing actually gets done.',
    fearedOutcome:
      "Sitting with a feeling that doesn't have anywhere to go — being trapped inside it without an exit.",
    whatItProtects:
      "An exhausted part that doesn't believe rest is permitted unless everything is finished, which it never is.",
    userNotes:
      "Shows up around 9pm with my phone in my hand. The scrolling isn't fun by 10:30 but it's easier than going to bed and admitting the day is over.",
  },
  exile: {
    customName: 'The Younger One',
    ageImpression: '8',
    positiveIntent: "Be safe. Not be the one who didn't do the thing they were supposed to do.",
    fearedOutcome:
      'Being seen having forgotten — the specific sinking of being called on without the answer.',
    whatItProtects:
      '(itself — the youngest of the parts, the one the others are organized around keeping out of the room)',
    userNotes:
      'Surfaces when someone asks something completely benign about whether I did a thing. The grown-up voice answers in a second; this part has already been there for a few seconds.',
  },
}

async function applyCuratedFields(prisma: PrismaClient, userId: string): Promise<number> {
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
    const template = CURATED_BY_ROLE[p.role.toLowerCase()] ?? CURATED_BY_ROLE.manager
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
 *   2. For each scheduled daysAgo: ask the live prompt-gen lib for the next
 *      prompt, ask the respondent to write the entry, persist it.
 *   3. Run batch analysis once at the end.
 *   4. Curate the top 3 parts.
 *   5. Capture and write a snapshot to evals/snapshots/<slug>/<timestamp>.json.
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
  }

  log('')
  log(`[${persona.slug}] running batch analysis...`)
  const { partsCreated, entriesAnalyzed } = await runBatchAnalysis(prisma, userId)
  log(`[${persona.slug}] batch analysis: ${partsCreated} parts, ${entriesAnalyzed} entries`)

  log(`[${persona.slug}] applying curated fields...`)
  const curated = await applyCuratedFields(prisma, userId)
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
  })
  // Mark complete only after everything succeeded. Snapshots written with
  // complete=false signal an interrupted run; the seed loader refuses them.
  snapshot.complete = true

  const snapshotPath = await writeSnapshot(snapshot)
  log(`[${persona.slug}] wrote snapshot: ${snapshotPath}`)

  return { snapshotPath, userId, partsCreated, entriesAnalyzed, curated }
}
