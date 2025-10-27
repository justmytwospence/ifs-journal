import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'
import { createEntrySlug } from '@/lib/slug-utils'

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
    
    // Get all entries for this user
    const entries = await prisma.journalEntry.findMany({
      where: { 
        userId: session.user.id,
      },
      include: {
        partAnalyses: {
          include: {
            part: true,
          },
        },
      },
    })

    // Find the entry whose slugified date matches the slug
    const entry = entries.find(e => createEntrySlug(e.createdAt) === slug)

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      entry: {
        id: entry.id,
        prompt: entry.prompt,
        content: entry.content,
        wordCount: entry.wordCount,
        analysisStatus: entry.analysisStatus,
        createdAt: entry.createdAt,
        partAnalyses: entry.partAnalyses.map(analysis => ({
          id: analysis.id,
          partId: analysis.partId,
          highlights: analysis.highlights,
          reasoning: analysis.reasoning,
          part: {
            id: analysis.part.id,
            name: analysis.part.name,
            role: analysis.part.role,
            color: analysis.part.color,
          },
        })),
      }
    })
  } catch (error) {
    console.error('Get entry by slug error:', error)
    return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 })
  }
}
