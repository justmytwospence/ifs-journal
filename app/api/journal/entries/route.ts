import { after, NextResponse } from 'next/server'
import { z } from 'zod'
import { computeContentHash } from '@/lib/anchoring'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'
import { demoGuard } from '@/lib/demo-guard'
import { reapStuckAnalyses, runIncrementalAnalysis } from '@/lib/incremental-analysis'
import { captureException } from '@/lib/logger'
import { enforceRateLimit, HOUR_MS } from '@/lib/rate-limit'
import { createEntrySlug } from '@/lib/slug-utils'

const createEntrySchema = z.object({
  prompt: z.string().max(500),
  content: z.string().min(1).max(20_000),
  wordCount: z.number().int().min(0).max(10_000),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prevent demo users from creating entries
    const demoCheck = await demoGuard()
    if (demoCheck) return demoCheck

    const limited = await enforceRateLimit({
      subjectKey: `user:${session.user.id}`,
      bucket: 'journal:create',
      limit: 30,
      windowMs: HOUR_MS,
    })
    if (limited) return limited

    const body = await request.json()
    const { prompt, content, wordCount } = createEntrySchema.parse(body)

    // Create entry with pre-computed slug for O(1) lookup
    const createdAt = new Date()
    const entry = await prisma.journalEntry.create({
      data: {
        userId: session.user.id,
        slug: createEntrySlug(createdAt),
        prompt,
        content,
        contentHash: computeContentHash(content),
        wordCount,
        analysisStatus: 'pending',
        createdAt,
      },
    })

    // Kick off analysis after the response has been sent. `after()` keeps the
    // serverless function alive past response flush so the work actually runs
    // — the previous fire-and-forget `fetch()` would get killed when Vercel
    // wound down the container, leaving entries permanently in `pending`.
    const userId = session.user.id
    after(async () => {
      await runIncrementalAnalysis({ entryId: entry.id, userId })
    })

    return NextResponse.json({ success: true, entry }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }

    captureException(error, { route: 'POST /api/journal/entries' })
    return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Mark entries whose analysis has been hanging in `processing` for too
    // long as `failed`, so a killed-mid-run analysis doesn't leave the UI
    // spinning forever.
    await reapStuckAnalyses(session.user.id)

    const { searchParams } = new URL(request.url)
    const includeAnalyses = searchParams.get('includeAnalyses') === 'true'
    const weeksRaw = Number.parseInt(searchParams.get('weeks') ?? '1', 10)
    // Clamp to a sane range: unbounded parseInt lets `?weeks=999999` scan the
    // whole table, `?weeks=abc` produces NaN which Prisma rejects.
    const weeks = Number.isFinite(weeksRaw) ? Math.min(Math.max(weeksRaw, 1), 520) : 1

    // Calculate date for N weeks ago
    const weeksAgo = new Date()
    weeksAgo.setDate(weeksAgo.getDate() - weeks * 7)

    const where = { userId: session.user.id }

    // Get total count
    const totalCount = await prisma.journalEntry.count({ where })

    // Get entries from the last N weeks
    const entries = await prisma.journalEntry.findMany({
      where: {
        ...where,
        createdAt: {
          gte: weeksAgo,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: includeAnalyses
        ? {
            partAnalyses: {
              include: {
                part: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                    color: true,
                    icon: true,
                  },
                },
                highlights: {
                  select: {
                    id: true,
                    startOffset: true,
                    endOffset: true,
                    exact: true,
                    prefix: true,
                    suffix: true,
                    reasoning: true,
                    isStale: true,
                  },
                },
              },
            },
          }
        : undefined,
    })

    return NextResponse.json({ entries, totalCount, weeks })
  } catch (error) {
    captureException(error, { route: 'GET /api/journal/entries' })
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
  }
}
