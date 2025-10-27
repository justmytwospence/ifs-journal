import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'
import { createEntrySlug } from '@/lib/slug-utils'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slug } = await params
    
    // Get all entries for this user, ordered by date
    const entries = await prisma.journalEntry.findMany({
      where: { 
        userId: session.user.id,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
      },
    })

    // Find the current entry index
    const currentIndex = entries.findIndex(e => createEntrySlug(e.createdAt) === slug)

    if (currentIndex === -1) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Get previous (newer) and next (older) entries
    const previousEntry = currentIndex > 0 ? entries[currentIndex - 1] : null
    const nextEntry = currentIndex < entries.length - 1 ? entries[currentIndex + 1] : null

    return NextResponse.json({ 
      previous: previousEntry ? {
        id: previousEntry.id,
        slug: createEntrySlug(previousEntry.createdAt),
        createdAt: previousEntry.createdAt,
      } : null,
      next: nextEntry ? {
        id: nextEntry.id,
        slug: createEntrySlug(nextEntry.createdAt),
        createdAt: nextEntry.createdAt,
      } : null,
    })
  } catch (error) {
    console.error('Get entry navigation error:', error)
    return NextResponse.json({ error: 'Failed to fetch navigation' }, { status: 500 })
  }
}
