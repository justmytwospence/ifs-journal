import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { runBatchAnalysis } from '@/lib/batch-analysis'
import prisma from '@/lib/db'

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { partsCreated, entriesAnalyzed } = await runBatchAnalysis(prisma, session.user.id)

    if (entriesAnalyzed === 0) {
      return NextResponse.json({
        message: 'No journal entries to analyze',
        entriesAnalyzed: 0,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Reanalysis complete: ${partsCreated} parts identified`,
      entriesAnalyzed,
      partsCreated,
    })
  } catch (error) {
    console.error('Reanalyze error:', error)
    return NextResponse.json({ error: 'Failed to reanalyze entries' }, { status: 500 })
  }
}
