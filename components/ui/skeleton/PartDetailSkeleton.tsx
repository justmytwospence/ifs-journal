import { Skeleton } from './Skeleton'
import { SkeletonCircle } from './SkeletonCircle'
import { SkeletonText } from './SkeletonText'

export function PartDetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading part details">
      <span className="sr-only">Loading part details...</span>
      
      {/* Part Header */}
      <div className="bg-white rounded-2xl shadow-sm p-8 mb-6">
        <div className="flex items-center gap-4 mb-4">
          {/* Large icon placeholder */}
          <SkeletonCircle size={64} className="rounded-xl" />
          
          <div className="flex-1">
            {/* Title and role */}
            <Skeleton height={32} width="60%" className="mb-2" />
            <Skeleton height={16} width="40%" />
          </div>
          
          {/* Activity sparkline placeholder */}
          <div className="flex flex-col items-end">
            <Skeleton height={12} width={80} className="mb-1" />
            <Skeleton height={32} width={150} />
          </div>
        </div>
        
        {/* Description text */}
        <Skeleton height={72} width="100%" className="rounded" />
      </div>

      {/* Two-column grid layout */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Key Quotes Section */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton height={24} width={120} />
            <Skeleton height={16} width={80} />
          </div>
          
          {/* 3 quote items */}
          <ul className="space-y-3">
            {[1, 2, 3].map((i) => (
              <li key={i} className="border-l-4 border-gray-200 pl-4 py-2">
                <Skeleton height={48} width="90%" className="rounded" />
              </li>
            ))}
          </ul>
        </div>

        {/* Actions Section */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <Skeleton height={24} width={100} className="mb-4" />
          
          {/* 2 button placeholders */}
          <div className="space-y-3">
            <Skeleton height={48} width="100%" className="rounded-lg" />
            <Skeleton height={48} width="100%" className="rounded-lg" />
          </div>
        </div>
      </div>

      {/* Conversation Area */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <Skeleton height={24} width={250} className="mb-2" />
        <Skeleton height={16} width={300} className="mb-6" />
        
        {/* Conversation messages placeholder */}
        <div className="space-y-4 mb-6">
          <div className="text-center py-8">
            <Skeleton height={16} width={150} className="mx-auto mb-2" />
            <Skeleton height={14} width={200} className="mx-auto" />
          </div>
        </div>
        
        {/* Message input area */}
        <div className="flex gap-3">
          <Skeleton height={48} className="flex-1 rounded-xl" />
          <Skeleton height={48} width={80} className="rounded-xl" />
        </div>
      </div>
    </div>
  )
}
