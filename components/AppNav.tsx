'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAnalysisStore } from '@/lib/stores/analysis-store'

// SVG Icons for bottom nav
const JournalIcon = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
)

const LogIcon = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
    />
  </svg>
)

const PartsIcon = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
    />
  </svg>
)

export function AppNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
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

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4 md:gap-8">
              <h1 className="text-xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent shrink-0">
                IFS Journal
              </h1>
              {/* Desktop nav links - hidden on mobile */}
              <div className="hidden md:flex gap-1">
                <Link
                  href="/journal"
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isActive('/journal')
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Journal
                </Link>
                <Link
                  href="/log"
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isActive('/log')
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Log
                </Link>
                <Link
                  href="/parts"
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isActive('/parts')
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Parts
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <ThemeToggle />
              {session?.user?.isDemo && (
                <div className="flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 bg-purple-50 border border-purple-200 rounded-lg shrink-0">
                  <span className="text-xs md:text-sm font-medium text-purple-700 whitespace-nowrap">
                    👁️ Demo
                    <span className="hidden md:inline"> (Read-Only)</span>
                  </span>
                </div>
              )}
              {isAnalyzing && (
                <div className="flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 bg-blue-50 border border-blue-200 rounded-lg shrink-0">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  <span className="text-xs md:text-sm font-medium text-blue-700 whitespace-nowrap">
                    <span className="hidden sm:inline">
                      {analysisType === 'batch' ? 'Batch analyzing...' : 'Analyzing...'}
                    </span>
                    <span className="sm:hidden">...</span>
                  </span>
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Account menu"
                  className="size-10 shrink-0 rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold flex items-center justify-center hover:shadow-lg transition-shadow focus-visible:ring-2 focus-visible:ring-ring outline-none"
                >
                  {getInitials()}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem render={<Link href="/profile">Profile</Link>} />
                  <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-t border-border pb-safe">
        <div className="flex items-center justify-around h-16">
          <Link
            href="/journal"
            className={`flex flex-col items-center justify-center flex-1 h-full py-2 ${
              isActive('/journal') ? 'text-blue-600' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <JournalIcon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Journal</span>
          </Link>
          <Link
            href="/log"
            className={`flex flex-col items-center justify-center flex-1 h-full py-2 ${
              isActive('/log') ? 'text-blue-600' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LogIcon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Log</span>
          </Link>
          <Link
            href="/parts"
            className={`flex flex-col items-center justify-center flex-1 h-full py-2 ${
              isActive('/parts') ? 'text-blue-600' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <PartsIcon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Parts</span>
          </Link>
        </div>
      </nav>
    </>
  )
}
