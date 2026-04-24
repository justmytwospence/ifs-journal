'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface Part {
  id: string
  name: string
  color: string
  appearances: number
  activityTrend: number[]
}

interface PartsTimelineProps {
  parts: Part[]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatShortDate(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

// Row shape varies per user (keys are part names), so use a permissive record type.
type TimelineRow = { date: string; dateISO: string; fullDate: string } & Record<string, unknown>

function buildRows(parts: Part[]): TimelineRow[] {
  const days = parts[0]?.activityTrend.length ?? 30
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const rows: TimelineRow[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - (days - 1 - i))
    const row: TimelineRow = {
      date: formatShortDate(d),
      dateISO: d.toISOString().slice(0, 10),
      fullDate: formatFullDate(d),
    }
    for (const part of parts) {
      row[part.name] = part.activityTrend[i] ?? 0
    }
    rows.push(row)
  }
  return rows
}

function CustomTooltip({
  active,
  payload,
  parts,
}: {
  active?: boolean
  // biome-ignore lint/suspicious/noExplicitAny: Recharts payload shape is dynamic
  payload?: any[]
  parts: Part[]
}) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload as TimelineRow
  const entries = parts
    .map((p) => ({ name: p.name, color: p.color, count: (row[p.name] as number) ?? 0 }))
    .filter((e) => e.count > 0)

  return (
    <div className="bg-popover px-4 py-3 rounded-lg shadow-lg border border-border">
      <p className="font-semibold text-foreground mb-1">{row.fullDate}</p>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity</p>
      ) : (
        <ul className="space-y-0.5">
          {entries.map((e) => (
            <li key={e.name} className="flex items-center gap-2 text-sm text-foreground">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: e.color }}
                aria-hidden
              />
              <span className="flex-1">{e.name}</span>
              <span className="text-muted-foreground tabular-nums">{e.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function PartsTimeline({ parts }: PartsTimelineProps) {
  const hasActivity = parts.some((p) => p.activityTrend.some((c) => c > 0))
  if (!hasActivity) return null

  // Stable ordering: most-active parts on the bottom of each stack.
  const ordered = [...parts].sort((a, b) => b.appearances - a.appearances)
  const rows = buildRows(ordered)
  const tickInterval = Math.max(0, Math.floor(rows.length / 6) - 1)

  return (
    <div className="w-full rounded-2xl bg-card shadow-sm p-4 mb-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-3 px-2">
        Activity over the last 30 days
      </h3>
      <div className="w-full h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="date"
              interval={tickInterval}
              tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              width={32}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
              content={<CustomTooltip parts={ordered} />}
            />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              iconType="square"
              iconSize={10}
            />
            {ordered.map((part) => (
              <Bar
                key={part.id}
                dataKey={part.name}
                stackId="activity"
                fill={part.color}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
