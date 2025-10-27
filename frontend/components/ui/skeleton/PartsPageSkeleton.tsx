import { SkeletonCard } from './SkeletonCard'
import { Skeleton } from './Skeleton'

export function PartsPageSkeleton({ reanalyzing = false }: { reanalyzing?: boolean }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading parts">
      {/* Page Header Skeleton - removed as it's now rendered outside the skeleton */}

      {/* Treemap Skeleton */}
      <div className="mb-8 relative">
        <Skeleton width="100%" height={300} className="rounded-2xl" />
        {reanalyzing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-gray-500 font-medium">Reanalyzing all journal entries...</p>
            <p className="text-sm text-gray-400 mt-2">This may take a minute</p>
          </div>
        )}
      </div>

      {/* "All Parts" Section Header */}
      <Skeleton width={100} height={24} className="mb-4" />

      {/* Parts Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} showIcon={true} textLines={3} />
        ))}
      </div>

      <span className="sr-only">Loading parts...</span>
    </div>
  )
}
