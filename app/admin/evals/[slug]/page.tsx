import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EntriesAccordion } from '@/components/admin/EntriesAccordion'
import { EvalTimeSeries, type MetricSeries } from '@/components/admin/EvalTimeSeries'
import { PartsTable } from '@/components/admin/PartsTable'
import { ScorecardPanel } from '@/components/admin/ScorecardPanel'
import { SnapshotPicker } from '@/components/admin/SnapshotPicker'
import { listSnapshots, loadAllSnapshotsForPersona, loadSnapshot } from '@/lib/eval/load-snapshots'
import { loadPersona } from '@/lib/eval/persona-loader'
import { scoreSnapshot } from '@/lib/eval/score'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ snapshot?: string }>
}

export default async function PersonaDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { snapshot: snapshotParam } = await searchParams

  // Load all snapshots once — used both for time series and to pick the
  // selected one. Cheap because each is ~300KB and the dashboard isn't
  // public-facing.
  const allSnapshots = await loadAllSnapshotsForPersona(slug)
  if (allSnapshots.length === 0) {
    // No timestamped history. Fall back to latest.json if present.
    const latest = await loadSnapshot(slug, 'latest.json')
    if (!latest) notFound()
    allSnapshots.push(latest)
  }

  const index = await listSnapshots(slug)
  const fileName = snapshotParam ?? 'latest.json'
  const selected = await loadSnapshot(slug, fileName)
  if (!selected) {
    // The picker references a filename that doesn't exist. 404 rather than
    // silently render the wrong snapshot.
    notFound()
  }

  let personaName = slug
  let personaEmoji: string | undefined
  let personaDescription = ''
  try {
    const persona = await loadPersona('evals/personas', slug)
    personaName = persona.name
    personaEmoji = persona.emoji
    personaDescription = persona.oneLineDescription
  } catch {
    // Persona file deleted but snapshot remains — render with slug only.
  }

  // Time-series data: one ScorecardSection per snapshot, then project the
  // load-bearing metrics out of each.
  const scoredHistory = allSnapshots.map((s) => ({ ranAt: s.ranAt, score: scoreSnapshot(s) }))
  const coveragePct = (entriesWithAttribution: number, entriesTotal: number) =>
    Math.round((entriesWithAttribution / Math.max(entriesTotal, 1)) * 100)
  // Skip incremental points entirely on snapshots that pre-date the
  // incremental field — they'd otherwise plot as 0% and look like a
  // regression that never happened.
  const incrementalCoveragePoints = scoredHistory.flatMap(({ ranAt, score }) =>
    score.incrementalParts
      ? [
          {
            ranAt,
            value: coveragePct(
              score.incrementalParts.entriesWithAttribution,
              score.incrementalParts.entriesTotal
            ),
          },
        ]
      : []
  )
  const series: MetricSeries[] = [
    {
      label: 'Coverage % (batch)',
      hint: 'entries with ≥1 attribution',
      suffix: '%',
      domain: [0, 100],
      points: scoredHistory.map(({ ranAt, score }) => ({
        ranAt,
        value: coveragePct(score.parts.entriesWithAttribution, score.parts.entriesTotal),
      })),
    },
    ...(incrementalCoveragePoints.length > 0
      ? [
          {
            label: 'Coverage % (incremental)',
            hint: 'pre-batch, per-entry pipeline',
            suffix: '%',
            domain: [0, 100] as [number, number],
            points: incrementalCoveragePoints,
          },
        ]
      : []),
    {
      label: 'Max repeated trigram',
      hint: 'lower = more varied openers',
      points: scoredHistory.map(({ ranAt, score }) => ({
        ranAt,
        value: score.diversity.maxRepeatedTrigramOpener,
      })),
    },
    {
      label: 'Parts per entry (avg)',
      hint: 'including zeros',
      points: scoredHistory.map(({ ranAt, score }) => ({
        ranAt,
        value: Number(score.parts.partsPerEntry.avg.toFixed(2)),
      })),
    },
    {
      label: 'Citation validity %',
      hint: 'should always be 100',
      suffix: '%',
      domain: [0, 100],
      points: scoredHistory.map(({ ranAt, score }) => ({
        ranAt,
        value: Math.round(score.parts.citationValidity * 100),
      })),
    },
    {
      label: 'Parts extracted',
      hint: 'distinct parts identified',
      points: scoredHistory.map(({ ranAt, score }) => ({
        ranAt,
        value: score.parts.extracted,
      })),
    },
  ]

  const selectedScore = scoreSnapshot(selected)

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-tight flex items-center gap-2">
            {personaEmoji && <span aria-hidden="true">{personaEmoji}</span>}
            {personaName}
          </h1>
          {personaDescription && (
            <p className="text-sm text-muted-foreground mt-1">{personaDescription}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            <Link href="/admin/evals" className="hover:underline">
              ← all personas
            </Link>{' '}
            · {allSnapshots.length} historical snapshot
            {allSnapshots.length === 1 ? '' : 's'} · git <code>{selected.git.sha.slice(0, 7)}</code>
            {selected.git.dirty && <span className="text-amber-500"> [dirty]</span>}
          </p>
        </div>
        <SnapshotPicker options={index} selectedFileName={fileName} />
      </div>

      <section className="space-y-2">
        <h2 className="font-heading text-base">Trend across snapshots</h2>
        <EvalTimeSeries series={series} />
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base">
          Scorecard ·{' '}
          <span className="font-mono text-xs text-muted-foreground">
            {new Date(selected.ranAt).toLocaleString()}
          </span>
        </h2>
        <ScorecardPanel score={selectedScore} />
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base">Parts ({selected.parts.length})</h2>
        <PartsTable snapshot={selected} />
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base">Entries ({selected.entries.length})</h2>
        <EntriesAccordion snapshot={selected} />
      </section>
    </div>
  )
}
