import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const part = await prisma.part.findUnique({
      where: { 
        id,
        userId: session.user.id,
      },
      include: {
        partAnalyses: {
          select: { 
            id: true,
            highlights: {
              select: { exact: true },
            },
          },
        },
      },
    })

    if (!part) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    }

    // Derive quotes from highlights
    const quotes = part.partAnalyses
      .flatMap(a => a.highlights.map(h => h.exact))
      .filter((q, i, arr) => arr.indexOf(q) === i)

    return NextResponse.json({ 
      part: {
        id: part.id,
        name: part.name,
        slug: part.slug,
        role: part.role,
        color: part.color,
        description: part.description,
        quotes,
        appearances: part.partAnalyses.length,
      }
    })
  } catch (error) {
    console.error('Get part error:', error)
    return NextResponse.json({ error: 'Failed to fetch part' }, { status: 500 })
  }
}
