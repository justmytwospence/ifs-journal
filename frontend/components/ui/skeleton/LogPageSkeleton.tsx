import { Skeleton } from './Skeleton'
import { SkeletonText } from './SkeletonText'

export function LogPageSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading journal entries">
      {/* Page Header Skeleton */}
      <div className="mb-8">
        <Skeleton width={200} height={36} className="mb-2" />
        <Skeleton width={250} height={20} />
      </div>

      {/* Search and Filter Bar Skeleton */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Bar Skeleton */}
          <div className="flex-1">
            <Skeleton width="100%" height={48} className="rounded-xl" />
          </div>

          {/* Filter Dropdown Skeleton */}
          <div className="w-full md:w-64">
            <Skeleton width="100%" height={48} className="rounded-xl" />
          </div>
        </div>
      </div>

      {/* Entry Cards List Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
          >
            {/* Entry Header with Date and Metadata */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                {/* Date */}
                <Skeleton width={180} height={28} className="mb-1" />
                {/* Prompt */}
                <Skeleton width="70%" height={20} />
              </div>
              {/* Part badges and word count */}
              <div className="flex items-center gap-3 ml-4">
                <div className="flex -space-x-2">
                  <Skeleton width={24} height={24} circle={true} />
                  <Skeleton width={24} height={24} circle={true} />
                  <Skeleton width={24} height={24} circle={true} />
                </div>
                <Skeleton width={70} height={20} />
              </div>
            </div>

            {/* Entry Content Preview - Single block instead of multiple lines */}
            <div className="font-serif">
              <Skeleton width="100%" height={72} className="rounded" />
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Loading journal entries...</span>
    </div>
  )
}
