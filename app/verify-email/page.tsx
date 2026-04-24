'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { buttonVariants, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { cn } from '@/lib/utils'

type Status = 'pending' | 'success' | 'error'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<Status>('pending')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing verification token.')
      return
    }
    const controller = new AbortController()
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          setStatus('success')
          setMessage('Your email is verified. You can sign in now.')
        } else {
          setStatus('error')
          setMessage(data.error || 'Verification failed.')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Could not reach the server. Please try again.')
      })
    return () => controller.abort()
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-16 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-xl">Verify your email</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'pending' && <p className="text-base text-muted-foreground">Verifying…</p>}
          {status === 'success' && (
            <>
              <p className="text-base text-muted-foreground mb-4">{message}</p>
              <Link href="/login" className={cn(buttonVariants(), 'w-full')}>
                Go to sign in
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <p className="text-base text-muted-foreground mb-4">{message}</p>
              <Link
                href="/register"
                className={cn(buttonVariants({ variant: 'secondary' }), 'w-full')}
              >
                Back to sign up
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  )
}
