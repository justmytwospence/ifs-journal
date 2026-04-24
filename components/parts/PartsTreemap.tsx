'use client'

import { useRouter } from 'next/navigation'
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts'
import { slugify } from '@/lib/slug-utils'

interface Part {
  id: string
  name: string
  role: string
  color: string
  appearances: number
}

interface TreemapCellProps {
  x: number
  y: number
  width: number
  height: number
  name: string
  displayName?: string
  color: string
}

interface PartsTreemapProps {
  parts: Part[]
}

/**
 * Pick a font size that lets `text` fit in `width` and truncate with an
 * ellipsis if even the smallest size won't hold it.
 */
function fitText(text: string, width: number): { text: string; fontSize: number } {
  const maxFontSize = 14
  const minFontSize = 10
  const charWidthRatio = 0.6
  const padding = 16
  const available = width - padding

  for (let size = maxFontSize; size >= minFontSize; size--) {
    const maxChars = Math.floor(available / (size * charWidthRatio))
    if (text.length <= maxChars) return { text, fontSize: size }
  }

  const maxChars = Math.floor(available / (minFontSize * charWidthRatio)) - 1
  if (maxChars > 3) return { text: `${text.substring(0, maxChars)}…`, fontSize: minFontSize }
  return { text: '', fontSize: minFontSize }
}

function TreemapCell(props: TreemapCellProps) {
  const { x, y, width, height, name, displayName, color } = props
  const label = displayName || name
  const showName = width > 50 && height > 25
  const { text, fontSize } = showName ? fitText(label, width) : { text: '', fontSize: 14 }

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{ fill: color, stroke: '#fff', strokeWidth: 2, cursor: 'pointer' }}
      />
      {text && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize={fontSize}
          fontWeight={600}
          style={{ pointerEvents: 'none', textRendering: 'geometricPrecision' }}
        >
          {text}
        </text>
      )}
    </g>
  )
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  // biome-ignore lint/suspicious/noExplicitAny: Recharts payload shape is dynamic
  payload?: any[]
}) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  const label = data.displayName || data.name
  const count = data.appearances ?? data.size

  return (
    <div className="bg-popover px-4 py-3 rounded-lg shadow-lg border border-border">
      <p className="font-semibold text-foreground">{label}</p>
      {data.role && <p className="text-sm text-muted-foreground">{data.role}</p>}
      {count !== undefined && (
        <p className="text-sm text-muted-foreground mt-1">
          {count} {count === 1 ? 'appearance' : 'appearances'}
        </p>
      )}
    </div>
  )
}

export function PartsTreemap({ parts }: PartsTreemapProps) {
  const router = useRouter()

  // Flat list of parts — no role grouping. At 5-9 parts the nested hierarchy
  // added visual noise without clarifying anything the color-per-part didn't
  // already convey.
  const treemapData = parts.map((part) => ({
    // Embed the id so Recharts gets a unique key per leaf
    name: `${part.name}-${part.id}`,
    displayName: part.name,
    size: Math.max(part.appearances, 1),
    appearances: part.appearances,
    color: part.color,
    partSlug: slugify(part.name),
    role: part.role,
  }))

  // biome-ignore lint/suspicious/noExplicitAny: Recharts onClick payload shape
  const handleClick = (data: any) => {
    if (data?.partSlug) router.push(`/parts/${data.partSlug}`)
  }

  return (
    <div className="w-full h-[300px] md:h-[400px] rounded-xl overflow-hidden mb-6">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={treemapData}
          dataKey="size"
          stroke="#fff"
          fill="#8884d8"
          content={<TreemapCell {...({} as TreemapCellProps)} />}
          onClick={handleClick}
          animationDuration={0}
          isAnimationActive={false}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  )
}
