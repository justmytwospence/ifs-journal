'use client'

import { useRouter } from 'next/navigation'
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
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
  color: string
  depth: number
  partId?: string
  role?: string
}

interface PartsTreemapProps {
  parts: Part[]
}

// Helper function to calculate optimal font size and truncate text
const getFittedText = (text: string, width: number, maxFontSize: number) => {
  // Approximate character width at different font sizes
  const charWidthRatio = 0.6 // characters are roughly 60% of font size in width
  const padding = 16 // padding on both sides
  const availableWidth = width - padding
  
  // Calculate how many characters can fit at max font size
  const maxCharsAtMaxSize = Math.floor(availableWidth / (maxFontSize * charWidthRatio))
  
  if (text.length <= maxCharsAtMaxSize) {
    return { text, fontSize: maxFontSize }
  }
  
  // Try smaller font sizes
  for (let fontSize = maxFontSize - 1; fontSize >= 10; fontSize--) {
    const maxChars = Math.floor(availableWidth / (fontSize * charWidthRatio))
    if (text.length <= maxChars) {
      return { text, fontSize }
    }
  }
  
  // If still too long, truncate with ellipsis
  const minFontSize = 10
  const maxChars = Math.floor(availableWidth / (minFontSize * charWidthRatio)) - 1 // -1 for ellipsis
  if (maxChars > 3) {
    return { text: text.substring(0, maxChars) + '…', fontSize: minFontSize }
  }
  
  return { text: '', fontSize: minFontSize } // Too small to show anything
}

// Custom content component for treemap cells
const CustomizedContent = (props: TreemapCellProps) => {
  const { x, y, width, height, name, color, depth } = props
  
  // Depth 1 = role groups, depth 2 = individual parts
  const isRoleGroup = depth === 1
  
  // Calculate minimum dimensions to show text
  const minWidth = isRoleGroup ? 80 : 50
  const minHeight = isRoleGroup ? 35 : 25
  const showName = width > minWidth && height > minHeight
  
  // Calculate fitted text and font size
  const maxFontSize = isRoleGroup ? 12 : 14
  const { text: fittedText, fontSize } = showName 
    ? getFittedText(name, width, maxFontSize)
    : { text: '', fontSize: maxFontSize }
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: isRoleGroup ? 'rgba(0,0,0,0.05)' : color,
          stroke: '#fff',
          strokeWidth: 2,
          cursor: isRoleGroup ? 'default' : 'pointer',
        }}
      />
      {showName && fittedText && (
        <text
          x={x + width / 2}
          y={isRoleGroup ? y + 20 : y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={isRoleGroup ? '#64748b' : '#fff'}
          fontSize={fontSize}
          fontWeight={isRoleGroup ? '500' : '600'}
          style={{ 
            pointerEvents: 'none',
            textRendering: 'geometricPrecision',
            shapeRendering: 'crispEdges',
          }}
        >
          {fittedText}
        </text>
      )}
    </g>
  )
}

// Custom tooltip component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-600">{data.role}</p>
        <p className="text-sm text-gray-500 mt-1">
          {data.size} {data.size === 1 ? 'appearance' : 'appearances'}
        </p>
      </div>
    )
  }
  return null
}

export function PartsTreemap({ parts }: PartsTreemapProps) {
  const router = useRouter()

  // Group parts by role
  const groupedByRole = parts.reduce((acc, part) => {
    if (!acc[part.role]) {
      acc[part.role] = []
    }
    acc[part.role].push(part)
    return acc
  }, {} as Record<string, Part[]>)

  // Transform into hierarchical treemap format
  const treemapData = Object.entries(groupedByRole).map(([role, roleParts]) => ({
    name: role,
    children: roleParts.map((part) => ({
      name: part.name,
      size: part.appearances,
      color: part.color,
      partId: part.id,
      partSlug: slugify(part.name),
      role: part.role,
    })),
  }))

  // Handle click on treemap cell
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (data: any) => {
    if (data && data.partSlug) {
      router.push(`/parts/${data.partSlug}`)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Parts Overview</h3>
      <div className="w-full h-[300px] md:h-[400px] rounded-xl overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={treemapData}
            dataKey="size"
            stroke="#fff"
            fill="#8884d8"
            content={<CustomizedContent {...({} as TreemapCellProps)} />}
            onClick={handleClick}
            animationDuration={0}
            isAnimationActive={false}
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
