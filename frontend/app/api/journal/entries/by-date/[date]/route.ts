import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { date: dateParam } = await params
    
    // Parse date format: 2025-10-26-14-30-45
    const parts = dateParam.split('-')
    if (parts.length !== 6) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    const [year, month, day, hour, minute, second] = parts
    const targetDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`)

    // Find entry closest to this timestamp
    const entry = await prisma.journalEntry.findFirst({
      where: { 
        userId: session.user.id,
        createdAt: {
          gte: new Date(targetDate.getTime() - 1000), // 1 second before
          lte: new Date(targetDate.getTime() + 1000), // 1 second after
        },
      },
      include: {
        partAnalyses: {
          include: {
            part: {
              select: {
                id: true,
                name: true,
                role: true,
                color: true,
              },
            },
          },
        },
      },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    return NextResponse.json({ entry })
  } catch (error) {
    console.error('Get entry by date error:', error)
    return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 })
  }
}
