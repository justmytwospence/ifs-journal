'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AppNav } from '@/components/AppNav'
import { Toast } from '@/components/ui/Toast'
import { PartsTreemap } from '@/components/parts/PartsTreemap'
import { slugify } from '@/lib/slug-utils'
import { getPartIcon } from '@/lib/part-icons'

interface Part {
  id: string
  name: string
  role: string
  color: string
  description: string
  appearances: number
  activityTrend: number[]
}

export default function PartsPage() {
  const [parts, setParts] = useState<Part[]>([])
  const [loading, setLoading] = useState(true)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetchParts()
  }, [])

  const fetchParts = async () => {
    try {
      const response = await fetch('/api/parts')
      const data = await response.json()
      setParts(data.parts || [])
    } catch (error) {
      console.error('Failed to fetch parts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReanalyze = async () => {
    setShowConfirmDialog(false)
    setReanalyzing(true)
    
    try {
      const response = await fetch('/api/parts/batch-reanalysis', {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setToast({ 
          message: `Reanalysis started for ${data.entriesAnalyzed} entries. Check back in a few minutes.`, 
          type: 'success' 
        })
        // Refresh parts after a delay to show new results
        setTimeout(() => {
          fetchParts()
        }, 3000)
      } else {
        setToast({ 
          message: data.error || 'Failed to start reanalysis', 
          type: 'error' 
        })
      }
    } catch (error) {
      console.error('Failed to reanalyze:', error)
      setToast({ 
        message: 'Failed to start reanalysis', 
        type: 'error' 
      })
    } finally {
      setReanalyzing(false)
    }
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Your Parts</h2>
            <p className="text-gray-600">Discover and understand your internal family system</p>
          </div>
          <button 
            onClick={() => setShowConfirmDialog(true)}
            disabled={reanalyzing || loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          >
            {reanalyzing ? 'Starting Reanalysis...' : 'Reanalyze All Entries'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading parts...</div>
        ) : parts.length === 0 ? (
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
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: part.color }}
                    >
                      {getPartIcon(part.role)}
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
      </main>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Reanalyze All Journal Entries?</h3>
            <p className="text-gray-600 mb-6">
              This will delete all existing parts and reanalyze all your journal entries from scratch. 
              This process may take a few minutes depending on how many entries you have.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReanalyze}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Continue
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
