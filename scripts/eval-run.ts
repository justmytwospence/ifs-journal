// npm run eval entry point.
//
// Defaults to running every persona under evals/personas/ sequentially against
// whatever DB DATABASE_URL[_UNPOOLED] points at. Refuses to run if that's the
// production endpoint (scripts/check-not-prod.ts gates the npm script).
//
// Sequential is intentional — parallel would race on Anthropic rate limits
// and on the shared sandbox DB's demo-user rows.

import { readdir } from 'node:fs/promises'
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

  console.log(
    `eval: ${personas.length} persona(s), ${schedule.length} entry/persona, schedule daysAgo=[${schedule[0]}..${schedule.at(-1)}]`
  )

  for (const persona of personas) {
    console.log(`\n=== ${persona.name} (${persona.slug}) ===`)
    const result = await runPersona({ prisma, client, persona, schedule })
    console.log(
      `✓ ${persona.slug}: ${result.entriesAnalyzed} entries, ${result.partsCreated} parts, ${result.curated} curated → ${result.snapshotPath}`
    )
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('eval-run failed:', err)
  process.exit(1)
})
