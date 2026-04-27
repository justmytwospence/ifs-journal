'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface MetricSeries {
  /** Display label rendered above the chart. */
  label: string
  /** Each data point is one snapshot. ranAt → metric value. */
  points: { ranAt: string; value: number }[]
  /** Optional Y-axis hint. Recharts auto-scales when omitted. */
  domain?: [number | string, number | string]
  /** Suffix on the tooltip value (e.g. '%' for percentages). */
  suffix?: string
  /** Optional 1-line description of what this metric tracks. */
  hint?: string
}

interface ChartRow {
  ranAt: string
  /** A short tick label — last 8 chars of the ISO timestamp is enough to disambiguate. */
  label: string
  value: number
}

function shortTick(ranAt: string): string {
  // ISO "2026-04-26T21:24:47.133Z" → "04-26 21:24"
  const d = new Date(ranAt)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

export function EvalTimeSeries({ series }: { series: MetricSeries[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {series.map((m) => {
        const rows: ChartRow[] = m.points.map((p) => ({
          ranAt: p.ranAt,
          label: shortTick(p.ranAt),
          value: p.value,
        }))
        return (
          <div
            key={m.label}
            className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1"
          >
            <div className="font-medium text-xs">{m.label}</div>
            {m.hint && <div className="text-[10px] text-muted-foreground">{m.hint}</div>}
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                  <XAxis
                    dataKey="label"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={20}
                  />
                  <YAxis
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    domain={m.domain}
                  />
                  <Tooltip
                    cursor={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
                    contentStyle={{
                      fontSize: 11,
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 6,
                    }}
                    labelStyle={{ fontSize: 10, opacity: 0.6 }}
                    formatter={(value: number) => [`${value}${m.suffix ?? ''}`, m.label]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {m.points.length} {m.points.length === 1 ? 'point' : 'points'}
            </div>
          </div>
        )
      })}
    </div>
  )
}
