import { NextResponse } from 'next/server'
import { anthropicErrorResponse } from '@/lib/anthropic'
import { auth } from '@/lib/auth'
import { runBatchAnalysis } from '@/lib/batch-analysis'
import prisma from '@/lib/db'
import { demoGuard } from '@/lib/demo-guard'
import { captureException } from '@/lib/logger'
import { DAY_MS, enforceLlmBudget, enforceRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const demoCheck = await demoGuard()
    if (demoCheck) return demoCheck

    const limited = await enforceRateLimit({
      subjectKey: `user:${session.user.id}`,
      bucket: 'analysis:batch',
      limit: 5,
      windowMs: DAY_MS,
    })
    if (limited) return limited

    const overBudget = await enforceLlmBudget(session.user.id)
    if (overBudget) return overBudget

    const { partsCreated, entriesAnalyzed } = await runBatchAnalysis(prisma, session.user.id, {
      signal: request.signal,
    })

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
    captureException(error, { route: 'POST /api/parts/batch-reanalysis' })
    return anthropicErrorResponse(error, 'Failed to reanalyze entries')
  }
}
