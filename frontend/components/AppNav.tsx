'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import { useAnalysisStore } from '@/lib/stores/analysis-store'


export function AppNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const { isAnalyzing, analysisType } = useAnalysisStore()

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/')
  }

  const isActive = (path: string) => pathname === path

  // Get user initials from email
  const getInitials = () => {
    if (!session?.user?.email) return 'U'
    const emailName = session.user.email.split('@')[0]
    const parts = emailName.split(/[._-]/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return emailName.substring(0, 2).toUpperCase()
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              IFS Journal
            </h1>
            <div className="flex gap-1">
              <Link
                href="/journal"
                className={`px-4 py-2 rounded-lg font-medium ${
                  isActive('/journal')
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Journal
              </Link>
              <Link
                href="/log"
                className={`px-4 py-2 rounded-lg font-medium ${
                  isActive('/log')
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Log
              </Link>
              <Link
                href="/parts"
                className={`px-4 py-2 rounded-lg font-medium ${
                  isActive('/parts')
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Parts
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isAnalyzing && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-blue-700">
                  {analysisType === 'batch' ? 'Batch analyzing...' : 'Analyzing...'}
                </span>
              </div>
            )}
            <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-white font-semibold flex items-center justify-center hover:shadow-lg transition-shadow"
            >
              {getInitials()}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                <Link
                  href="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    handleSignOut()
                  }}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
