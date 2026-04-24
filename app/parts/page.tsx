'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AppNav } from '@/components/AppNav'
import { Toast } from '@/components/ui/Toast'
import { PartsTreemap } from '@/components/parts/PartsTreemap'
import { PartsPageSkeleton } from '@/components/ui/skeleton/PartsPageSkeleton'
import { slugify } from '@/lib/slug-utils'
import { getPartIcon } from '@/lib/part-icons'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useMinimumLoadingTime } from '@/lib/hooks/useMinimumLoadingTime'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const { isAnalyzing, analysisType, setAnalyzing } = useAnalysisStore()
  const queryClient = useQueryClient()

  // Fetch parts using React Query
  const { data: partsData, isLoading, isError, error } = useQuery({
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
        setToast({ 
          message: `Reanalysis complete! ${data.partsCreated} parts identified from ${data.entriesAnalyzed} entries.`, 
          type: 'success' 
        })
        // Invalidate all queries that depend on analysis results
        await queryClient.invalidateQueries({ queryKey: ['parts'] })
        await queryClient.invalidateQueries({ queryKey: ['part'] })
        await queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
        await queryClient.invalidateQueries({ queryKey: ['journal-entry'] })
      } else {
        setToast({ 
          message: data.error || 'Failed to reanalyze', 
          type: 'error' 
        })
        // Refetch parts data even on error to restore previous state
        await queryClient.invalidateQueries({ queryKey: ['parts'] })
      }
    } catch (error) {
      console.error('Failed to reanalyze:', error)
      setToast({ 
        message: 'Failed to start reanalysis', 
        type: 'error' 
      })
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
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <main className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">Failed to load parts</p>
            <p className="text-gray-600 mb-4">{error instanceof Error ? error.message : 'An error occurred'}</p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['parts'] })}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
        {showLoading || isBatchAnalyzing ? (
          <>
            <div className="mb-8 flex flex-col min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between gap-4">
              <h2 className="text-3xl font-bold">Your Parts</h2>
              <button 
                onClick={() => setShowConfirmDialog(true)}
                disabled={true}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap w-full min-[420px]:w-auto"
              >
                {isBatchAnalyzing ? 'Reanalyzing...' : 'Reanalyze All Entries'}
              </button>
            </div>
            <PartsPageSkeleton reanalyzing={isBatchAnalyzing} />
          </>
        ) : (
          <>
            <div className="mb-8 flex flex-col min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between gap-4">
              <h2 className="text-3xl font-bold">Your Parts</h2>
              <button 
                onClick={() => setShowConfirmDialog(true)}
                disabled={isBatchAnalyzing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap w-full min-[420px]:w-auto"
              >
                {isBatchAnalyzing ? 'Reanalyzing...' : 'Reanalyze All Entries'}
              </button>
            </div>

            {parts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No parts discovered yet</p>
                <p className="text-sm text-gray-400">Write journal entries to discover your internal parts</p>
              </div>
            ) : (
              <>
                {/* Parts Treemap Visualization */}
                <PartsTreemap parts={parts} />

                {/* Parts Grid */}
                <h3 className="text-lg font-semibold mb-4">All Parts</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {parts.map((part) => (
                    <Link
                      key={part.id}
                      href={`/parts/${slugify(part.name)}`}
                      className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col"
                    >
                      <div className="flex items-start gap-4 mb-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-2xl font-bold shrink-0"
                          style={{ backgroundColor: part.color }}
                        >
                          {getPartIcon(part.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold mb-0.5">{part.name}</h3>
                          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            {part.role}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm flex-1 mb-4">{part.description}</p>
                      <div className="text-sm text-gray-500 pt-3 border-t border-gray-100">
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
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
