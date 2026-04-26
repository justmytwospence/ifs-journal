// npm run eval entry point.
//
// Defaults to running every persona under evals/personas/ in parallel against
// whatever DB DATABASE_URL[_UNPOOLED] points at. Refuses to run if that's the
// production endpoint (scripts/check-not-prod.ts gates the npm script).
//
// Each persona writes a detailed run log (every prompt, every response,
// every batch step) to evals/logs/<slug>.log — gitignored, regenerated each
// run. Tail any of those files to follow along with one persona.
//
// Personas are independent: each owns its own DB user and its own snapshot
// dir, so parallel runs don't conflict. The Anthropic side handles three
// concurrent streams comfortably under the standard tier.

import { createWriteStream, type WriteStream } from 'node:fs'
import { mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import Anthropic from '@anthropic-ai/sdk'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

// The eval is a single long-running process. Prefer the direct (unpooled)
// connection — the pooled DATABASE_URL goes through PgBouncer in transaction
// mode, which the @prisma/adapter-neon driver flags as Accelerate-like and
// refuses. Set DATABASE_URL to the unpooled value before importing anything
// that touches Prisma.
if (process.env.DATABASE_URL_UNPOOLED) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED
}

// 40 entries across 60 days, oldest first. Cadence is uneven on purpose —
// clusters of journaling followed by quieter stretches mirror how people
// actually keep a practice. Most-recent entries cluster (0,1,2,3) so the
// demo feels active when someone signs in today.
const FULL_SCHEDULE = [
  60, 58, 57, 55, 53, 52, 50, 48, 47, 46, 44, 42, 41, 39, 37, 36, 35, 33, 31, 30, 28, 27, 25, 23,
  22, 20, 19, 17, 15, 14, 12, 10, 9, 8, 6, 5, 3, 2, 1, 0,
]

const PERSONAS_DIR = 'evals/personas'
const LOGS_DIR = 'evals/logs'

function makeLogger(slug: string): { log: (line: string) => void; close: () => Promise<void> } {
  const path = join(LOGS_DIR, `${slug}.log`)
  const stream: WriteStream = createWriteStream(path, { flags: 'w' })
  return {
    log: (line: string) => stream.write(`${line}\n`),
    close: () =>
      new Promise<void>((resolve, reject) => {
        stream.end((err: unknown) => (err ? reject(err) : resolve()))
      }),
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      persona: { type: 'string' },
      days: { type: 'string' },
    },
    strict: true,
  })

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required (set in .env.local).')
  }

  // Lazy-require app modules AFTER the env munging at the top of this file —
  // lib/db.ts grabs DATABASE_URL at module-init time, so any earlier static
  // import would freeze the wrong value.
  const { loadPersona } = await import('../lib/eval/persona-loader')
  const { runPersona } = await import('../lib/eval/run-persona')

  const allFiles = await readdir(PERSONAS_DIR)
  const allSlugs = allFiles.filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''))

  const targetSlug = values.persona
  const slugs = targetSlug ? allSlugs.filter((s) => s === targetSlug) : allSlugs

  if (slugs.length === 0) {
    if (targetSlug) {
      throw new Error(
        `Unknown persona: "${targetSlug}". Available: ${allSlugs.join(', ') || '(none)'}`
      )
    }
    throw new Error(`No persona files found in ${PERSONAS_DIR}/.`)
  }

  // --days N filters the schedule down to entries within the last N days.
  // Useful for quick smoke runs (e.g. --days 5 → 5 entries, ~3 min, ~$0.30).
  const days = values.days != null ? Number.parseInt(values.days, 10) : null
  if (days != null && (!Number.isFinite(days) || days < 0)) {
    throw new Error(`--days must be a non-negative integer (got "${values.days}")`)
  }
  const schedule = days != null ? FULL_SCHEDULE.filter((d) => d <= days) : FULL_SCHEDULE

  if (schedule.length === 0) {
    throw new Error(
      `Schedule is empty after applying --days=${days}. Min daysAgo in the schedule is ${Math.min(
        ...FULL_SCHEDULE
      )}.`
    )
  }

  // Lazy-import prisma so dotenv has loaded DATABASE_URL before lib/db.ts
  // grabs it at module-init time.
  const { default: prisma } = await import('../lib/db')

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const personas = await Promise.all(slugs.map((slug) => loadPersona(PERSONAS_DIR, slug)))

  await mkdir(LOGS_DIR, { recursive: true })

  console.log(
    `eval: ${personas.length} persona(s) in parallel, ${schedule.length} entry/persona, schedule daysAgo=[${schedule[0]}..${schedule.at(-1)}]`
  )
  console.log(`logs: tail evals/logs/<persona>.log to follow each run\n`)

  const loggers = personas.map((p) => ({ persona: p, ...makeLogger(p.slug) }))

  // Run all personas in parallel. Each owns its own demo user, its own
  // snapshot directory, and its own log file — there's nothing to race on.
  const results = await Promise.allSettled(
    loggers.map(({ persona, log }) =>
      runPersona({ prisma, client, persona, schedule, log }).then((result) => ({
        persona,
        result,
      }))
    )
  )

  // Tear down log streams before reporting so the final lines flush to disk.
  await Promise.all(loggers.map(({ close }) => close()))

  console.log('')
  let failed = 0
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    const slug = loggers[i].persona.slug
    if (r.status === 'fulfilled') {
      const { result } = r.value
      console.log(
        `✓ ${slug}: ${result.entriesAnalyzed} entries, ${result.partsCreated} parts, ${result.curated} curated → ${result.snapshotPath}`
      )
    } else {
      failed++
      console.error(`✗ ${slug}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`)
      console.error(`  see evals/logs/${slug}.log for context`)
    }
  }

  await prisma.$disconnect()

  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('eval-run failed:', err)
  process.exit(1)
})
