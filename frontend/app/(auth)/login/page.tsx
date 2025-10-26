'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement login logic
    console.log('Login:', { email, password })
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
          <CardTitle className="text-center">Welcome Back</CardTitle>
          <p className="body text-center mt-2">Sign in to continue your journaling journey</p>
        </CardHeader>
        <CardContent>
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
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-sage-700 mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <Link href="/reset-password" className="text-sm text-primary-600 hover:text-primary-700">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" variant="primary" className="w-full">
              Sign In
            </Button>
          </form>
          <p className="body-small text-center mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
