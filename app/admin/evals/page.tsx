import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { loadLatestForAllPersonas } from '@/lib/eval/load-snapshots'
import { loadPersona } from '@/lib/eval/persona-loader'
import { scoreSnapshot } from '@/lib/eval/score'

export const dynamic = 'force-dynamic'

interface PersonaCardData {
  slug: string
  name: string
  emoji?: string
  oneLineDescription: string
  ranAt: string
  gitShaShort: string
  entryCount: number
  partsExtracted: number
  coverageNumerator: number
  coverageDenominator: number
  coverageOk: boolean
  citationValidityPct: number
  maxRepeatedTrigram: number
  mostRepeatedTrigram: string
  trigramOk: boolean
  allRolesPresent: boolean
}

async function buildCards(): Promise<PersonaCardData[]> {
  const latest = await loadLatestForAllPersonas()
  const cards: PersonaCardData[] = []
  for (const { slug, snapshot } of latest) {
    const score = scoreSnapshot(snapshot)
    let name = slug
    let emoji: string | undefined
    let oneLineDescription = ''
    try {
      const persona = await loadPersona('evals/personas', slug)
      name = persona.name
      emoji = persona.emoji
      oneLineDescription = persona.oneLineDescription
    } catch {
      // Persona file missing — fall back to slug. Snapshot still renders.
    }
    cards.push({
      slug,
      name,
      emoji,
      oneLineDescription,
      ranAt: snapshot.ranAt,
      gitShaShort: snapshot.git.sha.slice(0, 7),
      entryCount: score.entryCount,
      partsExtracted: score.parts.extracted,
      coverageNumerator: score.parts.entriesWithAttribution,
      coverageDenominator: score.parts.entriesTotal,
      coverageOk: score.parts.entriesWithAttribution / Math.max(score.parts.entriesTotal, 1) >= 0.8,
      citationValidityPct: Math.round(score.parts.citationValidity * 100),
      maxRepeatedTrigram: score.diversity.maxRepeatedTrigramOpener,
      mostRepeatedTrigram: score.diversity.mostRepeatedTrigram,
      trigramOk: score.diversity.maxRepeatedTrigramOpener <= 5,
      allRolesPresent: score.parts.roles.allRolesPresent,
    })
  }
  return cards
}

function Indicator({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
    >
      {ok ? '✓' : '✗'} {label}
    </span>
  )
}

export default async function EvalsIndexPage() {
  const cards = await buildCards()

  if (cards.length === 0) {
    return (
      <div className="text-muted-foreground">
        No eval snapshots found in <code>evals/snapshots/</code>. Run{' '}
        <code>npm run eval &amp;&amp; npm run eval:promote</code> first.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl tracking-tight">Eval snapshots</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Latest <code>latest.json</code> per persona. Click a card for time-series + drill-down.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.slug} className="hover:bg-muted/30 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {c.emoji && (
                  <span aria-hidden="true" className="text-xl">
                    {c.emoji}
                  </span>
                )}
                <Link href={`/admin/evals/${c.slug}`} className="hover:underline">
                  {c.name}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {c.oneLineDescription && (
                <p className="text-muted-foreground">{c.oneLineDescription}</p>
              )}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <dt className="text-muted-foreground">Run</dt>
                <dd>{new Date(c.ranAt).toLocaleString()}</dd>
                <dt className="text-muted-foreground">Git</dt>
                <dd>
                  <code>{c.gitShaShort}</code>
                </dd>
                <dt className="text-muted-foreground">Entries</dt>
                <dd>{c.entryCount}</dd>
                <dt className="text-muted-foreground">Parts</dt>
                <dd>{c.partsExtracted}</dd>
              </dl>
              <ul className="space-y-1 text-xs">
                <li>
                  <Indicator
                    ok={c.coverageOk}
                    label={`coverage ${c.coverageNumerator}/${c.coverageDenominator}`}
                  />
                </li>
                <li>
                  <Indicator
                    ok={c.citationValidityPct === 100}
                    label={`citation validity ${c.citationValidityPct}%`}
                  />
                </li>
                <li>
                  <Indicator
                    ok={c.trigramOk}
                    label={`max repeated opener ${c.maxRepeatedTrigram}${c.mostRepeatedTrigram ? ` (“${c.mostRepeatedTrigram}”)` : ''}`}
                  />
                </li>
                <li>
                  <Indicator ok={c.allRolesPresent} label="all 4 IFS roles present" />
                </li>
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
