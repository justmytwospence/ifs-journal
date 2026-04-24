'use client'

import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

export function DemoBanner() {
  const { data: session } = useSession()
  const router = useRouter()

  if (!session?.user?.isDemo) return null

  const handleSignUp = async () => {
    await signOut({ redirect: false })
    router.push('/register')
  }

  return (
    <div className="bg-amber-100 text-amber-900 border-b border-amber-200 text-sm">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <span>
          <strong>Demo mode.</strong> You can explore but changes won't save.
        </span>
        <button
          type="button"
          onClick={handleSignUp}
          className="underline font-medium hover:text-amber-950 whitespace-nowrap"
        >
          Sign up to save yours →
        </button>
      </div>
    </div>
  )
}
