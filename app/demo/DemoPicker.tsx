'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export interface PickerPersona {
  slug: string
  name: string
  oneLineDescription: string
  emoji?: string
}

export function DemoPicker({ personas }: { personas: PickerPersona[] }) {
  const router = useRouter()
  const [pendingSlug, setPendingSlug] = useState<string | null>(null)
  const [error, setError] = useState(false)

  async function pick(slug: string) {
    setError(false)
    setPendingSlug(slug)
    try {
      const res = await fetch('/api/auth/demo-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: slug }),
      })
      if (!res.ok) {
        setError(true)
        setPendingSlug(null)
        return
      }
      router.push('/log')
      router.refresh()
    } catch {
      setError(true)
      setPendingSlug(null)
    }
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground mb-6">
          Demo sign-in failed. Try a different persona, or come back later.
        </p>
        <Button size="lg" render={<Link href="/" />}>
          Back to home
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {personas.map((persona) => {
        const pending = pendingSlug === persona.slug
        const disabled = pendingSlug !== null
        return (
          <Card
            key={persona.slug}
            className="cursor-pointer transition-colors hover:bg-muted/30 aria-disabled:opacity-50 aria-disabled:cursor-default"
            aria-disabled={disabled || undefined}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {persona.emoji && (
                  <span aria-hidden="true" className="text-xl">
                    {persona.emoji}
                  </span>
                )}
                {persona.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-muted-foreground">{persona.oneLineDescription}</p>
              <Button
                disabled={disabled}
                onClick={() => pick(persona.slug)}
                aria-label={`Sign in as ${persona.name}`}
              >
                {pending ? 'Loading…' : `Sign in as ${persona.name}`}
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
