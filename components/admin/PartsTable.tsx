'use client'

import { useState } from 'react'
import type { Snapshot } from '@/lib/eval/capture'

interface PartRow {
  name: string
  role: string
  description: string
  highlightCount: number
  entriesCitedIn: number
  curated: boolean
}

function buildRows(snapshot: Snapshot): PartRow[] {
  const highlightCount = new Map<string, number>()
  const entriesByPart = new Map<string, Set<number>>()
  for (const h of snapshot.highlights) {
    highlightCount.set(h.partName, (highlightCount.get(h.partName) ?? 0) + 1)
    const set = entriesByPart.get(h.partName) ?? new Set<number>()
    set.add(h.entryDaysAgo)
    entriesByPart.set(h.partName, set)
  }
  return snapshot.parts
    .map((p) => ({
      name: p.name,
      role: p.role,
      description: p.description,
      highlightCount: highlightCount.get(p.name) ?? 0,
      entriesCitedIn: entriesByPart.get(p.name)?.size ?? 0,
      curated: p.name in snapshot.curatedFields,
    }))
    .sort((a, b) => b.highlightCount - a.highlightCount)
}

export function PartsTable({ snapshot }: { snapshot: Snapshot }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const rows = buildRows(snapshot)

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Name</th>
            <th className="text-left px-3 py-2 font-medium">Role</th>
            <th className="text-right px-3 py-2 font-medium">Highlights</th>
            <th className="text-right px-3 py-2 font-medium">Entries cited</th>
            <th className="text-center px-3 py-2 font-medium">Curated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isOpen = expanded === row.name
            const curated = snapshot.curatedFields[row.name]
            const highlights = snapshot.highlights.filter((h) => h.partName === row.name)
            return (
              <>
                <tr
                  key={row.name}
                  className="border-t border-border/50 hover:bg-muted/20 cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : row.name)}
                >
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.description}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">{row.role}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.highlightCount}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.entriesCitedIn}</td>
                  <td className="px-3 py-2 text-center text-xs">{row.curated ? '●' : ''}</td>
                </tr>
                {isOpen && (
                  <tr key={`${row.name}-detail`} className="bg-muted/10">
                    <td colSpan={5} className="px-4 py-3 space-y-3">
                      {curated && (
                        <section className="space-y-1">
                          <h5 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Curated user-fields
                          </h5>
                          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            {curated.customName && (
                              <>
                                <dt className="text-muted-foreground">customName</dt>
                                <dd>{curated.customName}</dd>
                              </>
                            )}
                            {curated.ageImpression && (
                              <>
                                <dt className="text-muted-foreground">ageImpression</dt>
                                <dd>{curated.ageImpression}</dd>
                              </>
                            )}
                            {curated.positiveIntent && (
                              <>
                                <dt className="text-muted-foreground">positiveIntent</dt>
                                <dd className="whitespace-pre-wrap">{curated.positiveIntent}</dd>
                              </>
                            )}
                            {curated.fearedOutcome && (
                              <>
                                <dt className="text-muted-foreground">fearedOutcome</dt>
                                <dd className="whitespace-pre-wrap">{curated.fearedOutcome}</dd>
                              </>
                            )}
                            {curated.whatItProtects && (
                              <>
                                <dt className="text-muted-foreground">whatItProtects</dt>
                                <dd className="whitespace-pre-wrap">{curated.whatItProtects}</dd>
                              </>
                            )}
                            {curated.userNotes && (
                              <>
                                <dt className="text-muted-foreground">userNotes</dt>
                                <dd className="whitespace-pre-wrap">{curated.userNotes}</dd>
                              </>
                            )}
                          </dl>
                        </section>
                      )}
                      <section className="space-y-1">
                        <h5 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Highlights ({highlights.length})
                        </h5>
                        <ul className="space-y-1">
                          {highlights.map((h, i) => (
                            <li
                              key={`${row.name}-${i}`}
                              className="text-xs border-l-2 border-border/70 pl-2"
                            >
                              <div className="flex items-baseline gap-2">
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  d-{h.entryDaysAgo}
                                </span>
                                <p className="italic text-foreground/80">“{h.exact}”</p>
                              </div>
                              {h.reasoning && (
                                <p className="text-muted-foreground mt-0.5 text-[11px] ml-8">
                                  — {h.reasoning}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </section>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
