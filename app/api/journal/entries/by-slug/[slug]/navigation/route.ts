import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slug } = await params

    // Get current entry to find its position
    const currentEntry = await prisma.journalEntry.findUnique({
      where: {
        userId_slug: {
          userId: session.user.id,
          slug,
        },
      },
      select: { id: true, createdAt: true },
    })

    if (!currentEntry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Get previous (older) entry
    const previousEntry = await prisma.journalEntry.findFirst({
      where: {
        userId: session.user.id,
        createdAt: { lt: currentEntry.createdAt },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, slug: true, createdAt: true, prompt: true },
    })

    // Get next (newer) entry
    const nextEntry = await prisma.journalEntry.findFirst({
      where: {
        userId: session.user.id,
        createdAt: { gt: currentEntry.createdAt },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, slug: true, createdAt: true, prompt: true },
    })

    return NextResponse.json({
      previous: previousEntry
        ? {
            id: previousEntry.id,
            slug: previousEntry.slug,
            createdAt: previousEntry.createdAt,
            prompt: previousEntry.prompt,
          }
        : null,
      next: nextEntry
        ? {
            id: nextEntry.id,
            slug: nextEntry.slug,
            createdAt: nextEntry.createdAt,
            prompt: nextEntry.prompt,
          }
        : null,
    })
  } catch (error) {
    console.error('Get entry navigation error:', error)
    return NextResponse.json({ error: 'Failed to fetch navigation' }, { status: 500 })
  }
}
