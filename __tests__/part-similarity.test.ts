import { describe, expect, it, vi } from 'vitest'
import { findSimilarPart, normalizeName } from '@/lib/part-similarity'

// Silence console.log from the implementation during tests
vi.spyOn(console, 'log').mockImplementation(() => {})

describe('normalizeName', () => {
  it('strips articles and structural filler', () => {
    expect(normalizeName('The Critic')).toBe('critic')
    expect(normalizeName('A Worrier Part')).toBe('worrier')
    expect(normalizeName('The Inner Voice of Doubt')).toBe('of doubt')
  })

  it('preserves distinctive descriptors', () => {
    // These must stay so the synonym matcher can do its job
    expect(normalizeName('The Wounded Child')).toBe('wounded child')
    expect(normalizeName('The Perfectionist')).toBe('perfectionist')
  })

  it('normalizes punctuation and whitespace', () => {
    expect(normalizeName('People-Pleaser')).toBe('people pleaser')
    expect(normalizeName("Judge's Voice")).toBe('judge')
    expect(normalizeName('  The    Critic  ')).toBe('critic')
  })
})

describe('findSimilarPart', () => {
  const criticManager = {
    id: 'p1',
    name: 'The Critic',
    role: 'Manager',
    description: 'Tracks my mistakes and pushes for perfection.',
  }
  const worrierManager = {
    id: 'p2',
    name: 'The Worrier',
    role: 'Manager',
    description: 'Rehearses worst cases and scans for danger.',
  }
  const lonelyExile = {
    id: 'p3',
    name: 'The Lonely One',
    role: 'Exile',
    description: 'Carries childhood loneliness.',
  }
  const existing = [criticManager, worrierManager, lonelyExile]

  it('matches on synonym + same role', () => {
    // "The Judge" is a synonym of "The Critic" in the SYNONYM_GROUPS list
    const match = findSimilarPart(
      { name: 'The Judge', role: 'Manager', description: 'Judges everything I do.' },
      existing
    )
    expect(match).toBe('p1')
  })

  it('matches abandoned/lonely synonyms even with different names', () => {
    const match = findSimilarPart(
      {
        name: 'The Abandoned One',
        role: 'Exile',
        description: 'Feels abandoned and unseen.',
      },
      existing
    )
    expect(match).toBe('p3')
  })

  it('returns null when nothing crosses the threshold', () => {
    const match = findSimilarPart(
      {
        name: 'The Explorer',
        role: 'Firefighter',
        description: 'Seeks novelty and distraction through travel.',
      },
      existing
    )
    expect(match).toBeNull()
  })

  it('prefers same-role match when names are comparable', () => {
    // "The Critic" matches both criticManager (Manager) and — through shared "critic" token —
    // arguably other parts. Role match (0.3 vs 1.0) should break the tie in Manager's favor.
    const match = findSimilarPart(
      { name: 'The Critic', role: 'Manager', description: 'Critical of everything.' },
      existing
    )
    expect(match).toBe('p1')
  })
})
