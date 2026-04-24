import { HTMLAttributes } from 'react'
import { SkeletonCircle } from './SkeletonCircle'
import { SkeletonText } from './SkeletonText'
import { cn } from '@/lib/utils'

interface SkeletonCardProps extends HTMLAttributes<HTMLDivElement> {
  showIcon?: boolean
  textLines?: number
  animate?: boolean
}

export function SkeletonCard({
  showIcon = true,
  textLines = 3,
  animate = true,
  className,
  ...props
}: SkeletonCardProps) {
  return (
    <div
      className={cn('bg-white rounded-2xl shadow-sm p-6', className)}
      {...props}
    >
      {showIcon && (
        <div className="flex items-start gap-4 mb-4">
          <SkeletonCircle size={48} animate={animate} />
          <div className="flex-1 pt-2">
            <SkeletonText lines={2} widths={['70%', '50%']} animate={animate} />
          </div>
        </div>
      )}
      <SkeletonText lines={textLines} animate={animate} />
    </div>
  )
}
