'use client'

import { useQuery } from '@tanstack/react-query'
import { signOut, useSession } from 'next-auth/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AppNav } from '@/components/AppNav'

type UserProfile = {
  id: string
  email: string
  emailVerified: boolean
  createdAt: string
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async (): Promise<UserProfile> => {
      const res = await fetch('/api/user/me')
      if (!res.ok) throw new Error('Failed to load profile')
      const data = await res.json()
      return data.user
    },
  })

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

      toast.success('Data exported successfully')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    setShowDeleteDialog(false)
    setDeleting(true)

    try {
      if (!profile?.email) {
        throw new Error('Profile not loaded')
      }
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: `DELETE ${profile.email}` }),
      })

      if (!response.ok) {
        throw new Error('Delete failed')
      }

      await signOut({ callbackUrl: '/' })
    } catch (error) {
      console.error('Delete account error:', error)
      toast.error('Failed to delete account')
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="mb-8">
          <h2 className="font-heading text-3xl tracking-tight text-foreground mb-2">Profile</h2>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>

        <div className="space-y-6">
          {/* Account Info */}
          <div className="bg-card rounded-2xl ring-1 ring-foreground/10 p-6">
            <h3 className="font-heading text-xl text-foreground mb-4">Account information</h3>
            <div className="space-y-4">
              <div>
                <div className="block text-sm font-medium text-foreground mb-1">Email</div>
                <div className="px-4 py-3 bg-muted rounded-xl text-foreground">
                  {session?.user?.email || 'Loading…'}
                </div>
              </div>
              <div>
                <div className="block text-sm font-medium text-foreground mb-1">Member since</div>
                <div className="px-4 py-3 bg-muted rounded-xl text-foreground">
                  {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString()
                    : 'Loading…'}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card rounded-2xl ring-1 ring-foreground/10 p-6">
            <h3 className="font-heading text-xl text-foreground mb-4">Account actions</h3>
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleExportData}
                disabled={exporting}
                className="w-full px-6 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-accent transition text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {exporting ? 'Exporting…' : 'Export my data'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleting}
                className="w-full px-6 py-3 bg-destructive/10 text-destructive rounded-xl font-medium hover:bg-destructive/15 transition text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {deleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-foreground/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl ring-1 ring-foreground/10 p-8 max-w-md w-full">
            <h3 className="font-heading text-xl text-destructive mb-4">Delete account?</h3>
            <p className="text-muted-foreground mb-6">
              This action cannot be undone. All your journal entries, parts, and conversations will
              be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteDialog(false)}
                className="px-6 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-accent transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-6 py-2 bg-destructive text-white rounded-lg font-medium hover:bg-destructive/90 transition"
              >
                Delete forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
