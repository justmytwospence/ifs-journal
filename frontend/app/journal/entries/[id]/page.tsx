'use client'

import { AppNav } from '@/components/AppNav'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { slugify } from '@/lib/slug-utils'

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

export default function JournalEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [entryId, setEntryId] = useState<string>('')

  useEffect(() => {
    params.then(p => {
      setEntryId(p.id)
      fetchEntry(p.id)
    })
  }, [params])

  useEffect(() => {
    // Scroll to highlighted quote if hash is present
    if (entry && window.location.hash) {
      const hash = decodeURIComponent(window.location.hash.substring(1))
      if (hash.startsWith('quote-')) {
        const quoteText = hash.substring(6)
        // Give the DOM time to render
        setTimeout(() => {
          const element = document.querySelector(`[data-quote="${quoteText}"]`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // Add a temporary highlight effect
            element.classList.add('ring-4', 'ring-yellow-300')
            setTimeout(() => {
              element.classList.remove('ring-4', 'ring-yellow-300')
            }, 2000)
          }
        }, 100)
      }
    }
  }, [entry])

  const fetchEntry = async (slug: string) => {
    try {
      const response = await fetch(`/api/journal/entries/by-slug/${slug}`)
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

    const highlights: { start: number; end: number; part: Part; text: string }[] = []

    analyses.forEach((analysis) => {
      analysis.highlights.forEach((highlight) => {
        // Try exact match first
        let index = text.indexOf(highlight)
        
        // If no exact match, try case-insensitive
        if (index === -1) {
          const lowerText = text.toLowerCase()
          const lowerHighlight = highlight.toLowerCase()
          index = lowerText.indexOf(lowerHighlight)
          
          // If found with case-insensitive, use the actual text from the entry
          if (index !== -1) {
            const actualText = text.substring(index, index + highlight.length)
            highlights.push({
              start: index,
              end: index + highlight.length,
              part: analysis.part,
              text: actualText,
            })
          }
        } else {
          highlights.push({
            start: index,
            end: index + highlight.length,
            part: analysis.part,
            text: highlight,
          })
        }
      })
    })

    // Remove overlapping highlights (keep the first one)
    const filteredHighlights = highlights.filter((h, i) => {
      for (let j = 0; j < i; j++) {
        const other = highlights[j]
        if (h.start < other.end && h.end > other.start) {
          return false // Overlaps with an earlier highlight
        }
      }
      return true
    })

    filteredHighlights.sort((a, b) => a.start - b.start)

    const parts: React.ReactElement[] = []
    let lastIndex = 0

    filteredHighlights.forEach((highlight, i) => {
      if (highlight.start > lastIndex) {
        parts.push(<span key={`text-${i}`}>{text.slice(lastIndex, highlight.start)}</span>)
      }

      const highlightedText = highlight.text
      
      parts.push(
        <span
          key={`highlight-${i}`}
          className="relative group cursor-pointer rounded px-1 transition-all"
          style={{ backgroundColor: `${highlight.part.color}20` }}
          onClick={() => (window.location.href = `/parts/${slugify(highlight.part.name)}`)}
          data-quote={highlightedText}
        >
          {highlightedText}
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
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
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/log" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            ← Back to Journal Log
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold">
                {new Date(entry.createdAt).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h1>
              <span className="text-sm text-gray-500">{entry.wordCount} words</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-blue-900 mb-1">Prompt:</p>
              <p className="text-blue-700">{entry.prompt}</p>
            </div>

            {/* Parts in this entry - moved above content */}
            {entry.partAnalyses && entry.partAnalyses.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Parts in this entry</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(entry.partAnalyses.map(a => a.part.id))).map(partId => {
                    const part = entry.partAnalyses!.find(a => a.part.id === partId)!.part
                    return (
                      <Link
                        key={part.id}
                        href={`/parts/${slugify(part.name)}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full hover:shadow-md transition-all text-sm font-medium"
                        style={{ 
                          backgroundColor: `${part.color}15`, 
                          borderColor: part.color, 
                          borderWidth: '1.5px',
                          color: part.color
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: part.color }}
                        />
                        {part.name}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="prose max-w-none">
            <div className="font-serif text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">
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
            <div className="mt-6 text-sm text-red-600 italic">Analysis failed</div>
          )}
        </div>
      </main>
    </div>
  )
}
