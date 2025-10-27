import { SkeletonCard } from './SkeletonCard'
import { Skeleton } from './Skeleton'

export function PartsPageSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading parts">
      {/* Page Header Skeleton - removed as it's now rendered outside the skeleton */}

      {/* Treemap Skeleton */}
      <div className="mb-8">
        <Skeleton width="100%" height={300} className="rounded-2xl" />
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
