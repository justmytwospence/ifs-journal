'use client'

import { Navigation } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/components/ui'
import { useState } from 'react'

export default function ProfilePage() {
  const [email, setEmail] = useState('user@example.com')

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="section-padding">
        <div className="container-width max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="heading-2 mb-2">Profile Settings</h1>
            <p className="body">Manage your account and preferences</p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-sage-700 mb-1">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button variant="primary">Update Email</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-sage-700 mb-1">
                    Current Password
                  </label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-sage-700 mb-1">
                    New Password
                  </label>
                  <Input id="newPassword" type="password" />
                </div>
                <Button variant="primary">Change Password</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="body mb-4">Export all your journal entries and parts data</p>
                  <Button variant="secondary">Export Data</Button>
                </div>
                <div className="pt-4 border-t border-sage-200">
                  <p className="body mb-2 text-red-600 font-medium">Danger Zone</p>
                  <p className="body-small mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <Button variant="ghost" className="text-red-600 hover:bg-red-50">
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
