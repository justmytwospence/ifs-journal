import { createHash, randomBytes } from 'node:crypto'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { runBatchAnalysis } from '../lib/batch-analysis'
import { SEED_ENTRIES } from './seed-entries'

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

// Helper function to create dates going back in time
const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

// Compute SHA-256 hash of content
const computeContentHash = (content: string): string => {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

// Simple slugify function
const _slugify = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Curated user-fields applied to the top 3 parts (by highlight count) after
// batch analysis. Keyed by role so we don't depend on whichever names the
// LLM happened to assign — Manager / Protector / Firefighter / Exile are the
// four roles the schema allows. The text matches the persona's voice.
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
      'Surfaces when Sam asks something completely benign about whether I did a thing. The grown-up voice answers in a second; this part has already been there for a few seconds.',
  },
}

// Create entry slug from date (same logic as lib/slug-utils.ts)
const createEntrySlug = (createdAt: Date): string => {
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

async function main() {
  console.log('🌱 Starting database seed...')

  try {
    await prisma.$connect()
    console.log('✅ Database connected')
  } catch (error) {
    console.error('❌ Failed to connect to database:', error)
    throw error
  }

  // BCRYPT_ROUNDS matches lib/password-policy.ts — kept inline so seed has no
  // dependency on the app runtime (prisma db seed runs before the Next build).
  //
  // The demo user has no usable password: we hash 32 random bytes that
  // nothing else knows, then throw them away. Demo sign-in is routed through
  // the passwordless `demo` NextAuth provider (see lib/auth.ts), so the
  // random hash only exists to satisfy the NOT NULL column and to make the
  // normal credentials flow structurally unable to authenticate the demo
  // account (no one knows the password, no brute force gets anywhere).
  const isProd = process.env.NODE_ENV === 'production'
  const demoEmail = process.env.DEMO_USER_EMAIL || (isProd ? '' : 'demo@ifsjournal.me')
  if (!demoEmail) {
    throw new Error('DEMO_USER_EMAIL must be set in production.')
  }
  const normalizedDemoEmail = demoEmail.trim().toLowerCase()
  const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 14)

  console.log('Creating test users...')

  // Try to find existing user first
  let testUser = await prisma.user.findUnique({
    where: { email: normalizedDemoEmail },
  })

  // If user doesn't exist, create it
  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: normalizedDemoEmail,
        passwordHash,
        emailVerified: true,
      },
    })
    console.log(`✅ Created user: ${testUser.email}`)
  } else {
    console.log(`✅ User already exists: ${testUser.email}`)
    // Wipe everything we're about to recreate. Delete parts first — that
    // cascades to PartAnalysis, Highlight, PartConversation, and PartsOperation
    // via the schema's onDelete: Cascade. Then delete journal entries.
    await prisma.part.deleteMany({ where: { userId: testUser.id } })
    await prisma.journalEntry.deleteMany({ where: { userId: testUser.id } })
    console.log(`✅ Wiped existing journal entries and parts`)
  }

  console.log(`Creating ${SEED_ENTRIES.length} journal entries...`)

  // Inline entries used to live here. They're now generated by
  // scripts/generate-seed-content.mjs (which calls the live prompt-gen
  // template + a persona content template) and baked into ./seed-entries.ts.
  // Re-run `npm run db:seed:author` to regenerate when the persona or the
  // prompt-gen template changes meaningfully.
  const entries = SEED_ENTRIES

  for (const entry of entries) {
    const createdAt = daysAgo(entry.daysAgo)
    const wordCount = entry.content.trim().split(/\s+/).length
    await prisma.journalEntry.create({
      data: {
        userId: testUser.id,
        slug: createEntrySlug(createdAt),
        prompt: entry.prompt,
        content: entry.content,
        contentHash: computeContentHash(entry.content),
        wordCount,
        analysisStatus: 'pending',
        createdAt,
        updatedAt: createdAt,
      },
    })
  }

  console.log(`✅ Created ${entries.length} journal entries`)

  console.log('\n🧠 Running batch parts analysis...')
  const { partsCreated, entriesAnalyzed } = await runBatchAnalysis(prisma, testUser.id)
  console.log(`✅ Analyzed ${entriesAnalyzed} entries, identified ${partsCreated} parts`)

  // Pick the 3 most-cited parts and populate their user-curated fields so
  // /parts/[id] doesn't look half-empty in the demo. Use highlight count
  // (summed across that part's analyses) as the "most cited" signal — that's
  // the strongest evidence the LLM had high confidence in this part.
  const partsForCuration = await prisma.part.findMany({
    where: { userId: testUser.id },
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
  console.log(`✅ Curated ${curated} parts with user-fields`)

  console.log('\n🎉 Database seeding completed successfully!')
  console.log('\nDemo account:')
  console.log(`  📧 ${normalizedDemoEmail} — sign in via the demo button, not the login form`)
  console.log(
    `  (${entries.length} journal entries, ${partsCreated} parts, ${curated} parts curated)`
  )
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
