import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from './Skeleton'

interface SkeletonCircleProps extends HTMLAttributes<HTMLDivElement> {
  size?: number
  animate?: boolean
}

export function SkeletonCircle({
  size = 48,
  animate = true,
  className,
  ...props
}: SkeletonCircleProps) {
  return (
    <Skeleton
      circle
      width={size}
      height={size}
      animate={animate}
      className={cn('shrink-0', className)}
      {...props}
    />
  )
}
