'use client'

import { useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface DemoToastProps {
  onClose: () => void
}

export function DemoToast({ onClose }: DemoToastProps) {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  const handleClick = async () => {
    // Sign out from demo session
    await signOut({ redirect: false })
    // Navigate to registration
    router.push('/register')
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div 
        onClick={handleClick}
        className="bg-blue-600 text-white rounded-xl shadow-2xl p-4 max-w-md hover:bg-blue-700 transition-colors cursor-pointer"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="font-semibold mb-1">This is a demo</p>
            <p className="text-sm text-blue-100">
              Click here to create your own account →
            </p>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClose()
            }}
            className="text-white hover:text-blue-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
