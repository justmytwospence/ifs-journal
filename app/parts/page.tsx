'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AppNav } from '@/components/AppNav'
import { PartsTimeline } from '@/components/parts/PartsTimeline'
import { PartsTreemap } from '@/components/parts/PartsTreemap'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { PartsPageSkeleton } from '@/components/ui/skeleton/PartsPageSkeleton'
import { useMinimumLoadingTime } from '@/lib/hooks/useMinimumLoadingTime'
import { getPartIcon } from '@/lib/part-icons'
import { slugify } from '@/lib/slug-utils'
import { useAnalysisStore } from '@/lib/stores/analysis-store'

interface Part {
  id: string
  name: string
  role: string
  color: string
  icon?: string
  description: string
  appearances: number
  activityTrend: number[]
}

export default function PartsPage() {
  const [reanalyzing, setReanalyzing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const { isAnalyzing, analysisType, setAnalyzing } = useAnalysisStore()
  const queryClient = useQueryClient()

  // Fetch parts using React Query
  const {
    data: partsData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['parts'],
    queryFn: async () => {
      const response = await fetch('/api/parts')
      if (!response.ok) throw new Error('Failed to fetch parts')
      const data = await response.json()
      return data.parts as Part[]
    },
  })

  const parts = Array.isArray(partsData) ? partsData : []

  // Apply minimum loading time to prevent skeleton flashing
  const showLoading = useMinimumLoadingTime(isLoading)

  // Check if we're doing a batch reanalysis (either local state or global state)
  const isBatchAnalyzing = reanalyzing || (isAnalyzing && analysisType === 'batch')

  // Prefetch individual part pages
  useEffect(() => {
    parts.forEach((part) => {
      const slug = slugify(part.name)
      queryClient.prefetchQuery({
        queryKey: ['part', slug],
        queryFn: async () => {
          const response = await fetch(`/api/parts/by-slug/${slug}`)
          if (!response.ok) throw new Error('Failed to fetch part')
          const data = await response.json()
          return data.part
        },
      })
    })
  }, [parts, queryClient])

  const handleReanalyze = async () => {
    setShowConfirmDialog(false)
    setReanalyzing(true)
    setAnalyzing(true, 'batch')

    // Invalidate the parts query to show loading state
    queryClient.invalidateQueries({ queryKey: ['parts'] })

    try {
      const response = await fetch('/api/parts/batch-reanalysis', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(
          `Reanalysis complete! ${data.partsCreated} parts identified from ${data.entriesAnalyzed} entries.`
        )
        // Invalidate all queries that depend on analysis results
        await queryClient.invalidateQueries({ queryKey: ['parts'] })
        await queryClient.invalidateQueries({ queryKey: ['part'] })
        await queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
        await queryClient.invalidateQueries({ queryKey: ['journal-entry'] })
      } else {
        toast.error(data.error || 'Failed to reanalyze')
        // Refetch parts data even on error to restore previous state
        await queryClient.invalidateQueries({ queryKey: ['parts'] })
      }
    } catch (error) {
      console.error('Failed to reanalyze:', error)
      toast.error('Failed to start reanalysis')
      // Refetch parts data even on error to restore previous state
      await queryClient.invalidateQueries({ queryKey: ['parts'] })
    } finally {
      setReanalyzing(false)
      setAnalyzing(false)
    }
  }
  // Show error state without skeleton
  if (isError && !isBatchAnalyzing) {
    return (
      <div className="min-h-screen bg-background">
        <AppNav />
        <main className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="text-center py-12">
            <p className="text-destructive mb-4">Failed to load parts</p>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
            <button
              type="button"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['parts'] })}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
            >
              Try again
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
        {showLoading || isBatchAnalyzing ? (
          <>
            <div className="mb-8 flex flex-col min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between gap-4">
              <h2 className="font-heading text-3xl tracking-tight text-foreground">Your parts</h2>
              <button
                type="button"
                onClick={() => setShowConfirmDialog(true)}
                disabled={true}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap w-full min-[420px]:w-auto"
              >
                {isBatchAnalyzing ? 'Reanalyzing...' : 'Reanalyze All Entries'}
              </button>
            </div>
            <PartsPageSkeleton reanalyzing={isBatchAnalyzing} />
          </>
        ) : (
          <>
            <div className="mb-8 flex flex-col min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between gap-4">
              <h2 className="font-heading text-3xl tracking-tight text-foreground">Your parts</h2>
              <button
                type="button"
                onClick={() => setShowConfirmDialog(true)}
                disabled={isBatchAnalyzing}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap w-full min-[420px]:w-auto"
              >
                {isBatchAnalyzing ? 'Reanalyzing...' : 'Reanalyze All Entries'}
              </button>
            </div>

            {parts.length === 0 ? (
              <div className="max-w-xl mx-auto text-center py-12 space-y-6">
                <div className="bg-card rounded-2xl ring-1 ring-foreground/10 p-6 text-left space-y-3">
                  <h3 className="font-heading text-lg text-foreground">How parts get here</h3>
                  <p className="text-sm text-muted-foreground">
                    IFS treats the mind as a system of "parts" — Managers that plan, Firefighters
                    that distract from pain, Protectors that guard you, and Exiles that carry old
                    wounds. When you write a journal entry, Claude reads it and identifies parts
                    with direct quotes from your own words.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Write your first entry to see this page come alive.
                  </p>
                </div>
                <Link
                  href="/journal"
                  className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition"
                >
                  Write your first entry
                </Link>
              </div>
            ) : (
              <>
                {/* Parts Treemap Visualization */}
                <PartsTreemap parts={parts} />

                {/* Activity Timeline */}
                <PartsTimeline parts={parts} />

                {/* Parts Grid */}
                <h3 className="font-heading text-lg text-foreground mb-4">All parts</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {parts.map((part) => (
                    <Link
                      key={part.id}
                      href={`/parts/${slugify(part.name)}`}
                      className="bg-card rounded-2xl ring-1 ring-foreground/10 hover:ring-foreground/20 p-6 transition-all flex flex-col"
                    >
                      <div className="flex items-start gap-4 mb-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-2xl font-bold shrink-0"
                          style={{ backgroundColor: part.color }}
                        >
                          {getPartIcon(part.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading text-lg text-foreground mb-0.5">
                            {part.name}
                          </h3>
                          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                            {part.role}
                          </span>
                        </div>
                      </div>
                      <p className="text-muted-foreground text-sm flex-1 mb-4">
                        {part.description}
                      </p>
                      <div className="text-sm text-muted-foreground pt-3 border-t border-border">
                        {part.appearances} {part.appearances === 1 ? 'appearance' : 'appearances'}
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleReanalyze}
        title="Reanalyze All Journal Entries?"
        message="This will delete all existing parts and reanalyze all your journal entries from scratch. This process may take a few minutes depending on how many entries you have."
        confirmText="Continue"
        isLoading={reanalyzing}
      />

      {/* Toast Notification */}
    </div>
  )
}
