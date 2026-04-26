// npm run eval:promote entry point.
//
// Copies the most recent <iso-timestamp>.json snapshot for each persona to
// evals/snapshots/<persona>/latest.json — the file the seed loader reads.
// The git commit changing latest.json IS the promotion event; the per-run
// timestamped snapshots are append-only history.
//
// Refuses to promote a snapshot where complete=false (interrupted run).
// Warns when git.dirty=true at capture time (lineage is fuzzy).

import { copyFile, readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

const SNAPSHOTS_ROOT = 'evals/snapshots'
const LATEST = 'latest.json'

interface SnapshotMeta {
  complete?: boolean
  ranAt?: string
  git?: { dirty?: boolean; sha?: string }
  personaSlug?: string
}

async function listPersonaDirs(): Promise<string[]> {
  const entries = await readdir(SNAPSHOTS_ROOT, { withFileTypes: true })
  return entries.filter((e) => e.isDirectory()).map((e) => e.name)
}

async function findMostRecentSnapshot(personaDir: string): Promise<string | null> {
  const files = await readdir(personaDir)
  const candidates = files.filter((f) => f.endsWith('.json') && f !== LATEST)
  if (candidates.length === 0) return null
  // ISO-ish timestamps in filenames sort lexicographically as time order.
  candidates.sort()
  return join(personaDir, candidates.at(-1) as string)
}

async function readSnapshotMeta(path: string): Promise<SnapshotMeta> {
  const raw = await readFile(path, 'utf-8')
  return JSON.parse(raw) as SnapshotMeta
}

async function promotePersona(slug: string): Promise<void> {
  const dir = join(SNAPSHOTS_ROOT, slug)
  await stat(dir) // throws ENOENT if missing
  const latestPath = await findMostRecentSnapshot(dir)
  if (!latestPath) {
    console.warn(`! ${slug}: no snapshots in ${dir}, skipping`)
    return
  }
  const meta = await readSnapshotMeta(latestPath)
  if (!meta.complete) {
    throw new Error(
      `${slug}: refusing to promote ${latestPath} — complete=false (run was interrupted)`
    )
  }
  if (meta.git?.dirty) {
    console.warn(`! ${slug}: ${latestPath} captured with dirty working tree — lineage is fuzzy`)
  }
  const dest = join(dir, LATEST)
  await copyFile(latestPath, dest)
  console.log(`✓ ${slug}: promoted ${latestPath.split('/').pop()} → ${dest}`)
}

async function main() {
  const { values } = parseArgs({
    options: {
      persona: { type: 'string' },
    },
    strict: true,
  })
  const slugs = values.persona ? [values.persona] : await listPersonaDirs()
  if (slugs.length === 0) {
    console.log('No personas to promote.')
    return
  }
  for (const slug of slugs) {
    await promotePersona(slug)
  }
}

main().catch((err) => {
  console.error('eval-promote failed:', err)
  process.exit(1)
})
