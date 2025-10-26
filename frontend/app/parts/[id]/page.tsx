'use client'

import { Navigation } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/components/ui'
import { useState } from 'react'

export default function PartDetailPage({ params }: { params: { id: string } }) {
  const [message, setMessage] = useState('')

  // Placeholder data
  const part = {
    id: params.id,
    name: 'The Critic',
    role: 'Manager',
    color: '#f59e0b',
    description: 'Keeps me on track by pointing out mistakes',
    quotes: [
      "You're not doing enough",
      'You should be working harder',
      'Everyone else is ahead of you',
    ],
  }

  const conversation = [
    { role: 'user', content: 'Why are you so hard on me?' },
    { role: 'part', content: "I'm trying to keep you safe from failure and disappointment." },
  ]

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="section-padding">
        <div className="container-width max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-full" style={{ backgroundColor: part.color }} />
              <h1 className="heading-2">{part.name}</h1>
            </div>
            <p className="body-large mb-2">{part.description}</p>
            <span className="body-small text-sage-600">{part.role}</span>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Key Quotes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {part.quotes.map((quote, i) => (
                    <li key={i} className="body italic border-l-4 pl-3" style={{ borderColor: part.color }}>
                      "{quote}"
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="secondary" className="w-full">
                  View Related Entries
                </Button>
                <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50">
                  Delete Part
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Conversation with {part.name}</CardTitle>
              <p className="body-small mt-2">Have a dialogue to understand this part better</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                {conversation.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-lg ${
                      msg.role === 'user' ? 'bg-primary-50 ml-8' : 'bg-sage-50 mr-8'
                    }`}
                  >
                    <p className="body-small font-medium mb-1">
                      {msg.role === 'user' ? 'You' : part.name}
                    </p>
                    <p className="body">{msg.content}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1"
                />
                <Button variant="primary">Send</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
