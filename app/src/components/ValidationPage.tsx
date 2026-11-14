import { useState } from 'react';
import type { EarthFile, Target } from '../types';
import { FACTOR_LABELS, PRESETS } from '../lib/scoringAdapter';
import { useAsync } from '../lib/useAsync';
import { loadCandidates, loadFrozen, loadReport, type ReportSite, type SetStats, type SiteResult, type ValidationReport } from '../data/validation';
import { ConfidenceBadge, Tag } from './Badges';
import { Absent, DataTable, Loading, Prose, Section, Td } from './InfoParts';

interface Props {
  earth: EarthFile;
  targets: Target[];
  /** Opens the dossier of the grid cell nearest to a site, against one target. */
  onOpenSite: (lat: number, lon: number, targetId: string) => void;
}

const dash = '—';
const f3 = (v: number | null | undefined) => (v === null || v === undefined ? dash : v.toFixed(3));
const f1 = (v: number | null | undefined) => (v === null || v === undefined ? dash : v.toFixed(1));
const pct1 = (v: number | null | undefined) => (v === null || v === undefined ? dash : `${(v * 100).toFixed(1)}%`);
const topOf = (r: SiteResult) => (r.shareAbove === null ? dash : `top ${(Math.max(r.shareAbove, 0.001) * 100).toFixed(1)}%`);
const factorName = (f: string | null) => (f === null ? dash : (FACTOR_LABELS[f as keyof typeof FACTOR_LABELS] ?? f));

function topLimiting(s: SetStats): string {
  const top = Object.entries(s.limitingFactorShare).sort((a, b) => b[1] - a[1])[0];
  return top ? `${factorName(top[0])} (${pct1(top[1])})` : dash;
}

function Stat({ label, value, sub, note }: { label: string; value: string; sub: string; note: string }) {
  return (
    <div className="border border-line bg-bg p-3">
      <p className="label">{label}</p>
      <p className="num mt-1 text-[28px] font-semibold leading-none text-accent">{value}</p>
      <p className="num mt-1.5 text-[11px] uppercase tracking-wider text-muted">{sub}</p>
      <p className="mt-2 text-[12px] text-text">{note}</p>
    </div>
  );
}

function StatsTable({ caption, cols }: { caption: string; cols: { name: string; s: SetStats }[] }) {
  const rows: { label: string; get: (s: SetStats) => string }[] = [
    { label: 'Known sites / negative controls', get: (s) => `${s.knownSites} / ${s.negativeSites}` },
    { label: 'ROC AUC', get: (s) => f3(s.rocAuc) },
    { label: 'Known analogs in the top 10% of Earth cells', get: (s) => pct1(s.top10Share) },
    { label: 'Mean percentile of known analogs', get: (s) => f3(s.meanPercentile) },
    { label: 'Mean score, known / negative (0 to 100)', get: (s) => `${f1(s.meanScoreKnown)} / ${f1(s.meanScoreNegative)}` },
    { label: 'Known sites with no score', get: (s) => String(s.knownSitesUnscored) },
    { label: 'Most common limiting factor', get: topLimiting },
  ];
  return (
    <DataTable caption={caption} headers={['Measure', ...cols.map((c) => c.name)]} numeric={cols.map((_, i) => i + 1)} minWidth={520}>
      {rows.map((r) => (
        <tr key={r.label} className="border-b border-line">
          <Td>{r.label}</Td>
          {cols.map((c) => (
            <Td key={c.name} num>
              {r.get(c.s)}
            </Td>
          ))}
        </tr>
      ))}
    </DataTable>
  );
}

function SiteButton({ site, targetId, onOpen }: { site: ReportSite; targetId: string; onOpen: Props['onOpenSite'] }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(site.lat, site.lon, targetId)}
      title="Open this site's dossier on the globe"
      className="-my-2 min-h-11 text-left text-text underline decoration-line underline-offset-2 hover:text-accent"
    >
      {site.name}
    </button>
  );
}

export function ValidationPage({ earth, targets, onOpenSite }: Props) {
  const [preset, setPreset] = useState(PRESETS[0].id as string);
  const report = useAsync(() => loadReport(preset), preset);
  const candidates = useAsync(loadCandidates, 'candidates');
  const frozen = useAsync(loadFrozen, 'frozen');
  const targetName = (id: string) => targets.find((t) => t.id === id)?.name ?? id;
  const iceCells = earth.cells.filter((c) => c.ndvi === null && c.barrenFrac === 0).length;

  const presetPicker = (
    <div className="flex flex-wrap border-b border-line" role="group" aria-label="Mission preset for these numbers">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          aria-pressed={preset === p.id}
          onClick={() => setPreset(p.id)}
          className={`label min-h-11 border-r border-line px-4 sm:px-6 ${preset === p.id ? 'bg-bg !text-accent' : '!text-text hover:bg-bg'}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  if (report.status === 'loading') return <>{presetPicker}<Loading what="validation report" /></>;
  if (report.status === 'error' || report.value === null)
    return (
      <>
        {presetPicker}
        <Absent what="No validation report was published with this build. Run validation/validate.ts and rebuild." />
      </>
    );

  const r: ValidationReport = report.value;
  const hold = r.sets.holdout;
  const tune = r.sets.tuning;
  const all = r.sets.all;
  const known = r.sites.filter((s) => s.kind === 'known');
  const cases = known.flatMap((s) => s.analogFor.map((t) => ({ site: s, res: s.results[t] })).filter((c) => c.res));
  const nearZero = cases.filter((c) => c.res.score !== null && c.res.score < 1);
  const nearZeroSites = new Set(nearZero.map((c) => c.site.name));
  const cand = candidates.status === 'ready' && candidates.value ? (candidates.value.presets[preset] ?? []) : [];
  const fz = frozen.status === 'ready' ? frozen.value : null;

  return (
    <>
      {presetPicker}

      <Section id="v-status" title="Status" wide>
        <Prose>
          <p>
            <Tag tone="accent">{r.status}</Tag> <span className="ml-1">{r.statusNote}</span>
          </p>
          <p className="text-[13px] text-muted">
            Earth grid: <span className="num">{r.earth.cells.toLocaleString('en-US')}</span> land cells at{' '}
            <span className="num">{r.earth.resolutionDeg}°</span>, built <span className="num">{r.earth.generatedAt}</span>. Report written{' '}
            <span className="num">{r.generatedAt}</span>. Split: <span className="num">{r.split.tuning}</span> tuning sites and{' '}
            <span className="num">{r.split.holdout}</span> hold-out sites, seed <span className="num">{r.split.seed}</span>.
          </p>
          <p className="text-[13px] text-muted">
            Every number on this page is read from the files written by the validation scripts in <span className="num">/validation</span>. None is
            typed into the app. <Tag title="Computed by validation/validate.ts from data/earth.json, targets.json and analogs.json">Measured</Tag>
          </p>
        </Prose>
      </Section>

      <Section id="v-headline" title="Headline: hold-out set" wide>
        <Prose>
          <p>The hold-out sites were never used to choose a tolerance or a weight. These are the numbers to quote.</p>
        </Prose>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="ROC AUC"
            value={f3(hold.overall.rocAuc)}
            sub={`tuning set ${f3(tune.overall.rocAuc)}`}
            note="How often a known analog outscores a negative control. 0.5 is chance, 1.0 is perfect."
          />
          <Stat
            label="In the top 10%"
            value={pct1(hold.overall.top10Share)}
            sub={`tuning set ${pct1(tune.overall.top10Share)}`}
            note="Share of known analogs that land in the best tenth of all Earth cells for their own target."
          />
          <Stat
            label="Mean percentile"
            value={f3(hold.overall.meanPercentile)}
            sub={`tuning set ${f3(tune.overall.meanPercentile)}`}
            note="Mean share of Earth cells a known analog beats or ties. 0.5 is chance. The harder test."
          />
          <Stat
            label="Mean score, known"
            value={f1(hold.overall.meanScoreKnown)}
            sub={`negative controls ${f1(hold.overall.meanScoreNegative)}`}
            note="Out of 100. Low in absolute terms: see the weak results below."
          />
        </div>
        <StatsTable
          caption="Tuning set against hold-out set"
          cols={[
            { name: 'Tuning', s: tune.overall },
            { name: 'Hold-out', s: hold.overall },
            { name: 'Both', s: all.overall },
          ]}
        />
      </Section>

      <Section id="v-weak" title="Weak results" wide>
        <Prose>
          <p>These are reported as they came out. A validation that shows only its good numbers is not one.</p>
          <ul className="space-y-2">
            <li className="border-l-2 border-line pl-3">
              Moon targets do worse than Mars targets. On the hold-out set, <span className="num">{pct1(hold.moon.top10Share)}</span> of known Moon
              analogs reach the top 10% of Earth cells, against <span className="num">{pct1(hold.mars.top10Share)}</span> for Mars.
            </li>
            <li className="border-l-2 border-line pl-3">
              Absolute scores are low. Known analogs average <span className="num">{f1(all.overall.meanScoreKnown)}</span> out of 100 over both sets (
              <span className="num">{f1(all.moon.meanScoreKnown)}</span> for the Moon, <span className="num">{f1(all.mars.meanScoreKnown)}</span> for
              Mars). The most common limiting factor is {topLimiting(all.overall).toLowerCase()}.
            </li>
            <li className="border-l-2 border-line pl-3">
              <span className="num">{nearZeroSites.size}</span> of <span className="num">{known.length}</span> known analog sites score below 1 against
              at least one of their own targets (<span className="num">{nearZero.length}</span> of <span className="num">{cases.length}</span>{' '}
              site-and-target cases). They are in the table below.
            </li>
            {r.warnings.map((w) => (
              <li key={w} className="border-l-2 border-line pl-3">
                {w}
              </li>
            ))}
          </ul>
        </Prose>
        <StatsTable
          caption="Moon targets against Mars targets"
          cols={[
            { name: 'Tuning: Moon', s: tune.moon },
            { name: 'Tuning: Mars', s: tune.mars },
            { name: 'Hold-out: Moon', s: hold.moon },
            { name: 'Hold-out: Mars', s: hold.mars },
          ]}
        />
      </Section>

      <Section id="v-limits" title="Limits of this validation">
        <ul className="space-y-2">
          <li className="border-l-2 border-line pl-3">
            The hold-out set is small: <span className="num">{hold.overall.knownSites}</span> known sites and{' '}
            <span className="num">{hold.overall.negativeSites}</span> controls. One site moving changes the top-10% share by several points. Read
            the hold-out numbers as a check that the tuning-set numbers were not flattered, not as precise estimates.
          </li>
          <li className="border-l-2 border-line pl-3">
            A ROC AUC close to 1 is partly an easy test. The controls are rainforests and cities, which any sensible score separates from deserts.
            The mean percentile compares known analogs with every land cell and is the more useful number.
          </li>
          <li className="border-l-2 border-line pl-3">
            Percentiles are counted over all scored cells. <span className="num">{iceCells.toLocaleString('en-US')}</span> Antarctic cells are all
            ice and score 0. They are real scored cells, but they lift every other site's percentile.
          </li>
          <li className="border-l-2 border-line pl-3">
            Each site is scored at the nearest <span className="num">{r.earth.resolutionDeg}°</span> grid cell, about{' '}
            <span className="num">{Math.round(r.earth.resolutionDeg * 111)}</span> km across. A small site inside a different landscape (an impact
            crater in farmland, an ice-free valley inside an ice cell) is scored as its surroundings.
          </li>
          <li className="border-l-2 border-line pl-3">
            Disclosed: the hold-out sites were seen once, on incomplete data, before the split was drawn. They never influenced a tolerance or a
            weight. One earlier run of the tuning script was voided and changed nothing.
          </li>
          <li className="border-l-2 border-line pl-3">
            The Rover, Ice and Astrobiology presets were not tuned. The validation sites carry no mission-type label, so those presets follow Base
            by fixed differences.
          </li>
        </ul>
      </Section>

      <Section id="v-tuning" title="Tuning and freeze">
        {fz ? (
          <>
            <p>
              One tuning pass was allowed. It tried <span className="num">{fz.evaluations - 1}</span> alternative values on the tuning set and accepted{' '}
              <span className="num">{fz.changes.length}</span>. The objective ({fz.objective.replace(/\.$/, '').toLowerCase()}) was{' '}
              <span className="num">{fz.tuningSet.objectiveBefore.toFixed(3)}</span> before and{' '}
              <span className="num">{fz.tuningSet.objectiveAfter.toFixed(3)}</span> after.
            </p>
            <p>
              {fz.changes.length === 0
                ? 'Every tolerance and weight stays exactly as it was set by rule before any validation run. No alternative did better than random noise produces with this few sites, so accepting one would have been fitting noise.'
                : 'The accepted changes are recorded in validation/tuning/FROZEN.md.'}
            </p>
            <p className="text-[13px] text-muted">
              Frozen on <span className="num">{fz.frozenAt}</span>. {fz.rule}
            </p>
          </>
        ) : (
          <p className="text-muted">The tuning record was not published with this build.</p>
        )}
      </Section>

      <Section id="v-controls" title="Negative controls (must rank low)" wide>
        <DataTable caption="Negative controls" headers={['Site', 'Set', 'Best target', 'Score', 'Best rank']} numeric={[3, 4]}>
          {r.negativeControls.map((n) => (
            <tr key={n.id} className="border-b border-line">
              <Td>{n.name}</Td>
              <Td muted>{n.set}</Td>
              <Td muted>{targetName(n.bestRank.target)}</Td>
              <Td num>{f1(n.bestRank.score)}</Td>
              <Td num>{topOf(n.bestRank)}</Td>
            </tr>
          ))}
        </DataTable>
        <p className="text-[13px] text-muted">Best rank is the highest any control reaches over all seven targets.</p>
      </Section>

      <Section id="v-known" title="Known analogs, scored against their own targets" wide>
        <DataTable
          caption="Known analog sites against their own targets"
          headers={['Site', 'Set', 'Target', 'Score', 'Rank among Earth cells', 'Confidence', 'Limiting factor']}
          numeric={[3, 4]}
          minWidth={860}
        >
          {cases.map(({ site, res }) => (
            <tr key={`${site.id}-${res.target}`} className="border-b border-line">
              <Td>
                <SiteButton site={site} targetId={res.target} onOpen={onOpenSite} />
              </Td>
              <Td muted>{site.set ?? dash}</Td>
              <Td muted>{targetName(res.target)}</Td>
              <Td num>{f1(res.score)}</Td>
              <Td num>{topOf(res)}</Td>
              <Td>
                <ConfidenceBadge confidence={res.confidence} coverage={res.coverage} />
              </Td>
              <Td muted>{factorName(res.limitingFactor)}</Td>
            </tr>
          ))}
        </DataTable>
      </Section>

      <Section id="v-left-out" title="What was left out of the scores">
        <ul className="space-y-1">
          {Object.entries(r.targetsMissingValues)
            .filter(([, keys]) => keys.length > 0)
            .map(([id, keys]) => (
              <li key={id} className="text-[13px]">
                {targetName(id)}: no published value for <span className="num">{keys.join(', ')}</span>.
              </li>
            ))}
        </ul>
      </Section>

      <Section id="v-candidates" title="Indonesian candidate sites" wide>
        <Prose>
          <p>
            The candidates took no part in tuning or validation. They are specialist analogs (volcanic rock, acid crater lakes, lava tubes), not
            all-round matches, because Indonesia is wet and vegetated. On the all-round score they rank low, and that is the honest result.
          </p>
        </Prose>
        {cand.length === 0 ? (
          <p className="text-muted">No candidate scores were published with this build.</p>
        ) : (
          <DataTable
            caption="Indonesian candidate sites against their own targets"
            headers={['Site', 'Target', 'Score', 'Rank among Earth cells', 'Confidence', 'Limiting factor', 'Why']}
            numeric={[2, 3]}
            minWidth={980}
          >
            {cand.flatMap((site) =>
              site.analogFor
                .map((t) => site.results[t])
                .filter(Boolean)
                .map((res) => (
                  <tr key={`${site.id}-${res.target}`} className="border-b border-line">
                    <Td>
                      <SiteButton site={site} targetId={res.target} onOpen={onOpenSite} />
                    </Td>
                    <Td muted>{targetName(res.target)}</Td>
                    <Td num>{f1(res.score)}</Td>
                    <Td num>{topOf(res)}</Td>
                    <Td>
                      <ConfidenceBadge confidence={res.confidence} coverage={res.coverage} />
                    </Td>
                    <Td muted>{factorName(res.limitingFactor)}</Td>
                    <Td muted>{res.reason}</Td>
                  </tr>
                )),
            )}
          </DataTable>
        )}
      </Section>

      <Section id="v-defs" title="How the measures are defined">
        <dl className="space-y-2">
          {Object.entries(r.definitions).map(([k, v]) => (
            <div key={k}>
              <dt className="num text-[12px] text-muted">{k}</dt>
              <dd className="text-[13px] text-text">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}
