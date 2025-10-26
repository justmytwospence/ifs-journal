'use client'

import { Navigation } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent, Button, Textarea } from '@/components/ui'
import { useState } from 'react'

export default function JournalPage() {
  const [content, setContent] = useState('')
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="section-padding">
        <div className="container-width max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Today's Journal Entry</CardTitle>
              <p className="body mt-2">
                <strong>Prompt:</strong> What emotions are you experiencing right now, and which part of you might be feeling them?
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Start writing your thoughts..."
                  rows={12}
                  className="w-full"
                />
                <div className="flex items-center justify-between">
                  <span className="body-small">{wordCount} words</span>
                  <div className="flex gap-2">
                    <Button variant="secondary">New Prompt</Button>
                    <Button variant="primary">Save Entry</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
