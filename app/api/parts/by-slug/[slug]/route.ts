import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'
import {
  calculateActivityTrend,
  deriveQuotes,
  deriveQuotesWithEntries,
  getActivityDates,
} from '@/lib/part-utils'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slug } = await params

    // O(1) lookup using indexed slug field
    const part = await prisma.part.findUnique({
      where: {
        userId_slug: {
          userId: session.user.id,
          slug: slug,
        },
      },
      include: {
        partAnalyses: {
          select: {
            id: true,
            entryId: true,
            highlights: {
              select: {
                exact: true,
                reasoning: true,
              },
            },
          },
        },
      },
    })

    if (!part) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    }

    // Get entry dates for activity calculation and quote linking
    const entryIds = [...new Set(part.partAnalyses.map((a) => a.entryId))]
    const entries = await prisma.journalEntry.findMany({
      where: {
        id: { in: entryIds },
        userId: session.user.id,
      },
      select: {
        id: true,
        createdAt: true,
      },
    })

    const entryDateMap = new Map(entries.map((e) => [e.id, e.createdAt]))

    // Use centralized utilities for derivation
    const quotesWithEntries = deriveQuotesWithEntries(part.partAnalyses, entryDateMap)
    const activityDates = getActivityDates(part.partAnalyses, entryDateMap)
    const weeklyActivity = calculateActivityTrend(activityDates)

    return NextResponse.json({
      part: {
        id: part.id,
        name: part.name,
        slug: part.slug,
        role: part.role,
        color: part.color,
        icon: part.icon,
        description: part.description,
        customName: part.customName,
        ageImpression: part.ageImpression,
        positiveIntent: part.positiveIntent,
        fearedOutcome: part.fearedOutcome,
        whatItProtects: part.whatItProtects,
        userNotes: part.userNotes,
        quotes: deriveQuotes(part.partAnalyses),
        quotesWithEntries,
        appearances: part.partAnalyses.length,
        weeklyActivity,
      },
    })
  } catch (error) {
    console.error('Get part by slug error:', error)
    return NextResponse.json({ error: 'Failed to fetch part' }, { status: 500 })
  }
}
