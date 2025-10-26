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
          select: { id: true },
        },
      },
    })

    if (!part) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      part: {
        id: part.id,
        name: part.name,
        role: part.role,
        color: part.color,
        description: part.description,
        quotes: part.quotes,
        appearances: part.partAnalyses.length,
      }
    })
  } catch (error) {
    console.error('Get part error:', error)
    return NextResponse.json({ error: 'Failed to fetch part' }, { status: 500 })
  }
}
