import type { PartsScore, ScorecardSection } from '@/lib/eval/score'

function Indicator({ ok }: { ok: boolean }) {
  return (
    <span
      className={ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
    >
      {ok ? '✓' : '✗'}
    </span>
  )
}

function Row({ label, value, ok }: { label: string; value: React.ReactNode; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-b-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-mono text-xs flex items-center gap-2">
        {value} {ok !== undefined && <Indicator ok={ok} />}
      </dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <dl>{children}</dl>
    </section>
  )
}

export function ScorecardPanel({ score }: { score: ScorecardSection }) {
  const trigramOk = score.diversity.maxRepeatedTrigramOpener <= 5
  const wc = score.wordCount

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 rounded-lg border border-border bg-card p-4">
      <Section title="Run">
        <Row label="entries" value={score.entryCount} />
        <Row label="complete" value={score.complete ? 'yes' : 'no'} />
      </Section>

      <Section title="Word count">
        <Row label="min" value={wc.min} />
        <Row label="p25 / median / p75" value={`${wc.p25} / ${wc.median} / ${wc.p75}`} />
        <Row label="max" value={wc.max} />
      </Section>

      <Section title="Prompt length">
        <Row
          label="min / median / max"
          value={`${score.promptStats.minLength} / ${score.promptStats.medianLength} / ${score.promptStats.maxLength}`}
        />
      </Section>

      <Section title="Forbidden patterns">
        <Row
          label="yes/no openers"
          value={score.forbidden.yesNoOpeners}
          ok={score.forbidden.yesNoOpeners === 0}
        />
        <Row
          label="generic openers"
          value={score.forbidden.genericOpeners}
          ok={score.forbidden.genericOpeners === 0}
        />
        <Row
          label="minimizing closers"
          value={score.forbidden.minimizingClosers}
          ok={score.forbidden.minimizingClosers === 0}
        />
        <Row
          label="banned vocab"
          value={score.forbidden.bannedVocabulary}
          ok={score.forbidden.bannedVocabulary === 0}
        />
      </Section>

      <Section title="Prompt diversity">
        <Row
          label="unique opening verbs"
          value={`${score.diversity.uniqueOpeningVerbs} / ${score.diversity.totalPrompts}`}
        />
        <Row label="proper-noun avg" value={score.diversity.avgProperNounCount.toFixed(2)} />
        <Row
          label="max repeated trigram"
          value={
            <span>
              {score.diversity.maxRepeatedTrigramOpener}
              {score.diversity.mostRepeatedTrigram && (
                <span className="text-muted-foreground">
                  {' '}
                  (“{score.diversity.mostRepeatedTrigram}”)
                </span>
              )}
            </span>
          }
          ok={trigramOk}
        />
      </Section>

      {score.incrementalParts && (
        <PartsSection
          title="Parts (incremental, per-entry)"
          parts={score.incrementalParts}
          showCurated={false}
        />
      )}

      <PartsSection
        title={score.incrementalParts ? 'Parts (batch, post-hoc)' : 'Parts'}
        parts={score.parts}
        deltaVs={score.incrementalParts}
      />
    </div>
  )
}

function PartsSection({
  title,
  parts,
  deltaVs,
  showCurated = true,
}: {
  title: string
  parts: PartsScore
  deltaVs?: PartsScore
  showCurated?: boolean
}) {
  const r = parts.roles
  const coverageOk = parts.entriesWithAttribution / Math.max(parts.entriesTotal, 1) >= 0.8
  const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`)
  const coverageDelta = deltaVs ? parts.entriesWithAttribution - deltaVs.entriesWithAttribution : 0
  const ppDelta = deltaVs ? parts.partsPerEntry.avg - deltaVs.partsPerEntry.avg : 0
  const deltaOk = !deltaVs || (coverageDelta >= 0 && ppDelta >= -0.2)
  return (
    <Section title={title}>
      <Row label="extracted" value={parts.extracted} />
      <Row
        label="coverage"
        value={`${parts.entriesWithAttribution} / ${parts.entriesTotal}`}
        ok={coverageOk}
      />
      <Row
        label="parts per entry"
        value={`min=${parts.partsPerEntry.min} median=${parts.partsPerEntry.median} max=${parts.partsPerEntry.max} avg=${parts.partsPerEntry.avg.toFixed(2)}`}
      />
      <Row
        label="role coverage"
        value={`M=${r.Manager} P=${r.Protector} F=${r.Firefighter} E=${r.Exile}`}
        ok={r.allRolesPresent}
      />
      <Row
        label="highlight density / 1k words"
        value={`min=${parts.highlightDensity.min.toFixed(2)} med=${parts.highlightDensity.median.toFixed(2)} max=${parts.highlightDensity.max.toFixed(2)}`}
      />
      <Row label="citation overlap pairs" value={parts.citationOverlapCount} />
      <Row
        label="citation validity"
        value={`${(parts.citationValidity * 100).toFixed(0)}%`}
        ok={parts.citationValidity >= 0.999}
      />
      {showCurated && <Row label="curated parts" value={parts.curatedCount} />}
      {deltaVs && (
        <Row
          label="delta vs incremental"
          value={`coverage ${sign(coverageDelta)} entries · parts/entry ${sign(Number(ppDelta.toFixed(2)))}`}
          ok={deltaOk}
        />
      )}
    </Section>
  )
}
