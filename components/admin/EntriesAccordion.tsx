'use client'

import { useState } from 'react'
import type { Snapshot, SnapshotEntry } from '@/lib/eval/capture'

interface PartAttribution {
  partName: string
  confidence: number
  highlights: { exact: string; reasoning: string | null }[]
}

function attributionsForEntry(snapshot: Snapshot, daysAgo: number): PartAttribution[] {
  const partAnalyses = snapshot.partAnalyses.filter((pa) => pa.entryDaysAgo === daysAgo)
  const highlightsByPart = new Map<string, { exact: string; reasoning: string | null }[]>()
  for (const h of snapshot.highlights) {
    if (h.entryDaysAgo !== daysAgo) continue
    const list = highlightsByPart.get(h.partName) ?? []
    list.push({ exact: h.exact, reasoning: h.reasoning })
    highlightsByPart.set(h.partName, list)
  }
  return partAnalyses.map((pa) => ({
    partName: pa.partName,
    confidence: pa.confidence,
    highlights: highlightsByPart.get(pa.partName) ?? [],
  }))
}

function EntryRow({ entry, snapshot }: { entry: SnapshotEntry; snapshot: Snapshot }) {
  const [open, setOpen] = useState(false)
  const attributions = attributionsForEntry(snapshot, entry.daysAgo)
  const promptPreview = entry.prompt.length > 100 ? `${entry.prompt.slice(0, 100)}…` : entry.prompt

  return (
    <li className="border border-border rounded-lg overflow-hidden bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-3 py-2 flex items-baseline gap-3 text-sm hover:bg-muted/30"
      >
        <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">
          d-{entry.daysAgo}
        </span>
        <span className="flex-1 truncate">{promptPreview}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {entry.wordCount}w · {attributions.length} parts
        </span>
        <span className="text-muted-foreground text-xs">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="px-4 py-3 border-t border-border space-y-4">
          <section className="space-y-1">
            <h4 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Prompt
            </h4>
            <p className="text-sm whitespace-pre-wrap">{entry.prompt}</p>
          </section>
          <section className="space-y-1">
            <h4 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Response ({entry.wordCount} words)
            </h4>
            <div className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
              {entry.content}
            </div>
          </section>
          <section className="space-y-2">
            <h4 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Parts attributed ({attributions.length})
            </h4>
            {attributions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No parts cited in this entry. (Check coverage in the scorecard.)
              </p>
            ) : (
              <ul className="space-y-2">
                {attributions.map((attr) => (
                  <li key={attr.partName} className="rounded border border-border/50 p-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium">{attr.partName}</span>
                      <span className="text-muted-foreground font-mono">
                        confidence {attr.confidence.toFixed(2)}
                      </span>
                    </div>
                    <ul className="space-y-1 mt-1">
                      {attr.highlights.map((h, i) => (
                        <li
                          key={`${attr.partName}-${i}`}
                          className="text-xs border-l-2 border-border/70 pl-2"
                        >
                          <p className="italic text-foreground/80">“{h.exact}”</p>
                          {h.reasoning && (
                            <p className="text-muted-foreground mt-0.5 text-[11px]">
                              — {h.reasoning}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </li>
  )
}

export function EntriesAccordion({ snapshot }: { snapshot: Snapshot }) {
  // Newest first — matches how the live app shows the journal.
  const entries = [...snapshot.entries].sort((a, b) => a.daysAgo - b.daysAgo)
  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <EntryRow key={e.daysAgo} entry={e} snapshot={snapshot} />
      ))}
    </ul>
  )
}
