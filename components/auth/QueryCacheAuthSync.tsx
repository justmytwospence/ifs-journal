'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'

// Wipe the TanStack cache when the signed-in user changes, so a previous
// user's fetched data (e.g. demo content from /demo) doesn't bleed into a
// fresh login until staleTime expires.
export function QueryCacheAuthSync() {
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const lastUserIdRef = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (status === 'loading') return
    const currentUserId = session?.user?.id ?? null
    if (lastUserIdRef.current !== undefined && lastUserIdRef.current !== currentUserId) {
      queryClient.clear()
    }
    lastUserIdRef.current = currentUserId
  }, [session?.user?.id, status, queryClient])

  return null
}
