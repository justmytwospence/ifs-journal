import { Skeleton } from './Skeleton'

export function JournalEntrySkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading journal entry">
      <span className="sr-only">Loading journal entry...</span>
      
      <div className="bg-white rounded-2xl shadow-sm p-8">
        <div className="mb-6">
          {/* Header with date and word count */}
          <div className="flex items-center justify-between mb-4">
            <Skeleton height={36} width={400} />
            <Skeleton height={20} width={80} />
          </div>
          
          {/* Prompt box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <Skeleton height={16} width={60} className="mb-1" />
            <Skeleton height={20} width="85%" />
          </div>

          {/* Parts badges */}
          <div className="mb-4">
            <Skeleton height={12} width={120} className="mb-2" />
            <div className="flex flex-wrap gap-2">
              <Skeleton height={32} width={100} className="rounded-full" />
              <Skeleton height={32} width={120} className="rounded-full" />
              <Skeleton height={32} width={90} className="rounded-full" />
            </div>
          </div>
        </div>

        {/* Entry content - single large block */}
        <div className="prose max-w-none">
          <div className="font-serif">
            <Skeleton height={400} width="100%" className="rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}
