import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parts = await prisma.part.findMany({
      where: { userId: session.user.id },
      include: {
        partAnalyses: {
          select: { 
            id: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate activity over last 30 days for sparklines
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const partsWithStats = parts.map(part => {
      // Group analyses by day for the last 30 days
      const activityByDay: Record<string, number> = {}
      
      part.partAnalyses.forEach(analysis => {
        const date = new Date(analysis.createdAt)
        if (date >= thirtyDaysAgo) {
          const dateKey = date.toISOString().split('T')[0]
          activityByDay[dateKey] = (activityByDay[dateKey] || 0) + 1
        }
      })

      // Create array of daily counts for last 30 days
      const activityTrend: number[] = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateKey = date.toISOString().split('T')[0]
        activityTrend.push(activityByDay[dateKey] || 0)
      }

      return {
        id: part.id,
        name: part.name,
        role: part.role,
        color: part.color,
        description: part.description,
        quotes: part.quotes,
        appearances: part.partAnalyses.length,
        activityTrend,
        createdAt: part.createdAt,
      }
    })

    return NextResponse.json({ parts: partsWithStats })
  } catch (error) {
    console.error('Get parts error:', error)
    return NextResponse.json({ error: 'Failed to fetch parts' }, { status: 500 })
  }
}
