import type { HTMLAttributes } from 'react'
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
    // biome-ignore lint/a11y/useSemanticElements: <output> is semantically for form results; role="status" on a div is the conventional ARIA pattern for loading placeholders.
    <div
      role="status"
      aria-busy="true"
      className={cn(
        'bg-muted',
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
