'use client'

import { type Activity, ActivityCalendar } from 'react-activity-calendar'

interface PartActivityCalendarProps {
  /** Daily activity counts, newest last. trend[i] corresponds to `days-1-i` days ago. */
  trend: number[]
  /** Part color — used as the heatmap fill */
  color: string
}

/** Bucket a daily count into react-activity-calendar's 0-4 levels. */
function countToLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

/** Build `{date, count, level}` entries from a trend array ending on today. */
function trendToActivities(trend: number[]): Activity[] {
  const days = trend.length
  const today = new Date()
  return trend.map((count, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (days - 1 - i))
    return {
      date: d.toISOString().slice(0, 10),
      count,
      level: countToLevel(count),
    }
  })
}

export function PartActivityCalendar({ trend, color }: PartActivityCalendarProps) {
  const data = trendToActivities(trend)
  const hasActivity = trend.some((c) => c > 0)

  return (
    <div className="pt-4 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">Activity (Last 30 days)</span>
        {!hasActivity && <span className="text-xs text-muted-foreground">No activity</span>}
      </div>
      <ActivityCalendar
        data={data}
        theme={{ light: ['#f3f4f6', color], dark: ['#1f2937', color] }}
        blockSize={12}
        blockMargin={3}
        hideColorLegend
        hideTotalCount
        hideMonthLabels
      />
    </div>
  )
}
