import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { captureException } from '@/lib/logger'
import { generatePromptForUser } from '@/lib/prompts/generate-for-user'
import { enforceLlmBudget, enforceRateLimit, HOUR_MS } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await enforceRateLimit({
      subjectKey: `user:${session.user.id}`,
      bucket: 'prompts:generate',
      limit: 30,
      windowMs: HOUR_MS,
    })
    if (limited) return limited

    const overBudget = await enforceLlmBudget(session.user.id)
    if (overBudget) return overBudget

    // Body is optional; legacy callers send no body. New callers may include
    // `{ rejectedPrompts: string[] }` to signal "I just refreshed past these,
    // give me something materially different."
    let rejectedPrompts: string[] = []
    try {
      const body = await request.json()
      if (Array.isArray(body?.rejectedPrompts)) {
        rejectedPrompts = body.rejectedPrompts.filter(
          (p: unknown): p is string => typeof p === 'string' && p.trim().length > 0
        )
      }
    } catch {
      // No body or invalid JSON — treat as no rejections.
    }

    const prompt = await generatePromptForUser({
      userId: session.user.id,
      rejectedPrompts,
    })

    return NextResponse.json({ prompt })
  } catch (error) {
    captureException(error, { route: 'POST /api/prompts/generate' })
    return NextResponse.json(
      {
        error: 'Failed to generate prompt',
        fallback: "What's something that's sitting with you today?",
      },
      { status: 500 }
    )
  }
}
