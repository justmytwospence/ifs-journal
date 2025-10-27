'use client'

import { AppNav } from '@/components/AppNav'
import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatEntryDate } from '@/lib/date-utils'
import { createEntrySlug, slugify } from '@/lib/slug-utils'
import { useQuery } from '@tanstack/react-query'
import { LogPageSkeleton } from '@/components/ui/skeleton/LogPageSkeleton'
import { useMinimumLoadingTime } from '@/lib/hooks/useMinimumLoadingTime'

interface Part {
  id: string
  name: string
  role: string
  color: string
  icon?: string
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

function LogPageContent() {
  const searchParams = useSearchParams()
  const partSlugFromUrl = searchParams.get('part')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Fetch entries
  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: async () => {
      const response = await fetch('/api/journal/entries?includeAnalyses=true')
      if (!response.ok) throw new Error('Failed to fetch entries')
      return response.json()
    },
  })

  // Fetch parts for filter
  const { data: partsData, isLoading: partsLoading } = useQuery({
    queryKey: ['parts'],
    queryFn: async () => {
      const response = await fetch('/api/parts')
      if (!response.ok) throw new Error('Failed to fetch parts')
      const data = await response.json()
      return data.parts as Part[]
    },
  })

  const entries: JournalEntry[] = entriesData?.entries || []
  const parts: Part[] = Array.isArray(partsData) ? partsData : []

  const loading = entriesLoading || partsLoading

  // Apply minimum loading time to prevent skeleton flashing
  const showLoading = useMinimumLoadingTime(loading)

  // Handle URL parameter for part filtering
  useEffect(() => {
    // Only run when parts have loaded and we have a URL parameter
    if (!partSlugFromUrl || partsLoading || parts.length === 0) {
      return
    }

    // Find the part by slug
    const part = parts.find(p => slugify(p.name) === partSlugFromUrl)

    if (part) {
      setSelectedPartId(part.id)
    }
  }, [partSlugFromUrl, parts, partsLoading])

  // Filter and search entries
  const filteredEntries = useMemo(() => {
    let filtered = entries

    // Filter by part
    if (selectedPartId) {
      filtered = filtered.filter((entry) =>
        entry.partAnalyses?.some((analysis) => analysis.partId === selectedPartId)
      )
    }

    // Search in content and prompt
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (entry) =>
          entry.content.toLowerCase().includes(query) ||
          entry.prompt.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [entries, selectedPartId, searchQuery])

  // Function to get excerpt with highlighted quote for selected part
  const getEntryExcerpt = (entry: JournalEntry) => {
    if (!selectedPartId || !entry.partAnalyses) {
      return entry.content
    }

    // Find the analysis for the selected part
    const relevantAnalysis = entry.partAnalyses.find(a => a.partId === selectedPartId)
    if (!relevantAnalysis || !relevantAnalysis.highlights.length) {
      return entry.content
    }

    // Get the first highlight
    const highlight = relevantAnalysis.highlights[0]
    const highlightIndex = entry.content.toLowerCase().indexOf(highlight.toLowerCase())

    if (highlightIndex === -1) {
      return entry.content
    }

    // Extract context around the highlight (about 150 chars before and after)
    const contextLength = 150
    const start = Math.max(0, highlightIndex - contextLength)
    const end = Math.min(entry.content.length, highlightIndex + highlight.length + contextLength)

    let excerpt = entry.content.substring(start, end)

    // Add ellipsis if we're not at the start/end
    if (start > 0) excerpt = '...' + excerpt
    if (end < entry.content.length) excerpt = excerpt + '...'

    return excerpt
  }

  // Function to render excerpt with highlighted text
  const renderExcerpt = (entry: JournalEntry) => {
    const excerpt = getEntryExcerpt(entry)

    if (!selectedPartId || !entry.partAnalyses) {
      return <p className="font-serif text-gray-700 line-clamp-3">{excerpt}</p>
    }

    const relevantAnalysis = entry.partAnalyses.find(a => a.partId === selectedPartId)
    if (!relevantAnalysis || !relevantAnalysis.highlights.length) {
      return <p className="font-serif text-gray-700 line-clamp-3">{excerpt}</p>
    }

    const highlight = relevantAnalysis.highlights[0]
    const highlightIndex = excerpt.toLowerCase().indexOf(highlight.toLowerCase())

    if (highlightIndex === -1) {
      return <p className="font-serif text-gray-700 line-clamp-3">{excerpt}</p>
    }

    const before = excerpt.substring(0, highlightIndex)
    const highlighted = excerpt.substring(highlightIndex, highlightIndex + highlight.length)
    const after = excerpt.substring(highlightIndex + highlight.length)

    return (
      <p className="font-serif text-gray-700 line-clamp-3">
        {before}
        <span
          className="font-bold"
          style={{ color: relevantAnalysis.part.color }}
        >
          {highlighted}
        </span>
        {after}
      </p>
    )
  }

  if (showLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <LogPageSkeleton />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-bold">Journal Log</h2>
          <p className="text-gray-600">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} in your journal
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 space-y-4">
          {/* Search Bar and Filter */}
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Bar */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Part Filter Dropdown */}
            {parts.length > 0 && (
              <div className="relative w-full md:w-64">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {selectedPartId ? (
                      <>
                        <span className="text-lg">
                          {parts.find(p => p.id === selectedPartId)?.icon || '●'}
                        </span>
                        <span className="text-gray-900 font-medium">
                          {parts.find(p => p.id === selectedPartId)?.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-700">All Parts</span>
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                      <button
                        onClick={() => {
                          setSelectedPartId(null)
                          setIsDropdownOpen(false)
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${!selectedPartId ? 'bg-indigo-50' : ''
                          }`}
                      >
                        <span className={`font-medium ${!selectedPartId ? 'text-indigo-600' : 'text-gray-700'}`}>
                          All Parts
                        </span>
                      </button>
                      {parts.map((part) => (
                        <button
                          key={part.id}
                          onClick={() => {
                            setSelectedPartId(part.id)
                            setIsDropdownOpen(false)
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${selectedPartId === part.id ? 'bg-gray-50' : ''
                            }`}
                        >
                          <span className="text-lg shrink-0">
                            {part.icon || '●'}
                          </span>
                          <span className="text-gray-900 font-medium">{part.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Active Filters Display */}
          {(searchQuery || selectedPartId) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Showing {filteredEntries.length} of {entries.length} entries</span>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedPartId(null)
                }}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Entries List */}
        {entries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
            <p className="text-gray-600 mb-4">No journal entries yet</p>
            <Link
              href="/journal"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Write your first entry
            </Link>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
            <p className="text-gray-600 mb-2">No entries match your filters</p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedPartId(null)
              }}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <Link
                key={entry.id}
                href={`/journal/entries/${createEntrySlug(entry.createdAt)}`}
                className="block bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-6 border border-gray-100"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {formatEntryDate(entry.createdAt)}
                    </h3>
                    <p className="text-sm text-gray-500 font-semibold">{entry.prompt}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {entry.partAnalyses && entry.partAnalyses.length > 0 && (
                      <div className="flex -space-x-2">
                        {entry.partAnalyses.slice(0, 3).map((analysis) => (
                          <div
                            key={analysis.id}
                            className="w-6 h-6 rounded-full border-2 border-white"
                            style={{ backgroundColor: analysis.part.color }}
                            title={analysis.part.name}
                          />
                        ))}
                        {entry.partAnalyses.length > 3 && (
                          <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                            +{entry.partAnalyses.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {entry.wordCount} words
                    </span>
                  </div>
                </div>
                {renderExcerpt(entry)}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default function LogPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <LogPageSkeleton />
        </main>
      </div>
    }>
      <LogPageContent />
    </Suspense>
  )
}
