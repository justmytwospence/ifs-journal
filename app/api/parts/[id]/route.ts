import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'
import { demoGuard } from '@/lib/demo-guard'
import { captureException } from '@/lib/logger'
import { deriveQuotes } from '@/lib/part-utils'

// Empty strings collapse to null so the UI can "clear" a field by deleting
// its contents and blurring. Short fields cap tighter than notes.
const emptyToNull = (max: number) =>
  z
    .string()
    .max(max)
    .transform((s) => (s.trim() === '' ? null : s.trim()))
    .nullable()
    .optional()

const patchSchema = z
  .object({
    customName: emptyToNull(100),
    ageImpression: emptyToNull(100),
    positiveIntent: emptyToNull(1000),
    fearedOutcome: emptyToNull(1000),
    whatItProtects: emptyToNull(1000),
    userNotes: emptyToNull(5000),
  })
  .strict()

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const part = await prisma.part.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        partAnalyses: {
          select: {
            id: true,
            highlights: {
              select: { exact: true },
            },
          },
        },
      },
    })

    if (!part) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    }

    return NextResponse.json({
      part: {
        id: part.id,
        name: part.name,
        slug: part.slug,
        role: part.role,
        color: part.color,
        description: part.description,
        customName: part.customName,
        ageImpression: part.ageImpression,
        positiveIntent: part.positiveIntent,
        fearedOutcome: part.fearedOutcome,
        whatItProtects: part.whatItProtects,
        userNotes: part.userNotes,
        quotes: deriveQuotes(part.partAnalyses),
        appearances: part.partAnalyses.length,
      },
    })
  } catch (error) {
    captureException(error, { route: 'GET /api/parts/[id]' })
    return NextResponse.json({ error: 'Failed to fetch part' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const demoCheck = await demoGuard()
    if (demoCheck) return demoCheck

    const { id } = await params
    const body = await request.json()
    const data = patchSchema.parse(body)

    const existing = await prisma.part.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    }

    const updated = await prisma.part.update({
      where: { id },
      data,
      select: {
        id: true,
        customName: true,
        ageImpression: true,
        positiveIntent: true,
        fearedOutcome: true,
        whatItProtects: true,
        userNotes: true,
      },
    })

    return NextResponse.json({ part: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    captureException(error, { route: 'PATCH /api/parts/[id]' })
    return NextResponse.json({ error: 'Failed to update part' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const demoCheck = await demoGuard()
    if (demoCheck) return demoCheck

    const { id } = await params

    const part = await prisma.part.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    })

    if (!part) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    }

    // Cascade: PartAnalysis, Highlight, PartConversation are all onDelete: Cascade.
    await prisma.part.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    captureException(error, { route: 'DELETE /api/parts/[id]' })
    return NextResponse.json({ error: 'Failed to delete part' }, { status: 500 })
  }
}
