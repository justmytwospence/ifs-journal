'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export default function DemoPage() {
  const router = useRouter()
  const [error, setError] = useState(false)

  useEffect(() => {
    const loginAsDemo = async () => {
      try {
        const res = await fetch('/api/auth/demo-signin', { method: 'POST' })
        if (!res.ok) {
          setError(true)
          return
        }
        router.push('/log')
        router.refresh()
      } catch {
        setError(true)
      }
    }

    loginAsDemo()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-heading text-2xl tracking-tight text-foreground mb-4">
            Demo login failed
          </h1>
          <p className="text-muted-foreground mb-6">Unable to start demo session.</p>
          <Button size="lg" render={<Link href="/" />}>
            Back to home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div
          aria-hidden="true"
          className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-border border-t-primary mb-4"
        />
        <h1 className="font-heading text-2xl tracking-tight text-foreground mb-2">Loading demo…</h1>
        <p className="text-muted-foreground">Setting up your read-only demo session</p>
      </div>
    </div>
  )
}
