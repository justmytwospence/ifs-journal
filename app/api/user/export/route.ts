import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all user data
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
              select: {
                prompt: true,
                createdAt: true,
              },
            },
          },
        },
      },
    })

    const exportData = {
      user,
      journalEntries,
      parts,
      exportedAt: new Date().toISOString(),
    }

    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="ifs-journal-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Export data error:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}
