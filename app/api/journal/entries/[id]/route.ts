import { NextResponse } from 'next/server'
import { z } from 'zod'
import { computeContentHash } from '@/lib/anchoring/content-hash'
import { reanchorHighlight } from '@/lib/anchoring/match-quote'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'
import { captureException } from '@/lib/logger'

const CONTEXT_LENGTH = 32

const patchSchema = z.object({
  content: z.string().min(1).max(20_000),
  prompt: z.string().max(500).optional(),
})

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    captureException(error, { route: 'GET /api/journal/entries/[id]' })
    return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { demoGuard } = await import('@/lib/demo-guard')
    const demoCheck = await demoGuard()
    if (demoCheck) return demoCheck

    const { id } = await params
    const body = await request.json()
    const { content, prompt } = patchSchema.parse(body)

    const entry = await prisma.journalEntry.findUnique({
      where: { id, userId: session.user.id },
      include: {
        partAnalyses: {
          include: { highlights: true },
        },
      },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const newHash = computeContentHash(content)
    const contentChanged = newHash !== entry.contentHash

    if (!contentChanged) {
      const updated = await prisma.journalEntry.update({
        where: { id },
        data: { prompt: prompt ?? entry.prompt },
        include: {
          partAnalyses: { include: { highlights: true } },
        },
      })
      return NextResponse.json({ entry: updated, reanchoredCount: 0, staleCount: 0 })
    }

    // Re-anchor each highlight against the new content. The update runs in a
    // single transaction — partial updates across dozens of highlights would
    // leave the entry inconsistent if the process dies mid-loop.
    let reanchoredCount = 0
    let staleCount = 0

    const allHighlights = entry.partAnalyses.flatMap((a) => a.highlights)
    const updates = allHighlights.map((h) => {
      const match = reanchorHighlight(content, {
        exact: h.exact,
        prefix: h.prefix,
        suffix: h.suffix,
        startOffset: h.startOffset,
      })
      if (match) {
        reanchoredCount++
        const { startOffset, endOffset } = match
        return {
          id: h.id,
          data: {
            startOffset,
            endOffset,
            exact: content.slice(startOffset, endOffset),
            prefix: content.slice(Math.max(0, startOffset - CONTEXT_LENGTH), startOffset),
            suffix: content.slice(endOffset, Math.min(content.length, endOffset + CONTEXT_LENGTH)),
            isStale: false,
          },
        }
      }
      staleCount++
      return { id: h.id, data: { isStale: true } }
    })

    await prisma.$transaction([
      prisma.journalEntry.update({
        where: { id },
        data: {
          content,
          contentHash: newHash,
          prompt: prompt ?? entry.prompt,
        },
      }),
      ...updates.map((u) => prisma.highlight.update({ where: { id: u.id }, data: u.data })),
    ])

    const refreshed = await prisma.journalEntry.findUnique({
      where: { id },
      include: {
        partAnalyses: { include: { highlights: true } },
      },
    })

    return NextResponse.json({
      entry: refreshed,
      reanchoredCount,
      staleCount,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    captureException(error, { route: 'PATCH /api/journal/entries/[id]' })
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    captureException(error, { route: 'DELETE /api/journal/entries/[id]' })
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}
