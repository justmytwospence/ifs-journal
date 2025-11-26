/**
 * Part Similarity Detection
 * 
 * Prevents duplicate parts by detecting semantic similarity in names,
 * roles, and descriptions. Uses multiple strategies:
 * 1. Aggressive name normalization (handles hyphens, common words, etc.)
 * 2. Levenshtein distance for fuzzy matching
 * 3. Keyword overlap for description similarity
 * 4. Role matching as a signal
 */

// Common words to strip from part names for normalization
const STRIP_WORDS = [
  // Articles
  'the', 'a', 'an',
  // Common suffixes that indicate the same concept
  'part', 'one', 'self', 'child', 'inner', 'voice', 'side',
  // Synonyms that might appear
  'wounded', 'hurt', 'vulnerable', 'scared', 'frightened',
]

// Synonym groups - any name containing words from the same group should match
const SYNONYM_GROUPS = [
  ['critic', 'judge', 'critical', 'judging', 'judgmental'],
  ['perfectionist', 'achiever', 'striver', 'performer'],
  ['anxious', 'worrier', 'worried', 'anxiety', 'nervous'],
  ['avoider', 'avoidant', 'escape', 'escaper', 'procrastinator'],
  ['pleaser', 'people-pleaser', 'peoplepleaser', 'fixer', 'caretaker'],
  ['wounded', 'hurt', 'vulnerable', 'child', 'inner child', 'exile'],
  ['angry', 'rage', 'furious', 'frustrated'],
  ['lonely', 'abandoned', 'isolated', 'alone'],
  ['hopeful', 'optimist', 'optimistic', 'hope'],
  ['protector', 'guardian', 'defender', 'shield'],
  ['controller', 'manager', 'planner', 'organizer'],
]

/**
 * Aggressively normalize a part name for comparison
 */
export function normalizeName(name: string): string {
  let normalized = name
    .toLowerCase()
    .trim()
    // Replace hyphens and underscores with spaces
    .replace(/[-_]/g, ' ')
    // Remove possessives
    .replace(/'s\b/g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim()

  // Remove common words
  for (const word of STRIP_WORDS) {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'gi'), '').trim()
  }

  // Clean up any double spaces from removals
  normalized = normalized.replace(/\s+/g, ' ').trim()

  return normalized
}

/**
 * Get the canonical synonym for a normalized name
 * Returns the first word in the synonym group, or the original if no match
 */
function getCanonicalSynonym(normalizedName: string): string {
  for (const group of SYNONYM_GROUPS) {
    for (const synonym of group) {
      if (normalizedName.includes(synonym)) {
        return group[0] // Return the first (canonical) word
      }
    }
  }
  return normalizedName
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

/**
 * Calculate name similarity score (0-1)
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeName(name1)
  const n2 = normalizeName(name2)

  // Exact match after normalization
  if (n1 === n2) return 1.0

  // Check synonym groups - if both map to same canonical, it's a match
  const c1 = getCanonicalSynonym(n1)
  const c2 = getCanonicalSynonym(n2)
  if (c1 === c2 && c1 !== n1) return 0.95

  // Check if one name contains the other (high similarity)
  if (n1.includes(n2) || n2.includes(n1)) {
    const shorter = Math.min(n1.length, n2.length)
    const longer = Math.max(n1.length, n2.length)
    return 0.8 + (0.2 * shorter / longer)
  }

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(n1, n2)
  const maxLength = Math.max(n1.length, n2.length)

  // Convert distance to similarity score (0-1)
  return Math.max(0, 1 - distance / maxLength)
}

// Keywords for description similarity
const DESCRIPTION_KEYWORDS = [
  'critic', 'judge', 'perfectionist', 'worrier', 'anxious', 'fear',
  'avoider', 'procrastinator', 'escape', 'hurt', 'abandoned', 'lonely',
  'angry', 'protector', 'guardian', 'shield', 'control', 'plan', 'prevent',
  'distract', 'numb', 'shame', 'vulnerable', 'compassion', 'observer',
  'witness', 'watcher', 'kind', 'gentle', 'caring', 'understanding',
  'achieve', 'succeed', 'perform', 'please', 'fix', 'help', 'save',
  'hide', 'withdraw', 'isolate', 'rage', 'fury', 'frustrat',
]

/**
 * Calculate keyword overlap score for descriptions (0-1)
 */
export function calculateKeywordOverlap(desc1: string, desc2: string): number {
  const d1Lower = desc1.toLowerCase()
  const d2Lower = desc2.toLowerCase()

  let sharedCount = 0
  let totalCount = 0

  for (const keyword of DESCRIPTION_KEYWORDS) {
    const in1 = d1Lower.includes(keyword)
    const in2 = d2Lower.includes(keyword)

    if (in1 || in2) totalCount++
    if (in1 && in2) sharedCount++
  }

  return totalCount > 0 ? sharedCount / totalCount : 0
}

/**
 * Part data for similarity comparison
 */
export interface PartData {
  id?: string
  name: string
  role: string
  description: string
}

/**
 * Find the most similar existing part to a new part
 * Returns the ID of the match if similarity > threshold, otherwise null
 * 
 * @param newPart - The new part to check
 * @param existingParts - List of existing parts to compare against
 * @param threshold - Minimum similarity score to consider a match (default 0.6)
 */
export function findSimilarPart(
  newPart: PartData,
  existingParts: PartData[],
  threshold = 0.6
): string | null {
  let bestMatch: { id: string; score: number } | null = null

  for (const existing of existingParts) {
    if (!existing.id) continue

    // Calculate similarity scores
    const nameScore = calculateNameSimilarity(newPart.name, existing.name)
    const roleMatch = newPart.role === existing.role ? 1.0 : 0.3
    const keywordScore = calculateKeywordOverlap(
      newPart.description,
      existing.description
    )

    // Weighted overall similarity: name (60%), role (20%), keywords (20%)
    // Name is most important - if names match strongly, it's likely a duplicate
    const overallScore = nameScore * 0.6 + roleMatch * 0.2 + keywordScore * 0.2

    // Track best match
    if (overallScore > threshold && (!bestMatch || overallScore > bestMatch.score)) {
      bestMatch = {
        id: existing.id,
        score: overallScore,
      }
      console.log(
        `Similarity match: "${newPart.name}" → "${existing.name}" (score: ${overallScore.toFixed(2)}, ` +
        `name: ${nameScore.toFixed(2)}, role: ${roleMatch.toFixed(2)}, keywords: ${keywordScore.toFixed(2)})`
      )
    }
  }

  return bestMatch?.id || null
}

/**
 * Deduplicate a list of parts by merging similar ones
 * Returns a map from original tempId to canonical tempId
 */
export function deduplicateParts(
  parts: Array<{ tempId: string; name: string; role: string; description: string }>
): Map<string, string> {
  const canonicalMap = new Map<string, string>()
  const canonicalParts: typeof parts = []

  for (const part of parts) {
    // Check if this part is similar to any canonical part we've already seen
    let matchId: string | null = null
    for (const canonical of canonicalParts) {
      const nameScore = calculateNameSimilarity(part.name, canonical.name)
      if (nameScore > 0.7) {
        matchId = canonical.tempId
        console.log(`Dedup: "${part.name}" merged into "${canonical.name}" (score: ${nameScore.toFixed(2)})`)
        break
      }
    }

    if (matchId) {
      // Map this part's tempId to the canonical part's tempId
      canonicalMap.set(part.tempId, matchId)
    } else {
      // This is a new canonical part
      canonicalMap.set(part.tempId, part.tempId)
      canonicalParts.push(part)
    }
  }

  return canonicalMap
}
