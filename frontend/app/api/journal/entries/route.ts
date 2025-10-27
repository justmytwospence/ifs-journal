import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'
import { z } from 'zod'
import { demoGuard } from '@/lib/demo-guard'

const createEntrySchema = z.object({
  prompt: z.string(),
  content: z.string(),
  wordCount: z.number(),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prevent demo users from creating entries
    const demoCheck = await demoGuard()
    if (demoCheck) return demoCheck

    const body = await request.json()
    const { prompt, content, wordCount } = createEntrySchema.parse(body)

    const entry = await prisma.journalEntry.create({
      data: {
        userId: session.user.id,
        prompt,
        content,
        wordCount,
        analysisStatus: 'pending',
      },
    })

    // Trigger incremental analysis asynchronously (fire and forget)
    const baseUrl = request.headers.get('host') 
      ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`
      : process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    fetch(`${baseUrl}/api/journal/entries/${entry.id}/incremental-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
    }).catch(err => {
      console.error('Failed to trigger incremental analysis:', err)
    })

    return NextResponse.json({ success: true, entry }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }

    console.error('Create entry error:', error)
    return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeAnalyses = searchParams.get('includeAnalyses') === 'true'
    const weeks = parseInt(searchParams.get('weeks') || '1', 10)
    
    // Calculate date for N weeks ago
    const weeksAgo = new Date()
    weeksAgo.setDate(weeksAgo.getDate() - (weeks * 7))

    const where = { userId: session.user.id }

    // Get total count
    const totalCount = await prisma.journalEntry.count({ where })

    // Get entries from the last N weeks
    const entries = await prisma.journalEntry.findMany({
      where: {
        ...where,
        createdAt: {
          gte: weeksAgo,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: includeAnalyses
        ? {
            partAnalyses: {
              include: {
                part: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                    color: true,
                    icon: true,
                  },
                },
              },
            },
          }
        : undefined,
    })

    return NextResponse.json({ entries, totalCount, weeks })
  } catch (error) {
    console.error('Get entries error:', error)
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
  }
}
