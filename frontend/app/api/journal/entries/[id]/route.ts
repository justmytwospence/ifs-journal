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

    const entry = await prisma.journalEntry.findUnique({
      where: {
        id,
        userId: session.user.id,
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
    console.error('Get entry error:', error)
    return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prevent demo users from deleting entries
    const { demoGuard } = await import('@/lib/demo-guard')
    const demoCheck = await demoGuard()
    if (demoCheck) return demoCheck

    const { id } = await params

    // Verify the entry belongs to the user before deleting
    const entry = await prisma.journalEntry.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Delete the entry (cascade will handle partAnalyses)
    await prisma.journalEntry.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete entry error:', error)
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}
