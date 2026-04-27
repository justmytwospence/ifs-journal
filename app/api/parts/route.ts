import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'
import { transformPartWithStats } from '@/lib/part-utils'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parts = await prisma.part.findMany({
      where: { userId: session.user.id },
      include: {
        partAnalyses: {
          select: {
            id: true,
            entryId: true,
            highlights: {
              select: { exact: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get all entry dates for activity calculation (using entry dates, not analysis dates)
    const allEntryIds = [...new Set(parts.flatMap((p) => p.partAnalyses.map((a) => a.entryId)))]
    const entries = await prisma.journalEntry.findMany({
      where: { id: { in: allEntryIds }, userId: session.user.id, deletedAt: null },
      select: { id: true, createdAt: true },
    })
    const entryDateMap = new Map(entries.map((e) => [e.id, e.createdAt]))

    const partsWithStats = parts.map((part) => transformPartWithStats(part, entryDateMap))

    return NextResponse.json({ parts: partsWithStats })
  } catch (error) {
    console.error('Get parts error:', error)
    return NextResponse.json({ error: 'Failed to fetch parts' }, { status: 500 })
  }
}
