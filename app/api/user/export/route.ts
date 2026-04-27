import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'
import { captureException } from '@/lib/logger'

export async function GET(_request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const journalEntries = await prisma.journalEntry.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    const parts = await prisma.part.findMany({
      where: { userId: session.user.id },
      include: {
        partAnalyses: {
          include: {
            entry: {
              select: { id: true, prompt: true, createdAt: true },
            },
            highlights: true,
          },
        },
      },
    })

    const partConversations = await prisma.partConversation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
    })

    const exportData = {
      user,
      journalEntries,
      parts,
      partConversations,
      exportedAt: new Date().toISOString(),
      exportVersion: 2,
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="ifs-journal-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    captureException(error, { route: 'GET /api/user/export' })
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}
