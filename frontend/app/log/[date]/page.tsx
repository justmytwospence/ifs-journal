'use client'

import { AppNav } from '@/components/AppNav'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatEntryDate } from '@/lib/date-utils'

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

export default function JournalEntryPage({ params }: { params: Promise<{ date: string }> }) {
  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateParam, setDateParam] = useState<string>('')

  useEffect(() => {
    params.then(p => {
      setDateParam(p.date)
      fetchEntryByDate(p.date)
    })
  }, [params])

  const fetchEntryByDate = async (dateStr: string) => {
    try {
      // Parse the date format: 2025-10-26-14-30-45
      const response = await fetch(`/api/journal/entries/by-date/${dateStr}`)
      const data = await response.json()
      setEntry(data.entry)
    } catch (error) {
      console.error('Failed to fetch entry:', error)
    } finally {
      setLoading(false)
    }
  }

  const highlightText = (text: string, analyses: PartAnalysis[] = []) => {
    if (!analyses || analyses.length === 0) return text

    const highlights: { start: number; end: number; part: Part }[] = []

    analyses.forEach((analysis) => {
      analysis.highlights.forEach((highlight) => {
        const index = text.indexOf(highlight)
        if (index !== -1) {
          highlights.push({
            start: index,
            end: index + highlight.length,
            part: analysis.part,
          })
        }
      })
    })

    highlights.sort((a, b) => a.start - b.start)

    const parts: React.ReactElement[] = []
    let lastIndex = 0

    highlights.forEach((highlight, i) => {
      if (highlight.start > lastIndex) {
        parts.push(<span key={`text-${i}`}>{text.slice(lastIndex, highlight.start)}</span>)
      }

      parts.push(
        <span
          key={`highlight-${i}`}
          className="relative group cursor-pointer rounded px-1"
          style={{ backgroundColor: `${highlight.part.color}20` }}
          onClick={() => (window.location.href = `/parts/${highlight.part.id}`)}
        >
          {text.slice(highlight.start, highlight.end)}
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {highlight.part.name}
          </span>
        </span>
      )

      lastIndex = highlight.end
    })

    if (lastIndex < text.length) {
      parts.push(<span key="text-end">{text.slice(lastIndex)}</span>)
    }

    return <>{parts}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center py-12 text-gray-500">Loading entry...</div>
        </main>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Entry not found</p>
            <Link href="/log" className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to Journal Log
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/log" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            ← Back to Journal Log
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold">
                {formatEntryDate(entry.createdAt)}
              </h1>
              <span className="text-sm text-gray-500">{entry.wordCount} words</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-medium text-blue-900 mb-1">Prompt:</p>
              <p className="text-blue-700">{entry.prompt}</p>
            </div>
          </div>

          <div className="prose max-w-none">
            <div className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">
              {entry.analysisStatus === 'completed' && entry.partAnalyses
                ? highlightText(entry.content, entry.partAnalyses)
                : entry.content}
            </div>
          </div>

          {entry.analysisStatus === 'pending' && (
            <div className="mt-6 text-sm text-gray-500 italic">Analysis pending...</div>
          )}
          {entry.analysisStatus === 'processing' && (
            <div className="mt-6 text-sm text-blue-600 italic">Analyzing parts...</div>
          )}
          {entry.analysisStatus === 'failed' && (
            <div className="mt-6 flex items-center gap-2">
              <span className="text-sm text-red-600 italic">Analysis failed</span>
              <button
                onClick={async () => {
                  try {
                    await fetch(`/api/journal/entries/${entry.id}/analyze`, {
                      method: 'POST',
                    })
                    fetchEntryByDate(dateParam)
                  } catch (error) {
                    console.error('Failed to retry analysis:', error)
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Retry
              </button>
            </div>
          )}

          {entry.partAnalyses && entry.partAnalyses.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold mb-4">Parts in this entry</h2>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(entry.partAnalyses.map(a => a.part.id))).map(partId => {
                  const part = entry.partAnalyses!.find(a => a.part.id === partId)!.part
                  return (
                    <Link
                      key={part.id}
                      href={`/parts/${part.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:shadow-md transition-shadow"
                      style={{ backgroundColor: `${part.color}20`, borderColor: part.color, borderWidth: '1px' }}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: part.color }}
                      />
                      <span className="text-sm font-medium" style={{ color: part.color }}>
                        {part.name}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
