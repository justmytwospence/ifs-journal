'use client'

import { Navigation } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'

export default function LogPage() {
  // Placeholder data
  const entries = [
    {
      id: '1',
      date: 'Oct 26, 2024',
      content: 'Today I noticed my inner critic being very active. It kept telling me I wasn\'t doing enough...',
      wordCount: 245,
    },
    {
      id: '2',
      date: 'Oct 25, 2024',
      content: 'Feeling more peaceful today. I spent time with my creative part and it felt really good...',
      wordCount: 189,
    },
    {
      id: '3',
      date: 'Oct 24, 2024',
      content: 'Anxiety was high this morning. My protector part was working overtime to keep me safe...',
      wordCount: 312,
    },
  ]

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="section-padding">
        <div className="container-width max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="heading-2 mb-2">Journal Log</h1>
            <p className="body">Review your past entries and track your journaling journey</p>
          </div>

          <div className="space-y-4">
            {entries.map((entry) => (
              <Card key={entry.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{entry.date}</CardTitle>
                    <span className="body-small">{entry.wordCount} words</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="body">{entry.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
