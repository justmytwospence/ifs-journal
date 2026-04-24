import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  circle?: boolean
  animate?: boolean
}

export function Skeleton({
  className,
  width,
  height,
  circle = false,
  animate = true,
  ...props
}: SkeletonProps) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  }

  return (
    <div
      role="status"
      aria-busy="true"
      className={cn(
        'bg-gray-200',
        circle ? 'rounded-full' : 'rounded-lg',
        animate && 'skeleton-shimmer',
        className
      )}
      style={style}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}
