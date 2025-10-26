import { useQuery } from '@tanstack/react-query'

interface Part {
  id: string
  name: string
  role: string
  color: string
}

interface PartAnalysis {
  id: string
  partId: string
  highlights: string[]
  part: Part
}

interface JournalEntry {
  id: string
  prompt: string
  content: string
  wordCount: number
  analysisStatus: string
  createdAt: string
  partAnalyses?: PartAnalysis[]
}

export function useJournalEntries(includeAnalyses = false) {
  return useQuery({
    queryKey: ['journal-entries', { includeAnalyses }],
    queryFn: async () => {
      const url = includeAnalyses 
        ? '/api/journal/entries?includeAnalyses=true'
        : '/api/journal/entries'
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch entries')
      const data = await response.json()
      return data.entries as JournalEntry[]
    },
  })
}

export function useJournalEntry(dateStr: string) {
  return useQuery({
    queryKey: ['journal-entry', dateStr],
    queryFn: async () => {
      const response = await fetch(`/api/journal/entries/by-date/${dateStr}`)
      if (!response.ok) throw new Error('Failed to fetch entry')
      const data = await response.json()
      return data.entry as JournalEntry
    },
    enabled: !!dateStr,
  })
}
