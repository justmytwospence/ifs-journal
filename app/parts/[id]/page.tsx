'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AppNav } from '@/components/AppNav'
import { GettingToKnowPanel } from '@/components/parts/GettingToKnowPanel'
import { PartActivityCalendar } from '@/components/parts/PartActivityCalendar'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { PartDetailSkeleton } from '@/components/ui/skeleton/PartDetailSkeleton'
import { useMinimumLoadingTime } from '@/lib/hooks/useMinimumLoadingTime'
import { getPartIcon } from '@/lib/part-icons'
import { createEntrySlug } from '@/lib/slug-utils'

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
  customName?: string | null
  ageImpression?: string | null
  positiveIntent?: string | null
  fearedOutcome?: string | null
  whatItProtects?: string | null
  userNotes?: string | null
}

interface ConversationMessage {
  id?: string
  role: 'user' | 'part'
  content: string
  createdAt?: string
}

export default function PartDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [slug, setSlug] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAllQuotes, setShowAllQuotes] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const conversationEndRef = useRef<HTMLDivElement>(null)

  // Unwrap params
  useEffect(() => {
    params.then((p) => setSlug(p.id))
  }, [params])

  // Fetch part details using React Query
  const {
    data: partData,
    isLoading: partLoading,
    isError: partError,
  } = useQuery({
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
        data.conversations.forEach(
          (conv: { id: string; userMessage: string; partResponse: string; createdAt: string }) => {
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
          }
        )
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
  }, [])

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
    setConversation((prev) => [...prev, newUserMessage])

    // Add empty part message that will be filled with streaming content
    const partMessageIndex = conversation.length + 1
    setConversation((prev) => [...prev, { role: 'part', content: '' }])

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
                setConversation((prev) => {
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
      setConversation((prev) => prev.slice(0, -2))
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

  const handleDeletePart = async () => {
    if (!part || deleting) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/parts/${part.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Could not delete part.')
        return
      }
      toast.success(`Deleted "${part.customName?.trim() || part.name}".`)
      router.push('/parts')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const loading = partLoading || conversationLoading

  // Apply minimum loading time to prevent skeleton flashing
  const showLoading = useMinimumLoadingTime(loading)

  if (showLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppNav />
        <main className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="mb-6">
            <Link href="/parts" className="text-primary hover:text-primary/80 font-medium text-sm">
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
      <div className="min-h-screen bg-background">
        <AppNav />
        <main className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Part not found</p>
            <Link href="/parts" className="text-primary hover:text-primary/80 font-medium">
              ← Back to Parts
            </Link>
          </div>
        </main>
      </div>
    )
  }

  if (!part) {
    return (
      <div className="min-h-screen bg-background">
        <AppNav />
        <main className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="mb-6">
            <Link href="/parts" className="text-primary hover:text-primary/80 font-medium text-sm">
              ← Back to Parts
            </Link>
          </div>
          <PartDetailSkeleton />
        </main>
      </div>
    )
  }

  const displayName = part.customName?.trim() || part.name
  const originalName =
    part.customName?.trim() && part.customName.trim() !== part.name ? part.name : null

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      <main className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/parts" className="text-primary hover:text-primary/80 font-medium text-sm">
            ← Back to Parts
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href={`/log?part=${slug}`}
              className="px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-accent transition text-sm whitespace-nowrap"
            >
              View related entries
            </Link>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-destructive/10 text-destructive rounded-lg font-medium hover:bg-destructive/15 transition text-sm whitespace-nowrap"
            >
              Delete part
            </button>
          </div>
        </div>

        <div>
          {/* Part Header */}
          <div className="bg-card rounded-2xl ring-1 ring-foreground/10 p-8 mb-6">
            <div className="flex items-start gap-4 mb-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-4xl font-bold shrink-0"
                style={{ backgroundColor: part.color }}
              >
                {getPartIcon(part.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-heading text-3xl tracking-tight text-foreground mb-1">
                  {displayName}
                </h1>
                <span className="text-sm text-muted-foreground">
                  {part.role}
                  {originalName && (
                    <>
                      {' '}
                      · originally <em>{originalName}</em>
                    </>
                  )}
                </span>
              </div>
            </div>
            <p className="text-foreground text-lg mb-4">{part.description}</p>
            {part.weeklyActivity && part.weeklyActivity.length > 0 && (
              <PartActivityCalendar trend={part.weeklyActivity} color={part.color} />
            )}
          </div>

          <GettingToKnowPanel
            partId={part.id}
            partSlug={slug || ''}
            initial={{
              customName: part.customName ?? null,
              ageImpression: part.ageImpression ?? null,
              positiveIntent: part.positiveIntent ?? null,
              fearedOutcome: part.fearedOutcome ?? null,
              whatItProtects: part.whatItProtects ?? null,
              userNotes: part.userNotes ?? null,
            }}
          />

          {/* Key Quotes */}
          <div className="bg-card rounded-2xl ring-1 ring-foreground/10 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl text-foreground">Key quotes</h2>
              {part.quotesWithEntries && part.quotesWithEntries.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllQuotes(!showAllQuotes)}
                  className="text-sm font-medium hover:underline"
                  style={{ color: part.color }}
                >
                  {showAllQuotes ? 'Show less' : `Show all ${part.quotesWithEntries.length}`}
                </button>
              )}
            </div>
            <ul className="space-y-3">
              {part.quotesWithEntries && part.quotesWithEntries.length > 0
                ? (showAllQuotes ? part.quotesWithEntries : part.quotesWithEntries.slice(0, 3)).map(
                    (quote) => (
                      <li key={`${quote.entryId}-${quote.text}`}>
                        <Link
                          href={`/log/${quote.entryCreatedAt ? createEntrySlug(quote.entryCreatedAt) : quote.entryId}#quote-${encodeURIComponent(quote.text)}`}
                          className="block text-foreground italic border-l-4 pl-4 py-2 hover:bg-muted transition-colors rounded-r"
                          style={{ borderColor: part.color }}
                        >
                          &ldquo;{quote.text}&rdquo;
                        </Link>
                      </li>
                    )
                  )
                : part.quotes.slice(0, showAllQuotes ? undefined : 3).map((quote) => (
                    <li
                      key={quote}
                      className="text-foreground italic border-l-4 pl-4 py-2"
                      style={{ borderColor: part.color }}
                    >
                      &ldquo;{quote}&rdquo;
                    </li>
                  ))}
            </ul>
          </div>

          {/* Conversation */}
          <div className="bg-card rounded-2xl ring-1 ring-foreground/10 p-6">
            <h2 className="font-heading text-xl text-foreground mb-2">
              Conversation with {displayName}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Have a dialogue to understand this part better
            </p>

            {error && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                <p className="text-sm text-destructive">{error}</p>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-sm text-destructive underline mt-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {conversation.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-2">No conversation yet</p>
                  <p className="text-sm">Start by asking this part a question</p>
                </div>
              ) : (
                <>
                  {conversation.map((msg, i) => (
                    <div
                      key={msg.id ?? `${msg.role}-${i}-${msg.content.slice(0, 20)}`}
                      className={`p-4 rounded-xl ${
                        msg.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'
                      }`}
                    >
                      <p className="text-sm font-medium mb-1 text-foreground">
                        {msg.role === 'user' ? 'You' : displayName}
                      </p>
                      <p className="text-foreground">
                        {msg.content ||
                          (sending && msg.role === 'part' ? (
                            <span className="text-muted-foreground italic">Thinking...</span>
                          ) : (
                            ''
                          ))}
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
                placeholder="Type your message…"
                disabled={sending}
                className="flex-1 px-4 py-3 border border-input rounded-xl focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none disabled:bg-muted disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={sending || !message.trim()}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </main>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeletePart}
        title={`Delete "${displayName}"?`}
        message="This removes the part, its highlighted passages, and your conversations with it. Your journal entries are not affected. This cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={deleting}
      />
    </div>
  )
}
