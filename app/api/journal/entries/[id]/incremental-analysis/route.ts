import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { runIncrementalAnalysis } from '@/lib/incremental-analysis'
import { captureException } from '@/lib/logger'
import { enforceRateLimit, HOUR_MS } from '@/lib/rate-limit'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await enforceRateLimit({
      subjectKey: `user:${session.user.id}`,
      bucket: 'analysis:incremental',
      limit: 20,
      windowMs: HOUR_MS,
    })
    if (limited) return limited

    const { id: entryId } = await params

    const result = await runIncrementalAnalysis({
      entryId,
      userId: session.user.id,
      signal: request.signal,
    })

    if (result.ok === false) {
      if (result.reason === 'not-found') {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, partsFound: result.partsFound })
  } catch (error) {
    captureException(error, { route: 'POST /api/journal/entries/[id]/incremental-analysis' })
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
