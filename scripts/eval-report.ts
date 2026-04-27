// npm run eval:report entry point.
//
// Reads the latest snapshot for each persona (or one if --persona <slug>) and
// prints a scorecard with mechanical quality checks: forbidden prompt
// patterns, prompt diversity, parts coverage, citation validity, etc.
//
// This is NOT an aggregate quality number — it's a panel of indicators that
// together let a human spot regressions ("citation validity dropped from 100%
// to 87% — something broke in analysis"). Aggregation across dimensions
// requires baseline data we don't have yet.

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import type { Snapshot } from '../lib/eval/capture'
import { formatScorecard, scoreSnapshot } from '../lib/eval/score'

const SNAPSHOTS_ROOT = 'evals/snapshots'

async function listPersonas(): Promise<string[]> {
  try {
    const entries = await readdir(SNAPSHOTS_ROOT, { withFileTypes: true })
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
  } catch {
    return []
  }
}

async function findMostRecentSnapshot(slug: string): Promise<string | null> {
  const dir = join(SNAPSHOTS_ROOT, slug)
  let files: string[]
  try {
    files = await readdir(dir)
  } catch {
    return null
  }
  // Prefer latest.json (the promoted snapshot) — that's what production sees.
  // Fall back to the most recent <iso-timestamp>.json if there's no promotion
  // yet. ISO-style filenames sort lexicographically as time order.
  if (files.includes('latest.json')) {
    return join(dir, 'latest.json')
  }
  const candidates = files.filter((f) => f.endsWith('.json'))
  candidates.sort()
  if (candidates.length === 0) return null
  return join(dir, candidates.at(-1) as string)
}

async function readSnapshot(path: string): Promise<Snapshot> {
  return JSON.parse(await readFile(path, 'utf-8')) as Snapshot
}

async function main() {
  const { values } = parseArgs({
    options: { persona: { type: 'string' } },
    strict: true,
  })

  const slugs = values.persona ? [values.persona] : await listPersonas()
  if (slugs.length === 0) {
    console.log('No snapshots found in evals/snapshots/.')
    return
  }

  for (const slug of slugs) {
    const path = await findMostRecentSnapshot(slug)
    if (!path) {
      console.log(`${slug}: no snapshot`)
      continue
    }
    const snapshot = await readSnapshot(path)
    console.log(`\n${path}`)
    console.log(formatScorecard(scoreSnapshot(snapshot)))
  }
}

main().catch((err) => {
  console.error('eval-report failed:', err)
  process.exit(1)
})
