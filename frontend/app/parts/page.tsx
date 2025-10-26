'use client'

import { Navigation } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui'
import Link from 'next/link'

export default function PartsPage() {
  // Placeholder data
  const parts = [
    {
      id: '1',
      name: 'The Critic',
      role: 'Manager',
      color: '#f59e0b',
      description: 'Keeps me on track by pointing out mistakes',
      appearances: 12,
    },
    {
      id: '2',
      name: 'The Protector',
      role: 'Protector',
      color: '#ef4444',
      description: 'Guards against vulnerability and emotional pain',
      appearances: 8,
    },
    {
      id: '3',
      name: 'The Anxious One',
      role: 'Firefighter',
      color: '#f97316',
      description: 'Responds to overwhelming feelings with distraction',
      appearances: 15,
    },
    {
      id: '4',
      name: 'The Wounded Child',
      role: 'Exile',
      color: '#8b5cf6',
      description: 'Carries old hurts and needs comfort',
      appearances: 5,
    },
  ]

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="section-padding">
        <div className="container-width">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="heading-2 mb-2">Your Parts</h1>
              <p className="body">Discover and understand your internal family system</p>
            </div>
            <Button variant="secondary">Reanalyze All Parts</Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parts.map((part) => (
              <Link key={part.id} href={`/parts/${part.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: part.color }}
                      />
                      <CardTitle className="text-lg">{part.name}</CardTitle>
                    </div>
                    <span className="body-small text-sage-600">{part.role}</span>
                  </CardHeader>
                  <CardContent>
                    <p className="body mb-4">{part.description}</p>
                    <p className="body-small text-sage-500">{part.appearances} appearances</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
