import { Skeleton } from './Skeleton'

export function JournalEntrySkeleton() {
  return (
    // biome-ignore lint/a11y/useSemanticElements: role=status on a div is the ARIA pattern for loading placeholders; <output> is for form results.
    <div role="status" aria-busy="true" aria-label="Loading journal entry">
      <span className="sr-only">Loading journal entry...</span>

      <div className="bg-card rounded-2xl ring-1 ring-foreground/10 p-8">
        <div className="mb-6">
          {/* Header with date and word count */}
          <div className="flex items-center justify-between mb-4">
            <Skeleton height={36} width={400} />
            <Skeleton height={20} width={80} />
          </div>

          {/* Prompt box */}
          <div className="bg-muted border border-border rounded-xl p-4 mb-4">
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
