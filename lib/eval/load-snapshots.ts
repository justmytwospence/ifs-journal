import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Snapshot } from './capture'
import { SNAPSHOTS_ROOT } from './capture'

/**
 * Filesystem-only snapshot reads. Used by the admin dashboard to render
 * historical eval data — no LLM calls, no DB access.
 */

export interface SnapshotIndexEntry {
  /** Filename (e.g. "2026-04-26T21-24-47-133Z.json"). Used as the URL slug. */
  fileName: string
  /** ranAt parsed from the snapshot — the canonical timestamp for sorting. */
  ranAt: string
  complete: boolean
}

/**
 * Lists snapshot files for a persona, sorted by ranAt ascending (oldest
 * first). Excludes `latest.json` because it's a copy — the timestamped
 * files are the source of truth for history.
 */
export async function listSnapshots(slug: string): Promise<SnapshotIndexEntry[]> {
  const dir = join(SNAPSHOTS_ROOT, slug)
  let files: string[]
  try {
    files = await readdir(dir)
  } catch {
    return []
  }
  const candidates = files.filter((f) => f.endsWith('.json') && f !== 'latest.json')
  const out: SnapshotIndexEntry[] = []
  for (const fileName of candidates) {
    try {
      const raw = await readFile(join(dir, fileName), 'utf-8')
      const snapshot = JSON.parse(raw) as Snapshot
      out.push({ fileName, ranAt: snapshot.ranAt, complete: snapshot.complete })
    } catch {
      // Skip unreadable / corrupt files rather than crash the whole index.
    }
  }
  return out.sort((a, b) => a.ranAt.localeCompare(b.ranAt))
}

/** Reads one snapshot by its filename. Returns null if missing. */
export async function loadSnapshot(slug: string, fileName: string): Promise<Snapshot | null> {
  const path = join(SNAPSHOTS_ROOT, slug, fileName)
  if (!existsSync(path)) return null
  try {
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw) as Snapshot
  } catch {
    return null
  }
}

/**
 * Reads the promoted snapshot for each persona that has one. Returns
 * `{ slug, snapshot }` pairs sorted by slug. Personas without a
 * latest.json are skipped — the picker page won't show them either.
 */
export async function loadLatestForAllPersonas(): Promise<
  Array<{ slug: string; snapshot: Snapshot }>
> {
  let entries: { name: string; isDirectory: () => boolean }[]
  try {
    entries = await readdir(SNAPSHOTS_ROOT, { withFileTypes: true })
  } catch {
    return []
  }
  const slugs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
  const out: Array<{ slug: string; snapshot: Snapshot }> = []
  for (const slug of slugs) {
    const snapshot = await loadSnapshot(slug, 'latest.json')
    if (snapshot) out.push({ slug, snapshot })
  }
  return out
}

/** Loads every snapshot for a persona (full content, not just index). */
export async function loadAllSnapshotsForPersona(slug: string): Promise<Snapshot[]> {
  const index = await listSnapshots(slug)
  const out: Snapshot[] = []
  for (const { fileName } of index) {
    const snapshot = await loadSnapshot(slug, fileName)
    if (snapshot) out.push(snapshot)
  }
  return out
}
