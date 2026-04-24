'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui'

function RequestResetForm() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center">
        <p className="text-base text-muted-foreground mb-4">
          If an account exists with <strong>{email}</strong>, you will receive password reset
          instructions within a few minutes.
        </p>
        <Button onClick={() => setSubmitted(false)} variant="secondary" className="w-full">
          Try another email
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  )
}

function NewPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters')
      return
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError('Password must include at least one symbol')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Reset failed. Request a new link.')
        return
      }
      setDone(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <p className="text-base text-muted-foreground">
          Your password has been reset. You can sign in now.
        </p>
        <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
          Go to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
          New password
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="at least 12 characters, one symbol"
          required
          minLength={12}
        />
      </div>
      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-foreground mb-1">
          Confirm new password
        </label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={12}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Saving…' : 'Reset password'}
      </Button>
    </form>
  )
}

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-16 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-xl">
            {token ? 'Set a new password' : 'Reset password'}
          </CardTitle>
          {!token && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Enter your email to receive reset instructions
            </p>
          )}
        </CardHeader>
        <CardContent>
          {token ? <NewPasswordForm token={token} /> : <RequestResetForm />}
          <p className="text-sm text-center mt-6">
            <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  )
}
