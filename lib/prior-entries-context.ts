import prisma from '@/lib/db'

export interface PriorEntriesContextOptions {
  /** How many most-recent entries to include in full (or lightly trimmed). */
  verbatimCount?: number
  /** How many next-older entries to include as a first-sentence summary. */
  summaryCount?: number
  /** Cap on how far back we look when listing older prompts/themes. */
  maxTotalEntries?: number
  /** Max chars of content for the verbatim block per entry. */
  verbatimCharLimit?: number
}

export interface PriorEntriesContext {
  /** Markdown block ready to splice into a system prompt. */
  text: string
  totalEntryCount: number
  hasAny: boolean
}

const DEFAULTS = {
  verbatimCount: 3,
  summaryCount: 7,
  maxTotalEntries: 30,
  verbatimCharLimit: 1200,
}

function firstSentence(content: string, maxLen = 180): string {
  const trimmed = content.trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''
  // Pick the first period/question/exclamation-terminated sentence; fall back
  // to the whole string clipped.
  const match = trimmed.match(/^(.{20,}?[.!?])(\s|$)/)
  const first = match ? match[1] : trimmed
  return first.length > maxLen ? `${first.slice(0, maxLen - 1)}…` : first
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Loads a tapered prior-entries context: recent entries verbatim, middle-aged
 * entries as first-sentence summaries, and a list of older prompts for theme
 * continuity. Both the writing-tips and prompt-generation surfaces share this
 * loader so they see the user's writing in a consistent, exponential-ish
 * weighting (most recent heaviest).
 */
export async function loadPriorEntriesContext(
  userId: string,
  opts: PriorEntriesContextOptions = {}
): Promise<PriorEntriesContext> {
  const verbatimCount = opts.verbatimCount ?? DEFAULTS.verbatimCount
  const summaryCount = opts.summaryCount ?? DEFAULTS.summaryCount
  const maxTotal = opts.maxTotalEntries ?? DEFAULTS.maxTotalEntries
  const charLimit = opts.verbatimCharLimit ?? DEFAULTS.verbatimCharLimit

  const entries = await prisma.journalEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: maxTotal,
    select: { prompt: true, content: true, createdAt: true },
  })

  if (entries.length === 0) {
    return {
      text: "No previous entries. This is the user's first journal entry.",
      totalEntryCount: 0,
      hasAny: false,
    }
  }

  const verbatim = entries.slice(0, verbatimCount)
  const summaries = entries.slice(verbatimCount, verbatimCount + summaryCount)
  const older = entries.slice(verbatimCount + summaryCount)

  const sections: string[] = []

  if (verbatim.length > 0) {
    const block = verbatim
      .map((e, i) => {
        const date = formatDate(e.createdAt)
        const body = e.content.length > charLimit ? `${e.content.slice(0, charLimit)}…` : e.content
        return `### Recent entry ${i + 1} (${date})\n**Prompt:** ${e.prompt}\n**Response:** ${body}`
      })
      .join('\n\n')
    sections.push(`## Most recent entries (weight these most)\n\n${block}`)
  }

  if (summaries.length > 0) {
    const block = summaries
      .map((e) => {
        const date = formatDate(e.createdAt)
        const snippet = firstSentence(e.content)
        return `- (${date}) prompt: "${e.prompt}" — opened with: "${snippet}"`
      })
      .join('\n')
    sections.push(`## Earlier entries (summaries)\n\n${block}`)
  }

  if (older.length > 0) {
    const lines = older.map((e) => `- (${formatDate(e.createdAt)}) ${e.prompt}`).join('\n')
    sections.push(
      `## Older prompts used (for theme continuity — look back here if a recurring thread shows up)\n\n${lines}`
    )
  }

  return {
    text: sections.join('\n\n'),
    totalEntryCount: entries.length,
    hasAny: true,
  }
}
