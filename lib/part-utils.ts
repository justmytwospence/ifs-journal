/**
 * Shared utilities for part-related operations
 * Centralizes quote derivation and activity trend calculation
 */

/**
 * Derive unique quotes from part analyses' highlights
 * @param partAnalyses - Array of analyses with highlights containing exact text
 * @param limit - Maximum number of quotes to return (optional)
 */
export function deriveQuotes(
  partAnalyses: { highlights: { exact: string }[] }[],
  limit?: number
): string[] {
  const quotes = partAnalyses
    .flatMap(a => a.highlights.map(h => h.exact))
    .filter((q, i, arr) => arr.indexOf(q) === i) // Deduplicate
  
  return limit ? quotes.slice(0, limit) : quotes
}

/**
 * Derive quotes with their associated entry information
 * @param partAnalyses - Array of analyses with highlights and entryId
 * @param entryDateMap - Map of entryId to createdAt date
 */
export function deriveQuotesWithEntries(
  partAnalyses: { 
    entryId: string
    highlights: { exact: string; reasoning: string | null }[] 
  }[],
  entryDateMap: Map<string, Date>
): { text: string; reasoning: string | null; entryId: string; entryCreatedAt: Date | undefined }[] {
  return partAnalyses.flatMap(analysis => 
    analysis.highlights.map(highlight => ({
      text: highlight.exact,
      reasoning: highlight.reasoning,
      entryId: analysis.entryId,
      entryCreatedAt: entryDateMap.get(analysis.entryId),
    }))
  )
}

/**
 * Calculate activity trend over last N days
 * Returns an array of daily counts for sparkline visualization
 * 
 * @param dates - Array of dates when activity occurred
 * @param days - Number of days to calculate (default: 30)
 */
export function calculateActivityTrend(dates: Date[], days: number = 30): number[] {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  // Group activity by day
  const activityByDay: Record<string, number> = {}
  dates.forEach(date => {
    if (date >= cutoffDate) {
      const dateKey = date.toISOString().split('T')[0]
      activityByDay[dateKey] = (activityByDay[dateKey] || 0) + 1
    }
  })
  
  // Create array of daily counts for last N days
  const trend: number[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split('T')[0]
    trend.push(activityByDay[dateKey] || 0)
  }
  
  return trend
}

/**
 * Get activity dates from part analyses using entry dates
 * This uses entry.createdAt (not analysis.createdAt) for accurate activity tracking
 * 
 * @param partAnalyses - Array of analyses with entryId
 * @param entryDateMap - Map of entryId to entry createdAt date
 */
export function getActivityDates(
  partAnalyses: { entryId: string }[],
  entryDateMap: Map<string, Date>
): Date[] {
  return partAnalyses
    .map(a => entryDateMap.get(a.entryId))
    .filter((date): date is Date => date !== undefined)
}

/**
 * Transform a Part with analyses into the API response format
 * Centralizes the common transformation logic used across routes
 */
export interface PartWithStats {
  id: string
  name: string
  slug: string
  role: string
  color: string
  icon: string
  description: string
  quotes: string[]
  appearances: number
  activityTrend: number[]
  createdAt: Date
}

export function transformPartWithStats(
  part: {
    id: string
    name: string
    slug: string
    role: string
    color: string
    icon: string
    description: string
    createdAt: Date
    partAnalyses: { 
      id: string
      entryId: string
      highlights: { exact: string }[] 
    }[]
  },
  entryDateMap: Map<string, Date>,
  quoteLimit: number = 5
): PartWithStats {
  const activityDates = getActivityDates(part.partAnalyses, entryDateMap)
  
  return {
    id: part.id,
    name: part.name,
    slug: part.slug,
    role: part.role,
    color: part.color,
    icon: part.icon,
    description: part.description,
    quotes: deriveQuotes(part.partAnalyses, quoteLimit),
    appearances: part.partAnalyses.length,
    activityTrend: calculateActivityTrend(activityDates),
    createdAt: part.createdAt,
  }
}
