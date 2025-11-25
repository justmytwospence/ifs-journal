'use client'

import { AppNav } from '@/components/AppNav'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { createEntrySlug } from '@/lib/slug-utils'
import { getPartIcon } from '@/lib/part-icons'
import { PartDetailSkeleton } from '@/components/ui/skeleton/PartDetailSkeleton'
import { useMinimumLoadingTime } from '@/lib/hooks/useMinimumLoadingTime'

interface QuoteWithEntry {
  text: string
  entryId: string
  entryCreatedAt?: string
}

interface Part {
  id: string
  name: string
  role: string
  color: string
  icon?: string
  description: string
  quotes: string[]
  quotesWithEntries?: QuoteWithEntry[]
  weeklyActivity?: number[]
}

interface ConversationMessage {
  id?: string
  role: 'user' | 'part'
  content: string
  createdAt?: string
}

export default function PartDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [slug, setSlug] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAllQuotes, setShowAllQuotes] = useState(false)
  const conversationEndRef = useRef<HTMLDivElement>(null)

  // Unwrap params
  useEffect(() => {
    params.then(p => setSlug(p.id))
  }, [params])

  // Fetch part details using React Query
  const { data: partData, isLoading: partLoading, isError: partError } = useQuery({
    queryKey: ['part', slug],
    queryFn: async () => {
      if (!slug) throw new Error('No slug provided')
      const response = await fetch(`/api/parts/by-slug/${slug}`)
      if (!response.ok) throw new Error('Failed to fetch part')
      const data = await response.json()
      return data.part as Part
    },
    enabled: !!slug,
    retry: false,
  })

  const part = partData || null

  // Fetch conversation history using React Query
  const { data: conversationData, isLoading: conversationLoading } = useQuery({
    queryKey: ['conversation', part?.id],
    queryFn: async () => {
      if (!part?.id) throw new Error('No part ID')
      const response = await fetch(`/api/conversations/${part.id}`)
      if (!response.ok) throw new Error('Failed to fetch conversations')
      const data = await response.json()

      const messages: ConversationMessage[] = []
      if (data.conversations) {
        data.conversations.forEach((conv: { id: string; userMessage: string; partResponse: string; createdAt: string }) => {
          messages.push({
            id: conv.id,
            role: 'user',
            content: conv.userMessage,
            createdAt: conv.createdAt,
          })
          messages.push({
            id: conv.id,
            role: 'part',
            content: conv.partResponse,
            createdAt: conv.createdAt,
          })
        })
      }
      return messages
    },
    enabled: !!part?.id,
  })

  // Update conversation state when data is fetched
  useEffect(() => {
    if (conversationData) {
      setConversation(conversationData)
    }
  }, [conversationData])

  useEffect(() => {
    // Scroll to bottom when conversation updates
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  const handleSendMessage = async () => {
    if (!message.trim() || !part || sending) return

    const userMessage = message.trim()
    setMessage('')
    setSending(true)
    setError(null)

    // Optimistically add user message
    const newUserMessage: ConversationMessage = {
      role: 'user',
      content: userMessage,
    }
    setConversation(prev => [...prev, newUserMessage])

    // Add empty part message that will be filled with streaming content
    const partMessageIndex = conversation.length + 1
    setConversation(prev => [...prev, { role: 'part', content: '' }])

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partId: part.id,
          message: userMessage,
          conversationHistory: conversation,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let streamedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              break
            }
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                streamedContent += parsed.content
                // Update the part message with streaming content
                setConversation(prev => {
                  const updated = [...prev]
                  updated[partMessageIndex] = {
                    role: 'part',
                    content: streamedContent,
                  }
                  return updated
                })
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setError(error instanceof Error ? error.message : 'Failed to send message')
      // Remove the optimistic messages on error
      setConversation(prev => prev.slice(0, -2))
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const loading = partLoading || conversationLoading

  // Apply minimum loading time to prevent skeleton flashing
  const showLoading = useMinimumLoadingTime(loading)

  if (showLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <main className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="mb-6">
            <Link href="/parts" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              ← Back to Parts
            </Link>
          </div>
          <PartDetailSkeleton />
        </main>
      </div>
    )
  }

  if (partError && !partLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <main className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Part not found</p>
            <Link href="/parts" className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to Parts
            </Link>
          </div>
        </main>
      </div>
    )
  }

  if (!part) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <main className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="mb-6">
            <Link href="/parts" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              ← Back to Parts
            </Link>
          </div>
          <PartDetailSkeleton />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <main className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/parts" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            ← Back to Parts
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href={`/log?part=${slug}`}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm whitespace-nowrap"
            >
              View Related Entries
            </Link>
            <button
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition text-sm whitespace-nowrap"
            >
              Delete Part
            </button>
          </div>
        </div>

        <div>
          {/* Part Header */}
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-6">
            <div className="flex items-start gap-4 mb-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-4xl font-bold shrink-0"
                style={{ backgroundColor: part.color }}
              >
                {getPartIcon(part.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold mb-1">{part.name}</h1>
                <span className="text-sm text-gray-500">{part.role}</span>
              </div>
            </div>
            <p className="text-gray-700 text-lg mb-4">{part.description}</p>
            {/* Activity Sparkline */}
            {part.weeklyActivity && part.weeklyActivity.length > 0 && (
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">Activity (Last 30 days)</span>
                <svg width="150" height="32" className="inline-block">
                  {part.weeklyActivity.map((value, i) => {
                    const max = Math.max(...part.weeklyActivity!, 1)
                    const barHeight = (value / max) * 32
                    const barWidth = 150 / part.weeklyActivity!.length
                    return (
                      <rect
                        key={i}
                        x={i * barWidth}
                        y={32 - barHeight}
                        width={barWidth - 1}
                        height={barHeight}
                        fill={part.color}
                        opacity={0.7}
                        rx={1}
                      />
                    )
                  })}
                </svg>
              </div>
            )}
          </div>

          {/* Key Quotes */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Key Quotes</h2>
              {part.quotesWithEntries && part.quotesWithEntries.length > 3 && (
                <button
                  onClick={() => setShowAllQuotes(!showAllQuotes)}
                  className="text-sm font-medium hover:underline"
                  style={{ color: part.color }}
                >
                  {showAllQuotes ? 'Show less' : `Show all ${part.quotesWithEntries.length}`}
                </button>
              )}
            </div>
            <ul className="space-y-3">
              {part.quotesWithEntries && part.quotesWithEntries.length > 0 ? (
                (showAllQuotes ? part.quotesWithEntries : part.quotesWithEntries.slice(0, 3)).map((quote, i) => (
                  <li key={i}>
                    <Link
                      href={`/log/${quote.entryCreatedAt ? createEntrySlug(quote.entryCreatedAt) : quote.entryId}#quote-${encodeURIComponent(quote.text)}`}
                      className="block text-gray-700 italic border-l-4 pl-4 py-2 hover:bg-gray-50 transition-colors rounded-r"
                      style={{ borderColor: part.color }}
                    >
                      &ldquo;{quote.text}&rdquo;
                    </Link>
                  </li>
                ))
              ) : (
                part.quotes.slice(0, showAllQuotes ? undefined : 3).map((quote, i) => (
                  <li
                    key={i}
                    className="text-gray-700 italic border-l-4 pl-4 py-2"
                    style={{ borderColor: part.color }}
                  >
                    &ldquo;{quote}&rdquo;
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Conversation */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-2">Conversation with {part.name}</h2>
            <p className="text-sm text-gray-600 mb-6">Have a dialogue to understand this part better</p>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-sm text-red-700 underline mt-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {conversation.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">No conversation yet</p>
                  <p className="text-sm">Start by asking this part a question</p>
                </div>
              ) : (
                <>
                  {conversation.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl ${msg.role === 'user'
                        ? 'bg-blue-50 ml-8'
                        : 'bg-gray-50 mr-8'
                        }`}
                    >
                      <p className="text-sm font-medium mb-1 text-gray-700">
                        {msg.role === 'user' ? 'You' : part.name}
                      </p>
                      <p className="text-gray-700">
                        {msg.content || (sending && msg.role === 'part' ? (
                          <span className="text-gray-500 italic">Thinking...</span>
                        ) : '')}
                      </p>
                    </div>
                  ))}
                  <div ref={conversationEndRef} />
                </>
              )}
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={sending}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSendMessage}
                disabled={sending || !message.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
