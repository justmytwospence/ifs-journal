import { HTMLAttributes } from 'react'
import { Skeleton } from './Skeleton'
import { cn } from '@/lib/utils'

interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> {
  lines?: number
  widths?: string[]
  animate?: boolean
}

export function SkeletonText({
  lines = 1,
  widths = ['100%', '95%', '85%'],
  animate = true,
  className,
  ...props
}: SkeletonTextProps) {
  // Generate widths array based on number of lines
  const lineWidths = Array.from({ length: lines }, (_, i) => {
    return widths[i % widths.length] || widths[widths.length - 1]
  })

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {lineWidths.map((width, index) => (
        <Skeleton
          key={index}
          height={8}
          width={width}
          animate={animate}
        />
      ))}
    </div>
  )
}
