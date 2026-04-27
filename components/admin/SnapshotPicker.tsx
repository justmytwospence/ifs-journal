'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export interface SnapshotOption {
  fileName: string
  ranAt: string
  complete: boolean
}

export function SnapshotPicker({
  options,
  selectedFileName,
}: {
  options: SnapshotOption[]
  selectedFileName: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function onSelect(value: string) {
    const params = new URLSearchParams(searchParams)
    if (value === 'latest.json') {
      params.delete('snapshot')
    } else {
      params.set('snapshot', value)
    }
    const qs = params.toString()
    router.push(`${pathname}${qs ? `?${qs}` : ''}`)
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Snapshot</span>
      <select
        className="bg-background border border-border rounded px-2 py-1 text-sm"
        value={selectedFileName}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="latest.json">latest</option>
        {options
          .slice()
          .reverse()
          .map((opt) => (
            <option key={opt.fileName} value={opt.fileName}>
              {new Date(opt.ranAt).toLocaleString()}
              {opt.complete ? '' : '  [INCOMPLETE]'}
            </option>
          ))}
      </select>
    </label>
  )
}
