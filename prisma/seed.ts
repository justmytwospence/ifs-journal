import { createHash, randomBytes } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Matches lib/db.ts — Neon's pooler endpoint only speaks PostgreSQL via
// their serverless driver, so the classic Prisma engine can't reach it.
// Falls back to the unpooled variant for the same reason as lib/db.ts.
const connectionString = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED
if (!connectionString) {
  throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED is required')
}
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
})

// Snapshot format mirrors lib/eval/capture.ts. Kept as a structural type here
// so seed has no compile-time dependency on lib/eval (the seed should be the
// one consumer that doesn't pull in the harness).
interface SnapshotEntry {
  daysAgo: number
  prompt: string
  content: string
  wordCount: number
}
interface SnapshotPart {
  name: string
  role: string
  color: string
  icon: string
  description: string
}
interface SnapshotPartAnalysis {
  entryDaysAgo: number
  partName: string
  confidence: number
}
interface SnapshotHighlight {
  entryDaysAgo: number
  partName: string
  exact: string
  prefix: string
  suffix: string
  startOffset: number
  endOffset: number
  reasoning: string | null
}
interface SnapshotCuratedFields {
  customName?: string
  ageImpression?: string
  positiveIntent?: string
  fearedOutcome?: string
  whatItProtects?: string
  userNotes?: string
}
interface Snapshot {
  personaSlug: string
  complete: boolean
  ranAt: string
  schedule: number[]
  entries: SnapshotEntry[]
  parts: SnapshotPart[]
  partAnalyses: SnapshotPartAnalysis[]
  highlights: SnapshotHighlight[]
  curatedFields: Record<string, SnapshotCuratedFields>
}

const SNAPSHOTS_ROOT = 'evals/snapshots'

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

function slugifyPartName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function createEntrySlug(createdAt: Date): string {
  const year = createdAt.getUTCFullYear()
  const month = String(createdAt.getUTCMonth() + 1).padStart(2, '0')
  const day = String(createdAt.getUTCDate()).padStart(2, '0')
  const weekday = createdAt
    .toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
    .toLowerCase()
  let hours = createdAt.getUTCHours()
  const minutes = String(createdAt.getUTCMinutes()).padStart(2, '0')
  const seconds = String(createdAt.getUTCSeconds()).padStart(2, '0')
  const ampm = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12 || 12
  return `${year}-${month}-${day}-${weekday}-${hours}-${minutes}-${seconds}${ampm}`
}

const daysAgoToDate = (days: number): Date => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

async function listPersonaSlugs(): Promise<string[]> {
  try {
    const entries = await readdir(SNAPSHOTS_ROOT, { withFileTypes: true })
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}

async function readLatestSnapshot(slug: string): Promise<Snapshot | null> {
  const path = join(SNAPSHOTS_ROOT, slug, 'latest.json')
  let raw: string
  try {
    raw = await readFile(path, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
  return JSON.parse(raw) as Snapshot
}

async function ensureDemoUser(email: string): Promise<{ id: string; isNew: boolean }> {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { id: existing.id, isNew: false }
  // Demo accounts have no usable password — the demo provider in lib/auth.ts
  // signs them in passwordless. We hash random bytes nothing else knows just
  // to satisfy NOT NULL and to make the credentials flow structurally unable
  // to authenticate the account.
  const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 14)
  const created = await prisma.user.create({
    data: { email, passwordHash, emailVerified: true },
  })
  return { id: created.id, isNew: true }
}

/**
 * Wipes everything for one demo user before reload. Cascades on Part delete
 * cover PartAnalysis / Highlight / PartConversation / PartsOperation; we
 * delete entries explicitly afterwards. Only touches rows with the given
 * userId — any non-demo user data is untouched.
 */
async function wipeDemoUserData(userId: string): Promise<void> {
  await prisma.part.deleteMany({ where: { userId } })
  await prisma.journalEntry.deleteMany({ where: { userId } })
}

async function loadSnapshot(userId: string, snapshot: Snapshot): Promise<void> {
  // 1. Entries — keep a daysAgo → entryId map for cross-references.
  const entryIdByDaysAgo = new Map<number, string>()
  for (const e of snapshot.entries) {
    const createdAt = daysAgoToDate(e.daysAgo)
    const created = await prisma.journalEntry.create({
      data: {
        userId,
        slug: createEntrySlug(createdAt),
        prompt: e.prompt,
        content: e.content,
        contentHash: sha256(e.content),
        wordCount: e.wordCount,
        analysisStatus: 'completed',
        createdAt,
      },
    })
    entryIdByDaysAgo.set(e.daysAgo, created.id)
  }

  // 2. Parts — keep a name → partId map. Apply curated fields inline if
  //    present. The schema's @@unique([userId, slug]) means slug collisions
  //    fail loudly, which is what we want.
  const partIdByName = new Map<string, string>()
  for (const p of snapshot.parts) {
    const curated = snapshot.curatedFields[p.name] ?? {}
    const created = await prisma.part.create({
      data: {
        userId,
        name: p.name,
        slug: slugifyPartName(p.name),
        description: p.description,
        role: p.role,
        color: p.color,
        icon: p.icon,
        customName: curated.customName ?? null,
        ageImpression: curated.ageImpression ?? null,
        positiveIntent: curated.positiveIntent ?? null,
        fearedOutcome: curated.fearedOutcome ?? null,
        whatItProtects: curated.whatItProtects ?? null,
        userNotes: curated.userNotes ?? null,
      },
    })
    partIdByName.set(p.name, created.id)
  }

  // 3. PartAnalyses — link (entry, part). Keep (entryDaysAgo, partName) →
  //    analysisId so highlights can attach.
  const analysisIdByEntryAndPart = new Map<string, string>()
  for (const pa of snapshot.partAnalyses) {
    const entryId = entryIdByDaysAgo.get(pa.entryDaysAgo)
    const partId = partIdByName.get(pa.partName)
    if (!entryId || !partId) {
      throw new Error(
        `seed: snapshot references missing entry/part — daysAgo=${pa.entryDaysAgo} partName="${pa.partName}"`
      )
    }
    const created = await prisma.partAnalysis.create({
      data: { entryId, partId, confidence: pa.confidence },
    })
    analysisIdByEntryAndPart.set(`${pa.entryDaysAgo}:${pa.partName}`, created.id)
  }

  // 4. Highlights — attach to the matching partAnalysis.
  for (const h of snapshot.highlights) {
    const analysisId = analysisIdByEntryAndPart.get(`${h.entryDaysAgo}:${h.partName}`)
    if (!analysisId) {
      throw new Error(
        `seed: highlight references missing analysis — daysAgo=${h.entryDaysAgo} partName="${h.partName}"`
      )
    }
    await prisma.highlight.create({
      data: {
        partAnalysisId: analysisId,
        startOffset: h.startOffset,
        endOffset: h.endOffset,
        exact: h.exact,
        prefix: h.prefix,
        suffix: h.suffix,
        reasoning: h.reasoning,
      },
    })
  }
}

async function main() {
  console.log('🌱 Starting database seed (snapshot loader)...')
  await prisma.$connect()

  const slugs = await listPersonaSlugs()
  if (slugs.length === 0) {
    console.log('No personas found in evals/snapshots/. Nothing to seed.')
    return
  }

  let loaded = 0
  let skipped = 0
  for (const slug of slugs) {
    const snapshot = await readLatestSnapshot(slug)
    if (!snapshot) {
      console.warn(`! ${slug}: no latest.json — skipping (run npm run eval:promote first)`)
      skipped++
      continue
    }
    if (!snapshot.complete) {
      throw new Error(
        `seed: refusing to load incomplete snapshot for "${slug}" — re-run eval and promote a complete one`
      )
    }

    const email = `demo-${slug}@ifsjournal.me`
    const { id: userId, isNew } = await ensureDemoUser(email)
    await wipeDemoUserData(userId)
    await loadSnapshot(userId, snapshot)
    console.log(
      `✓ ${slug}: ${isNew ? 'created' : 'updated'} ${email} — ${snapshot.entries.length} entries, ${snapshot.parts.length} parts`
    )
    loaded++
  }

  console.log(`\n🎉 Seed complete: ${loaded} persona(s) loaded, ${skipped} skipped`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
