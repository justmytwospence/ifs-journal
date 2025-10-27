import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAnalysisStore } from '@/lib/stores/analysis-store'

/**
 * Hook that invalidates all analysis-related queries when analysis completes
 * This ensures all pages show fresh data after incremental or batch analysis
 */
export function useInvalidateOnAnalysis() {
  const queryClient = useQueryClient()
  const { isAnalyzing } = useAnalysisStore()

  useEffect(() => {
    // When analysis completes (isAnalyzing goes from true to false)
    if (!isAnalyzing) {
      // Invalidate all queries that depend on analysis results
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      queryClient.invalidateQueries({ queryKey: ['part'] })
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['journal-entry'] })
    }
  }, [isAnalyzing, queryClient])
}
