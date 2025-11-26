import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
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

    // Get entry dates for slug generation
    const entryIds = [...new Set(part.partAnalyses.map(a => a.entryId))]
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
    
    const entryDateMap = new Map(entries.map(e => [e.id, e.createdAt]))
    
    // Extract all highlights with their entry IDs and dates
    const quotesWithEntries = part.partAnalyses.flatMap(analysis => 
      analysis.highlights.map(highlight => ({
        text: highlight.exact,
        reasoning: highlight.reasoning,
        entryId: analysis.entryId,
        entryCreatedAt: entryDateMap.get(analysis.entryId),
      }))
    )

    // Calculate activity over last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const activityByDay: Record<string, number> = {}
    part.partAnalyses.forEach(analysis => {
      const entryDate = entryDateMap.get(analysis.entryId)
      if (entryDate && entryDate >= thirtyDaysAgo) {
        const dateKey = entryDate.toISOString().split('T')[0]
        activityByDay[dateKey] = (activityByDay[dateKey] || 0) + 1
      }
    })
    
    // Create array of daily counts for last 30 days
    const weeklyActivity: number[] = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split('T')[0]
      weeklyActivity.push(activityByDay[dateKey] || 0)
    }

    // Derive unique quotes from highlights
    const quotes = quotesWithEntries
      .map(q => q.text)
      .filter((q, i, arr) => arr.indexOf(q) === i)

    return NextResponse.json({ 
      part: {
        id: part.id,
        name: part.name,
        slug: part.slug,
        role: part.role,
        color: part.color,
        icon: part.icon,
        description: part.description,
        quotes,
        quotesWithEntries,
        appearances: part.partAnalyses.length,
        weeklyActivity,
      }
    })
  } catch (error) {
    console.error('Get part by slug error:', error)
    return NextResponse.json({ error: 'Failed to fetch part' }, { status: 500 })
  }
}
