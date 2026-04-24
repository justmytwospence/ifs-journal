import { Skeleton } from './Skeleton'
import { SkeletonCard } from './SkeletonCard'

export function PartsPageSkeleton({ reanalyzing = false }: { reanalyzing?: boolean }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: role=status on a div is the ARIA pattern for loading placeholders; <output> is for form results.
    <div role="status" aria-busy="true" aria-label="Loading parts">
      {/* Page Header Skeleton - removed as it's now rendered outside the skeleton */}

      {/* Treemap Skeleton */}
      <div className="mb-8 relative">
        <Skeleton width="100%" height={300} className="rounded-2xl" />
        {reanalyzing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-muted-foreground font-medium">Reanalyzing all journal entries...</p>
            <p className="text-sm text-muted-foreground mt-2">This may take a minute</p>
          </div>
        )}
      </div>

      {/* Timeline Skeleton */}
      <Skeleton width="100%" height={260} className="rounded-2xl mb-6" />

      {/* "All Parts" Section Header */}
      <Skeleton width={100} height={24} className="mb-4" />

      {/* Parts Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholder list
          <SkeletonCard key={index} showIcon={true} textLines={3} />
        ))}
      </div>

      <span className="sr-only">Loading parts...</span>
    </div>
  )
}
