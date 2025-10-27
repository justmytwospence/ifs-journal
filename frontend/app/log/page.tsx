'use client'

import { AppNav } from '@/components/AppNav'
import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatEntryDate } from '@/lib/date-utils'
import { createEntrySlug, slugify } from '@/lib/slug-utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
  const queryClient = useQueryClient()
  
  // Persist weeksToLoad in sessionStorage
  const [weeksToLoad, setWeeksToLoad] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('journal-weeks-loaded')
      return saved ? parseInt(saved, 10) : 1
    }
    return 1
  })

  // Save to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('journal-weeks-loaded', weeksToLoad.toString())
    }
  }, [weeksToLoad])

  // Fetch entries
  const { data: entriesData, isLoading: entriesLoading, isFetching: entriesFetching } = useQuery({
    queryKey: ['journal-entries', weeksToLoad],
    queryFn: async () => {
      const response = await fetch(`/api/journal/entries?includeAnalyses=true&weeks=${weeksToLoad}`)
      if (!response.ok) throw new Error('Failed to fetch entries')
      return response.json()
    },
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch when returning to the page
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
  const totalCount: number = entriesData?.totalCount || 0
  const parts: Part[] = Array.isArray(partsData) ? partsData : []

  // Only show loading skeleton on initial load, not when loading more weeks
  const isInitialLoading = (entriesLoading || partsLoading) && entries.length === 0

  // Prefetch individual entries
  useEffect(() => {
    entries.forEach((entry) => {
      const slug = createEntrySlug(entry.createdAt)
      queryClient.prefetchQuery({
        queryKey: ['journal-entry', slug],
        queryFn: async () => {
          const response = await fetch(`/api/journal/entries/by-slug/${slug}`)
          if (!response.ok) throw new Error('Failed to fetch entry')
          const data = await response.json()
          return data.entry
        },
      })
    })
  }, [entries, queryClient])

  // Apply minimum loading time to prevent skeleton flashing only on initial load
  const showLoading = useMinimumLoadingTime(isInitialLoading)

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

  // Helper function to get the start of the week (Sunday) at midnight
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const day = d.getDay()
    const diff = -day // Go back to Sunday
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() + diff)
    return weekStart
  }

  // Helper function to format week range
  const formatWeekRange = (weekStart: Date) => {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    
    const now = new Date()
    const currentYear = now.getFullYear()
    const weekYear = weekStart.getFullYear()
    
    const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' })
    const startDay = weekStart.getDate()
    const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' })
    const endDay = weekEnd.getDate()
    const year = weekYear !== currentYear ? `, ${weekYear}` : ''
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}–${endDay}${year}`
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}${year}`
  }

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

  // Group entries by calendar week
  const entriesByWeek = useMemo(() => {
    const weeks = new Map<string, JournalEntry[]>()
    
    filteredEntries.forEach((entry) => {
      const entryDate = new Date(entry.createdAt)
      const weekStart = getWeekStart(entryDate)
      const weekKey = weekStart.toISOString()
      
      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, [])
      }
      weeks.get(weekKey)!.push(entry)
    })
    
    return Array.from(weeks.entries()).map(([weekKey, entries]) => ({
      weekStart: new Date(weekKey),
      entries,
    }))
  }, [filteredEntries])

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
            {totalCount} {totalCount === 1 ? 'entry' : 'entries'} in your journal
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
        {totalCount === 0 ? (
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
          <>
            <div className="space-y-8">
              {entriesByWeek.map(({ weekStart, entries: weekEntries }, weekIndex) => (
                <div key={weekStart.toISOString()}>
                  {/* Week Divider */}
                  {weekIndex > 0 && (
                    <div className="relative mb-8">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gray-200"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-3 bg-gray-50 text-sm text-gray-500 font-medium">
                          {formatWeekRange(weekStart)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* First week label (no divider above) */}
                  {weekIndex === 0 && (
                    <div className="mb-4 text-center">
                      <span className="text-sm text-gray-500 font-medium">
                        {formatWeekRange(weekStart)}
                      </span>
                    </div>
                  )}

                  {/* Week's entries */}
                  <div className="space-y-4">
                    {weekEntries.map((entry) => (
                      <Link
                        key={entry.id}
                        href={`/log/${createEntrySlug(entry.createdAt)}`}
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
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {entries.length < totalCount && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setWeeksToLoad(prev => prev + 1)}
                  disabled={entriesFetching}
                  className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {entriesFetching ? 'Loading...' : 'Load one more week'}
                </button>
              </div>
            )}
          </>
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
