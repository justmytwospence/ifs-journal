import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { partId } = await params

    // Fetch conversation history for this part
    const conversations = await prisma.partConversation.findMany({
      where: {
        partId,
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        userMessage: true,
        partResponse: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      conversations,
      success: true,
    })
  } catch (error) {
    console.error('Failed to fetch conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}
