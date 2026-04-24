'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!agreeTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 12) {
      setError('Password must be at least 12 characters')
      return
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      setError('Password must include at least one symbol (e.g., !@#$%)')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create account')
        return
      }

      setSubmitted(true)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl ring-1 ring-foreground/10 p-8">
          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl tracking-tight text-foreground mb-2">
              Create account
            </h1>
            <p className="text-muted-foreground">Start your IFS journaling journey</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
              {error}
            </div>
          )}

          {submitted ? (
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary text-sm">
                <p className="font-semibold mb-1">Check your email</p>
                <p>
                  We sent a verification link to <strong>{email}</strong>. Click it to activate your
                  account.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Didn't get it? Check spam, or{' '}
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="text-primary hover:underline"
                >
                  try a different email
                </button>
                .
              </p>
              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="text-primary hover:text-primary/80 font-semibold">
                  Already verified? Sign in
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="h-11 px-3 py-2 text-base rounded-xl"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={12}
                  className="h-11 px-3 py-2 text-base rounded-xl"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  At least 12 characters, including one symbol (like !@#$%).
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Confirm password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={12}
                  className="h-11 px-3 py-2 text-base rounded-xl"
                />
              </div>

              <label className="flex items-start gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 accent-primary"
                  required
                />
                <span>
                  I agree to the{' '}
                  <Link href="/terms" className="text-primary hover:underline" target="_blank">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-primary hover:underline" target="_blank">
                    Privacy Policy
                  </Link>
                  . I understand IFS Journal is not a substitute for therapy or medical advice.
                </span>
              </label>

              <Button
                type="submit"
                disabled={loading || !agreeTerms}
                className="w-full h-11 rounded-xl text-base"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          )}

          {!submitted && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:text-primary/80 font-semibold">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
