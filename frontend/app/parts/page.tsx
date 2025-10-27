'use client'

import { useState, useEffect, useRef } from 'react'
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
  const { setAnalyzing } = useAnalysisStore()
  const modalRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    if (showConfirmDialog && modalRef.current) {
      modalRef.current.focus()
    }
  }, [showConfirmDialog])

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
  if (isError && !reanalyzing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <main className="max-w-6xl mx-auto px-4 py-8">
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
      <main className="max-w-6xl mx-auto px-4 py-8">
        {showLoading || reanalyzing ? (
          <>
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">Your Parts</h2>
                <p className="text-gray-600">Discover and understand your internal family system</p>
              </div>
              <button 
                onClick={() => setShowConfirmDialog(true)}
                disabled={true}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                {reanalyzing ? 'Starting Reanalysis...' : 'Reanalyze All Entries'}
              </button>
            </div>
            <PartsPageSkeleton />
            {reanalyzing && (
              <div className="text-center mt-4">
                <p className="text-gray-500">Reanalyzing all journal entries...</p>
                <p className="text-sm text-gray-400 mt-2">This may take a minute</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">Your Parts</h2>
                <p className="text-gray-600">Discover and understand your internal family system</p>
              </div>
              <button 
                onClick={() => setShowConfirmDialog(true)}
                disabled={reanalyzing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                {reanalyzing ? 'Starting Reanalysis...' : 'Reanalyze All Entries'}
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
                      className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-2xl font-bold"
                          style={{ backgroundColor: part.color }}
                        >
                          {getPartIcon(part.icon)}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-1">{part.name}</h3>
                          <span className="text-sm text-gray-500">{part.role}</span>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">{part.description}</p>
                      <div className="text-sm text-gray-500">{part.appearances} appearances</div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div 
          ref={modalRef}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleReanalyze()
            } else if (e.key === 'Escape') {
              setShowConfirmDialog(false)
            }
          }}
          tabIndex={-1}
        >
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Reanalyze All Journal Entries?</h3>
            <p className="text-gray-600 mb-6">
              This will delete all existing parts and reanalyze all your journal entries from scratch. 
              This process may take a few minutes depending on how many entries you have.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition flex items-center gap-2"
              >
                Cancel
                <span className="text-xs opacity-60">Esc</span>
              </button>
              <button
                onClick={handleReanalyze}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
              >
                Continue
                <span className="text-xs opacity-75">↵</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
