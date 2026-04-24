import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slug } = await params

    // O(1) lookup using indexed slug field
    const entry = await prisma.journalEntry.findUnique({
      where: {
        userId_slug: {
          userId: session.user.id,
          slug,
        },
      },
      include: {
        partAnalyses: {
          include: {
            part: true,
            highlights: true,
          },
        },
      },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    return NextResponse.json({
      entry: {
        id: entry.id,
        prompt: entry.prompt,
        content: entry.content,
        contentHash: entry.contentHash,
        wordCount: entry.wordCount,
        analysisStatus: entry.analysisStatus,
        createdAt: entry.createdAt,
        partAnalyses: entry.partAnalyses.map((analysis) => ({
          id: analysis.id,
          partId: analysis.partId,
          highlights: analysis.highlights.map((h) => ({
            id: h.id,
            startOffset: h.startOffset,
            endOffset: h.endOffset,
            exact: h.exact,
            prefix: h.prefix,
            suffix: h.suffix,
            reasoning: h.reasoning,
            isStale: h.isStale,
          })),
          part: {
            id: analysis.part.id,
            name: analysis.part.name,
            role: analysis.part.role,
            color: analysis.part.color,
          },
        })),
      },
    })
  } catch (error) {
    console.error('Get entry by slug error:', error)
    return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 })
  }
}
