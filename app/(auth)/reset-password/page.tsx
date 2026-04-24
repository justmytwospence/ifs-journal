'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement password reset logic
    console.log('Reset password for:', email)
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-therapeutic section-padding">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">IFS</span>
            </div>
          </div>
          <CardTitle className="text-center">Reset Password</CardTitle>
          <p className="body text-center mt-2">
            {submitted
              ? 'Check your email for reset instructions'
              : 'Enter your email to receive reset instructions'}
          </p>
        </CardHeader>
        <CardContent>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-sage-700 mb-1">
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
              <Button type="submit" variant="primary" className="w-full">
                Send Reset Link
              </Button>
            </form>
          ) : (
            <div className="text-center">
              <p className="body mb-4">
                If an account exists with {email}, you will receive password reset instructions.
              </p>
              <Button onClick={() => setSubmitted(false)} variant="secondary" className="w-full">
                Try Another Email
              </Button>
            </div>
          )}
          <p className="body-small text-center mt-6">
            <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
