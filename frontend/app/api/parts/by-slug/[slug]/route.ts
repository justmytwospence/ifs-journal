import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'
import { slugify } from '@/lib/slug-utils'

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
    
    // Get all parts for this user
    const parts = await prisma.part.findMany({
      where: { 
        userId: session.user.id,
      },
      include: {
        partAnalyses: {
          select: { 
            id: true,
            highlights: true,
            entryId: true,
          },
        },
      },
    })

    // Find the part whose slugified name matches the slug
    const part = parts.find(p => slugify(p.name) === slug)

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
        text: highlight,
        entryId: analysis.entryId,
        entryCreatedAt: entryDateMap.get(analysis.entryId),
      }))
    )

    return NextResponse.json({ 
      part: {
        id: part.id,
        name: part.name,
        role: part.role,
        color: part.color,
        description: part.description,
        quotes: part.quotes,
        quotesWithEntries,
        appearances: part.partAnalyses.length,
      }
    })
  } catch (error) {
    console.error('Get part by slug error:', error)
    return NextResponse.json({ error: 'Failed to fetch part' }, { status: 500 })
  }
}
