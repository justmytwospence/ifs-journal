'use client'

import { useSession, signOut } from 'next-auth/react'
import { AppNav } from '@/components/AppNav'
import { Toast } from '@/components/ui/Toast'
import { useState } from 'react'

export default function ProfilePage() {
  const { data: session } = useSession()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const handleExportData = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/user/export')
      
      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ifs-journal-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setToast({ message: 'Data exported successfully', type: 'success' })
    } catch (error) {
      console.error('Export error:', error)
      setToast({ message: 'Failed to export data', type: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    setShowDeleteDialog(false)
    setDeleting(true)

    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Delete failed')
      }

      // Sign out and redirect to home
      await signOut({ callbackUrl: '/' })
    } catch (error) {
      console.error('Delete account error:', error)
      setToast({ message: 'Failed to delete account', type: 'error' })
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Profile</h2>
          <p className="text-gray-600">Manage your account settings</p>
        </div>

        <div className="space-y-6">
          {/* Account Info */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-xl font-semibold mb-4">Account Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-700">
                  {session?.user?.email || 'Loading...'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-700">
                  {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-xl font-semibold mb-4">Account Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={handleExportData}
                disabled={exporting}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {exporting ? 'Exporting...' : 'Export My Data'}
              </button>
              <button 
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleting}
                className="w-full px-6 py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-red-600">Delete Account?</h3>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. All your journal entries, parts, and conversations will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
              >
                Delete Forever
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
