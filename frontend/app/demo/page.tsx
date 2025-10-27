'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function DemoPage() {
  const router = useRouter()
  const [error, setError] = useState(false)

  useEffect(() => {
    const loginAsDemo = async () => {
      try {
        const result = await signIn('credentials', {
          email: 'ifs@spencerboucher.com',
          password: 'password123',
          isDemo: 'true', // Pass as string since it goes through form data
          redirect: false,
        })

        console.log('Demo login result:', result)

        if (result?.error) {
          console.error('Demo login error:', result.error)
          setError(true)
        } else if (result?.ok) {
          // Redirect to log page to show the demo data
          router.push('/log')
          router.refresh()
        } else {
          setError(true)
        }
      } catch (err) {
        console.error('Demo login exception:', err)
        setError(true)
      }
    }

    loginAsDemo()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Demo Login Failed</h1>
          <p className="text-gray-600 mb-6">Unable to start demo session.</p>
          <a
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading Demo...</h1>
        <p className="text-gray-600">Setting up your read-only demo session</p>
      </div>
    </div>
  )
}
