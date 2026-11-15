import { useState } from 'react';
import type { EarthFile, Target } from '../types';
import { FACTOR_LABELS, PRESETS } from '../lib/scoringAdapter';
import { useAsync } from '../lib/useAsync';
import { loadCandidates, loadFrozen, loadPurposes, loadReport, type ReportSite, type SetStats, type SiteResult, type ValidationReport } from '../data/validation';
import { ConfidenceBadge, Tag } from './Badges';
import { Absent, DataTable, Loading, Td } from './InfoParts';
import { Block, CountUp, Mark, Meter, More, Rv, useSeen } from './ValidationParts';
import { PercentileStrips, StripAxis, StripLegend, type StripRowData } from './ValidationStrip';

interface Props {
  earth: EarthFile;
  targets: Target[];
  /** Opens the dossier of the grid cell nearest to a site, against one target. */
  onOpenSite: (lat: number, lon: number, targetId: string) => void;
}

const dash = 'no data';
const f3 = (v: number | null | undefined) => (v === null || v === undefined ? dash : v.toFixed(3));
const f1 = (v: number | null | undefined) => (v === null || v === undefined ? dash : v.toFixed(1));
const pct1 = (v: number | null | undefined) => (v === null || v === undefined ? dash : `${(v * 100).toFixed(1)}%`);
const topOf = (r: SiteResult) => (r.shareAbove === null ? dash : `top ${(Math.max(r.shareAbove, 0.001) * 100).toFixed(1)}%`);
const factorName = (f: string | null) => (f === null ? dash : (FACTOR_LABELS[f as keyof typeof FACTOR_LABELS] ?? f));
/** Percentile on the 0 to 100 axis: the share of Earth cells the site scores above or ties. */
const pctOf = (r: SiteResult | undefined): number | null => (r && r.shareAbove !== null ? (1 - r.shareAbove) * 100 : null);
const short = (name: string) => name.split(',')[0];

function topLimiting(s: SetStats): string {
  const top = Object.entries(s.limitingFactorShare).sort((a, b) => b[1] - a[1])[0];
  return top ? `${factorName(top[0])} (${pct1(top[1])})` : dash;
}

/** One plain word for a mean percentile (0 to 1). Chance is 0.5. */
function verdict(p: number | null): string {
  if (p === null) return 'have no score';
  return p >= 0.7 ? 'rank well' : p >= 0.58 ? 'rank weakly' : 'sit near chance';
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
      title="Open the dossier of this site's grid cell"
      className="-my-2 min-h-11 text-left text-text underline decoration-line underline-offset-2 hover:text-accent"
    >
      {site.name}
    </button>
  );
}

/** One body, one big number: how far up the Earth ranking its known analogs land. */
function BodyResult({ name, hold, tune, index }: { name: string; hold: SetStats; tune: SetStats; index: number }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const p = hold.meanPercentile;
  return (
    <Rv i={index}>
      <div ref={ref} className="border-t border-line pt-6">
        <p className="label">{name} targets, hold-out sites</p>
        <p className="display-xl mt-3 text-[84px] text-text sm:text-[120px]">
          <CountUp value={p === null ? null : p * 100} play={seen} suffix="" />
          {p !== null && <span className="ml-1 text-[36px] text-muted sm:text-[48px]">%</span>}
        </p>
        <p className="mt-3 max-w-[40ch] text-[16px] leading-[26px] text-text">
          A known {name} analog scores above {p === null ? dash : `${(p * 100).toFixed(0)}%`} of Earth cells on average. Chance would be 50%.
        </p>
        <div className="mt-6">
          <Meter value={p} tick={0.5} tickLabel="Chance, 50%" label={`${name} mean percentile, hold-out`} height={10} />
          <div className="num mt-2 flex justify-between text-[12px] text-muted">
            <span>0</span>
            <span>chance</span>
            <span>100</span>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-3 gap-4">
          <div>
            <dt className="label">In the top 10%</dt>
            <dd className="num mt-1 text-[22px] font-semibold text-text">{pct1(hold.top10Share)}</dd>
            <dd className="num text-[11px] text-muted">tuning {pct1(tune.top10Share)}</dd>
          </div>
          <div>
            <dt className="label">ROC AUC</dt>
            <dd className="num mt-1 text-[22px] font-semibold text-text">{f3(hold.rocAuc)}</dd>
            <dd className="num text-[11px] text-muted">tuning {f3(tune.rocAuc)}</dd>
          </div>
          <div>
            <dt className="label">Mean score</dt>
            <dd className="num mt-1 text-[22px] font-semibold text-text">{f1(hold.meanScoreKnown)}</dd>
            <dd className="num text-[11px] text-muted">of 100</dd>
          </div>
        </dl>
      </div>
    </Rv>
  );
}

/** A headline figure that counts up once on screen. */
function BigStat({ label, value, decimals, suffix, sub, note, index }: { label: string; value: number | null; decimals: number; suffix?: string; sub: string; note: string; index: number }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  return (
    <Rv i={index}>
      <div ref={ref} className="border-t border-line pt-4">
        <p className="label">{label}</p>
        <p className="display mt-2 text-[44px] leading-none text-text">
          <CountUp value={value} decimals={decimals} play={seen} suffix={suffix} />
        </p>
        <p className="num mt-2 text-[12px] text-muted">{sub}</p>
        <p className="mt-2 text-[13px] leading-5 text-text">{note}</p>
      </div>
    </Rv>
  );
}

/** Three plain facts about the weak results, each with a picture. */
function WeakCard({ title, children, index }: { title: string; children: React.ReactNode; index: number }) {
  return (
    <Rv i={index}>
      <div className="h-full border-t border-line pt-5">
        <h4 className="display text-[22px] leading-7 text-text">{title}</h4>
        <div className="mt-4 space-y-4">{children}</div>
      </div>
    </Rv>
  );
}

function PairBars({ rows, unit }: { rows: { label: string; v: number | null; text: string }[]; unit: string }) {
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="text-text">{r.label}</span>
            <span className="num text-text">{r.text}</span>
          </div>
          <div className="mt-1.5">
            <Meter value={r.v} label={`${r.label}, ${unit}`} height={8} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ValidationPage({ earth, targets, onOpenSite }: Props) {
  const [preset, setPreset] = useState(PRESETS[0].id as string);
  const report = useAsync(() => loadReport(preset), preset);
  const candidates = useAsync(loadCandidates, 'candidates');
  const frozen = useAsync(loadFrozen, 'frozen');
  const purposes = useAsync(loadPurposes, 'purposes');
  const pv = purposes.status === 'ready' ? purposes.value : null;
  const targetName = (id: string) => targets.find((t) => t.id === id)?.name ?? id;
  const iceCells = earth.cells.filter((c) => c.ndvi === null && c.barrenFrac === 0).length;

  const presetPicker = (
    <div className="tabs flex-wrap px-2 sm:px-3" role="group" aria-label="Mission preset for these numbers">
      {PRESETS.map((p) => (
        <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => setPreset(p.id)} className="tab sm:!px-5">
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
  const negatives = r.sites.filter((s) => s.kind === 'negative');
  const cases = known.flatMap((s) => s.analogFor.map((t) => ({ site: s, res: s.results[t] })).filter((c) => c.res));
  const nearZero = cases.filter((c) => c.res.score !== null && c.res.score < 1);
  const nearZeroSites = new Set(nearZero.map((c) => c.site.name));
  const cand = candidates.status === 'ready' && candidates.value ? (candidates.value.presets[preset] ?? []) : [];
  const fz = frozen.status === 'ready' ? frozen.value : null;

  // One row per target: every known analog of it and every negative control, on the percentile axis.
  const targetIds = [...new Set(cases.map((c) => c.res.target))].sort((a, b) => Number(b.startsWith('mars')) - Number(a.startsWith('mars')));
  const rows: StripRowData[] = targetIds.map((id) => {
    const mine = cases.filter((c) => c.res.target === id).flatMap((c) => {
      const p = pctOf(c.res);
      return p === null ? [] : [{ site: c.site, res: c.res, p }];
    });
    const items = [
      ...mine.map(({ site, res, p }) => ({
        key: `k-${site.id}`,
        kind: (site.set === 'holdout' ? 'holdout' : 'tuning') as 'holdout' | 'tuning',
        pct: p,
        title: `${short(site.name)} (${site.set === 'holdout' ? 'hold-out' : 'tuning'}): score ${f1(res.score)}, above ${p.toFixed(1)}% of Earth cells`,
      })),
      ...negatives.flatMap((n) => {
        const p = pctOf(n.results[id]);
        return p === null ? [] : [{ key: `n-${n.id}`, kind: 'negative' as const, pct: p, title: `Negative control ${short(n.name)}: score ${f1(n.results[id].score)}, above ${p.toFixed(1)}% of Earth cells` }];
      }),
    ];
    const mean = mine.length ? mine.reduce((a, c) => a + c.p, 0) / mine.length : null;
    return { id, label: targetName(id), sub: `${mine.length} known sites`, items, end: mean === null ? dash : `mean ${mean.toFixed(0)}` };
  });
  const bestControl = Math.max(0, ...r.negativeControls.map((n) => pctOf(n.bestRank) ?? 0));

  const purposeRows: StripRowData[] = pv
    ? pv.byPurpose.map((p) => ({
        id: p.purpose,
        label: p.label,
        sub: `${p.sitesUsedForIt.length} sites used`,
        items: [
          { key: 'a', kind: 'holdout', pct: (p.onPurposeRanking.meanPercentile ?? 0) * 100, title: `${p.label}, on the purpose ranking: ${f3(p.onPurposeRanking.meanPercentile)}` },
          { key: 'b', kind: 'tuning', pct: (p.sameSitesOnAllRoundScore.meanPercentile ?? 0) * 100, title: `${p.label}, same sites on the all-round match: ${f3(p.sameSitesOnAllRoundScore.meanPercentile)}` },
          { key: 'c', kind: 'other', pct: (p.otherKnownSitesOnPurposeRanking.meanPercentile ?? 0) * 100, title: `${p.label}, other known sites on the purpose ranking: ${f3(p.otherKnownSitesOnPurposeRanking.meanPercentile)}` },
        ].filter((_, i) => [p.onPurposeRanking, p.sameSitesOnAllRoundScore, p.otherKnownSitesOnPurposeRanking][i].meanPercentile !== null) as StripRowData['items'],
        end: f3(p.onPurposeRanking.meanPercentile),
      }))
    : [];
  const dimRows: StripRowData[] = pv
    ? pv.byDimension.map((d) => ({
        id: d.dimension,
        label: d.label,
        sub: `${d.sitesKnownForIt.sites} sites known for it`,
        items: [
          { key: 'a', kind: 'holdout', pct: (d.sitesKnownForIt.meanPercentile ?? 0) * 100, title: `${d.label}, sites known for it: ${f3(d.sitesKnownForIt.meanPercentile)}` },
          { key: 'c', kind: 'other', pct: (d.otherKnownSites.meanPercentile ?? 0) * 100, title: `${d.label}, other known sites: ${f3(d.otherKnownSites.meanPercentile)}` },
        ].filter((_, i) => [d.sitesKnownForIt, d.otherKnownSites][i].meanPercentile !== null) as StripRowData['items'],
        end: f3(d.sitesKnownForIt.meanPercentile),
      }))
    : [];

  const limiting = Object.entries(all.overall.limitingFactorShare).sort((a, b) => b[1] - a[1]);

  const limits: { key: string; head: string; body: React.ReactNode }[] = [
    {
      key: `${hold.overall.knownSites} + ${hold.overall.negativeSites}`,
      head: 'The hold-out set is small',
      body: (
        <>
          <span className="num">{hold.overall.knownSites}</span> known sites and <span className="num">{hold.overall.negativeSites}</span> controls. One site moving changes the top-10%
          share by several points. Read the hold-out numbers as a check on the tuning-set numbers, not as precise estimates.
        </>
      ),
    },
    {
      key: f3(hold.overall.rocAuc),
      head: 'The ROC AUC test is easy',
      body: (
        <>
          A ROC AUC close to 1 partly reflects an easy test. The controls are rainforests and cities, which any reasonable score separates from deserts. The mean percentile compares known
          analogs with every land cell and is the more useful number.
        </>
      ),
    },
    {
      key: iceCells.toLocaleString('en-US'),
      head: 'Antarctic ice lifts percentiles',
      body: (
        <>
          Percentiles are counted over all scored cells. <span className="num">{iceCells.toLocaleString('en-US')}</span> Antarctic cells are all ice and score 0. They are real scored cells, but
          they lift every other site&apos;s percentile.
        </>
      ),
    },
    {
      key: `${Math.round(r.earth.resolutionDeg * 111)} km`,
      head: 'One grid cell per site',
      body: (
        <>
          Each site is scored at the nearest <span className="num">{r.earth.resolutionDeg}°</span> grid cell, about <span className="num">{Math.round(r.earth.resolutionDeg * 111)}</span> km across. A small
          site inside a different landscape (an impact crater in farmland, an ice-free valley inside an ice cell) is scored as its surroundings.
        </>
      ),
    },
    {
      key: 'Seen once',
      head: 'Disclosed',
      body: (
        <>
          The hold-out sites were seen once, on incomplete data, before the split was drawn. They never influenced a tolerance or a weight. One earlier run of the tuning script was voided and
          changed nothing.
        </>
      ),
    },
    {
      key: '3 presets',
      head: 'Three presets were not tuned',
      body: (
        <>
          The Rover, Ice and Astrobiology presets were not tuned. The validation sites carry no mission-type label, so those presets follow Base by fixed differences.
        </>
      ),
    },
  ];

  return (
    <>
      {presetPicker}

      {/* The result in one screen */}
      <section id="v-status" aria-labelledby="v-result" className="px-5 pb-16 pt-14 sm:px-10 sm:pt-20 lg:px-16">
        <Rv>
          <p className="label">The result, hold-out sites</p>
          <h3 id="v-result" className="display-xl mt-3 max-w-[18ch] text-[40px] sm:text-[72px]">
            Mars analogs {verdict(hold.mars.meanPercentile)}. Moon analogs {verdict(hold.moon.meanPercentile)}.
          </h3>
          <p className="mt-5 max-w-[60ch] text-[16px] leading-[26px] text-muted">
            The hold-out sites were never used to choose a tolerance or a weight. These are the numbers to quote.
          </p>
          <p className="mt-4 flex flex-wrap items-center gap-2 text-[14px] text-text">
            <Tag tone="accent">{r.status}</Tag>
            <span>{r.statusNote}</span>
          </p>
        </Rv>
        <div className="mt-14 grid gap-x-16 gap-y-12 md:grid-cols-2">
          <BodyResult name="Mars" hold={hold.mars} tune={tune.mars} index={0} />
          <BodyResult name="Moon" hold={hold.moon} tune={tune.moon} index={1} />
        </div>

        <div className="mt-16 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          <BigStat
            index={0}
            label="ROC AUC, both bodies"
            value={hold.overall.rocAuc}
            decimals={3}
            sub={`tuning set ${f3(tune.overall.rocAuc)}`}
            note="How often a known analog outscores a negative control. 0.5 is chance, 1.0 is perfect."
          />
          <BigStat
            index={1}
            label="In the top 10%"
            value={hold.overall.top10Share === null ? null : hold.overall.top10Share * 100}
            decimals={1}
            suffix="%"
            sub={`tuning set ${pct1(tune.overall.top10Share)}`}
            note="Share of known analogs that land in the best tenth of all Earth cells for their own target."
          />
          <BigStat
            index={2}
            label="Mean percentile"
            value={hold.overall.meanPercentile}
            decimals={3}
            sub={`tuning set ${f3(tune.overall.meanPercentile)}`}
            note="Mean share of Earth cells a known analog scores above or ties. 0.5 is chance. The harder test."
          />
          <BigStat
            index={3}
            label="Mean score, known"
            value={hold.overall.meanScoreKnown}
            decimals={1}
            suffix=" / 100"
            sub={`negative controls ${f1(hold.overall.meanScoreNegative)}`}
            note="Low in absolute terms. See what did not work."
          />
        </div>
        <Rv className="mt-10 max-w-[1100px]">
          <More title="Tuning set against hold-out set, every measure">
            <StatsTable
              caption="Tuning set against hold-out set"
              cols={[
                { name: 'Tuning', s: tune.overall },
                { name: 'Hold-out', s: hold.overall },
                { name: 'Both', s: all.overall },
              ]}
            />
          </More>
          <More title="Run details" className="!border-t-0">
            <p className="text-[13px] leading-5 text-muted">
              Earth grid: <span className="num">{r.earth.cells.toLocaleString('en-US')}</span> land cells at <span className="num">{r.earth.resolutionDeg}°</span>, built{' '}
              <span className="num">{r.earth.generatedAt}</span>. Report written <span className="num">{r.generatedAt}</span>. Split: <span className="num">{r.split.tuning}</span> tuning sites and{' '}
              <span className="num">{r.split.holdout}</span> hold-out sites, seed <span className="num">{r.split.seed}</span>.
            </p>
            <p className="text-[13px] leading-5 text-muted">
              Every number on this page is read from the files written by the validation scripts in <span className="num">/validation</span>. None is typed into the app.{' '}
              <Tag title="Computed by validation/validate.ts from data/earth.json, targets.json and analogs.json">Measured</Tag>
            </p>
          </More>
        </Rv>
      </section>

      {/* Every site on one axis */}
      <Block
        id="v-known"
        label="Known analogs"
        title="Every known analog, against its own targets."
        lead="Each mark is one site, placed by the share of Earth cells it outscores for that target. Further right is better. Marks left of the dashed line do worse than a random cell."
      >
        <Rv className="max-w-[1100px]">
          <StripLegend
            kinds={[
              { kind: 'holdout', text: 'Hold-out site' },
              { kind: 'tuning', text: 'Tuning site' },
              { kind: 'negative', text: 'Negative control' },
            ]}
          />
          <div className="mt-6">
            <PercentileStrips rows={rows} label="Percentile of every known analog and negative control, one row per target. Details are in the tables below." />
            <StripAxis />
          </div>
          <p className="mt-3 text-[13px] leading-5 text-muted">
            Percentile is the share of Earth cells the site scores above or ties, for that target. The mean is over the known sites in the row.
          </p>
          <div className="mt-6">
            <More title={`All ${cases.length} site-and-target cases, with scores and limiting factors`}>
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
            </More>
          </div>
        </Rv>
      </Block>

      {/* Negative controls */}
      <Block
        id="v-controls"
        label="Negative controls"
        title="Where the wrong places land."
        lead={
          <>
            Rainforests and similar places should never look like a Moon or Mars base. The highest any control reaches, over every target, is the{' '}
            <span className="num text-text">{bestControl.toFixed(0)}</span>
            th percentile.
          </>
        }
      >
        <Rv className="max-w-[1100px]">
          <StripLegend kinds={[{ kind: 'negative', text: 'Control, at its best rank' }]} />
          <div className="mt-6">
            <PercentileStrips
              label="Best percentile reached by each negative control"
              rows={r.negativeControls.map((n) => {
                const p = pctOf(n.bestRank);
                return {
                  id: n.id,
                  label: short(n.name),
                  sub: `${n.set} set`,
                  items: p === null ? [] : [{ key: n.id, kind: 'negative' as const, pct: p, title: `${short(n.name)}: score ${f1(n.bestRank.score)}, ${topOf(n.bestRank)}` }],
                  end: p === null ? dash : `${p.toFixed(0)}`,
                };
              })}
            />
            <StripAxis />
          </div>
          <p className="mt-3 text-[13px] leading-5 text-muted">
            Best rank is the highest any control reaches over the targets in the report. The number at the end of each row is that percentile.
          </p>
          <div className="mt-6">
            <More title="Control scores and best targets">
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
            </More>
          </div>
        </Rv>
      </Block>

      {/* Weak results */}
      <Block
        id="v-weak"
        label="What did not work"
        title="The weak results, as computed."
        lead="Nothing here is hidden or rounded up. The Moon is the weaker body, absolute scores are low, and some sites score close to zero."
      >
        <div className="grid max-w-[1100px] gap-x-12 gap-y-10 lg:grid-cols-3">
          <WeakCard index={0} title="The Moon trails Mars">
            <PairBars
              unit="share of known analogs in the top 10%"
              rows={[
                { label: 'Mars targets', v: hold.mars.top10Share, text: pct1(hold.mars.top10Share) },
                { label: 'Moon targets', v: hold.moon.top10Share, text: pct1(hold.moon.top10Share) },
              ]}
            />
            <p className="text-[14px] leading-[22px] text-muted">
              On the hold-out set, <span className="num text-text">{pct1(hold.moon.top10Share)}</span> of known Moon analogs reach the top 10% of Earth cells, against{' '}
              <span className="num text-text">{pct1(hold.mars.top10Share)}</span> for Mars.
            </p>
          </WeakCard>

          <WeakCard index={1} title="Absolute scores are low">
            <PairBars
              unit="mean score of known analogs, out of 100"
              rows={[
                { label: 'Both bodies', v: all.overall.meanScoreKnown === null ? null : all.overall.meanScoreKnown / 100, text: f1(all.overall.meanScoreKnown) },
                { label: 'Mars', v: all.mars.meanScoreKnown === null ? null : all.mars.meanScoreKnown / 100, text: f1(all.mars.meanScoreKnown) },
                { label: 'Moon', v: all.moon.meanScoreKnown === null ? null : all.moon.meanScoreKnown / 100, text: f1(all.moon.meanScoreKnown) },
              ]}
            />
            <p className="text-[14px] leading-[22px] text-muted">
              Known analogs average <span className="num text-text">{f1(all.overall.meanScoreKnown)}</span> out of 100 over both sets. The most common limiting factor is{' '}
              {topLimiting(all.overall).toLowerCase()}.
            </p>
          </WeakCard>

          <WeakCard index={2} title="Some sites score near zero">
            <div className="flex flex-wrap gap-1.5" role="img" aria-label={`${nearZeroSites.size} of ${known.length} known analog sites score below 1 against at least one of their own targets`}>
              {known.map((s) => (
                <span
                  key={s.id}
                  title={`${short(s.name)}${nearZeroSites.has(s.name) ? ': scores below 1 against at least one own target' : ''}`}
                  className={`block h-5 w-5 ${nearZeroSites.has(s.name) ? 'bg-accent' : 'border border-line bg-bg'}`}
                />
              ))}
            </div>
            <p className="text-[14px] leading-[22px] text-muted">
              <span className="num text-text">{nearZeroSites.size}</span> of <span className="num text-text">{known.length}</span> known analog sites (amber) score below 1 against at least one of
              their own targets: <span className="num text-text">{nearZero.length}</span> of <span className="num text-text">{cases.length}</span> site-and-target cases.
            </p>
          </WeakCard>
        </div>

        <Rv className="mt-12 max-w-[1100px]">
          <h4 className="display text-[22px] leading-7 text-text">What holds the scores back</h4>
          <p className="mt-2 max-w-[60ch] text-[14px] leading-[22px] text-muted">Share of known-analog cases in which each factor is the weakest link, over both sets.</p>
          <ul className="mt-5 grid gap-x-10 gap-y-3 sm:grid-cols-2">
            {limiting.map(([id, share], k) => (
              <li key={id} className="grid grid-cols-[110px_minmax(0,1fr)_52px] items-center gap-3">
                <span className="text-[13px] text-text">{factorName(id)}</span>
                <Meter value={share} label={`${factorName(id)}, share of cases where it limits the score`} height={8} tone={k === 0 ? 'accent' : 'muted'} />
                <span className="num text-right text-[13px] text-text">{pct1(share)}</span>
              </li>
            ))}
          </ul>
          {r.warnings.length > 0 && (
            <ul className="mt-8 space-y-2">
              {r.warnings.map((w) => (
                <li key={w} className="max-w-[72ch] border-l-2 border-accent pl-3 text-[14px] leading-[22px] text-text">
                  {w}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-8">
            <More title="Moon targets against Mars targets, every measure">
              <StatsTable
                caption="Moon targets against Mars targets"
                cols={[
                  { name: 'Tuning: Moon', s: tune.moon },
                  { name: 'Tuning: Mars', s: tune.mars },
                  { name: 'Hold-out: Moon', s: hold.moon },
                  { name: 'Hold-out: Mars', s: hold.mars },
                ]}
              />
            </More>
            <More title="Sites that score below 1" className="!border-t-0">
              <ul className="space-y-1.5">
                {nearZero.map(({ site, res }) => (
                  <li key={`${site.id}-${res.target}`} className="text-[13px] text-text">
                    {site.name}, {targetName(res.target)}: <span className="num">{f1(res.score)}</span>
                  </li>
                ))}
              </ul>
            </More>
          </div>
        </Rv>
      </Block>

      {/* Limits */}
      <Block id="v-limits" label="Limits" title="Where this validation stops." lead="Six reasons to read the numbers above with care.">
        <ul className="grid max-w-[1100px] gap-x-12 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {limits.map((l, k) => (
            <li key={l.head}>
              <Rv i={k % 3}>
                <div className="h-full border-t border-line pt-4">
                  <p className="display num text-[34px] leading-none text-text">{l.key}</p>
                  <h4 className="mt-3 text-[15px] font-semibold text-text">{l.head}</h4>
                  <p className="mt-2 text-[14px] leading-[22px] text-muted">{l.body}</p>
                </div>
              </Rv>
            </li>
          ))}
        </ul>
      </Block>

      {/* Tuning and freeze */}
      <Block id="v-tuning" label="Tuning and freeze" title="One tuning pass, then frozen." size="m">
        {fz ? (
          <Rv className="max-w-[1100px]">
            <div className="grid gap-x-12 gap-y-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="flex items-end gap-5">
                  <div>
                    <p className="label">Objective before</p>
                    <p className="display num mt-1 text-[48px] leading-none text-muted">{fz.tuningSet.objectiveBefore.toFixed(3)}</p>
                  </div>
                  <span className="display pb-2 text-[28px] text-muted" aria-hidden="true">
                    →
                  </span>
                  <div>
                    <p className="label">after</p>
                    <p className="display num mt-1 text-[48px] leading-none text-text">{fz.tuningSet.objectiveAfter.toFixed(3)}</p>
                  </div>
                </div>
                <Meter value={fz.tuningSet.objectiveAfter} tick={fz.tuningSet.objectiveBefore} tickLabel="Before tuning" label="Tuning objective, after, with the value before marked" />
                <p className="text-[14px] leading-[22px] text-muted">
                  The objective ({fz.objective.replace(/\.$/, '').toLowerCase()}) on the tuning set. The tick marks the value before.
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-[15px] leading-6 text-text">
                  One tuning pass was allowed. It tried <span className="num">{fz.evaluations - 1}</span> alternative values on the tuning set and accepted <span className="num">{fz.changes.length}</span>.
                </p>
                <p className="text-[14px] leading-[22px] text-muted">
                  {fz.changes.length === 0
                    ? 'Every tolerance and weight stays exactly as it was set by rule before any validation run. No alternative did better than random noise produces with this few sites, so accepting one would have been fitting noise.'
                    : 'The accepted changes are recorded in validation/tuning/FROZEN.md.'}
                </p>
                <p className="text-[13px] text-muted">
                  Frozen on <span className="num">{fz.frozenAt}</span>. {fz.rule}
                </p>
              </div>
            </div>
          </Rv>
        ) : (
          <p className="text-[14px] text-muted">No data. The tuning record was not published with this build.</p>
        )}
      </Block>

      {/* Proposed Indonesian sites */}
      <Block
        id="v-candidates"
        label="Proposed Indonesian sites"
        title="The new analogs rank low on the all-round match."
        lead="The proposed sites took no part in tuning or validation. They are specialist analogs (volcanic rock, acid crater lakes, lava tubes), not all-round matches, because Indonesia is wet and vegetated."
      >
        {cand.length === 0 ? (
          <p className="text-[14px] text-muted">No data. Scores for the proposed sites were not published with this build.</p>
        ) : (
          <Rv className="max-w-[1100px]">
            <StripLegend kinds={[{ kind: 'other', text: 'Proposed site against one of its targets' }]} />
            <div className="mt-6">
              <PercentileStrips
                label="Percentile of each proposed Indonesian site against its own targets"
                rows={cand.flatMap((site) =>
                  site.analogFor
                    .map((t) => site.results[t])
                    .filter(Boolean)
                    .map((res) => {
                      const p = pctOf(res);
                      return {
                        id: `${site.id}-${res.target}`,
                        label: short(site.name),
                        sub: targetName(res.target),
                        items: p === null ? [] : [{ key: `${site.id}-${res.target}`, kind: 'other' as const, pct: p, title: `${site.name}, ${targetName(res.target)}: score ${f1(res.score)}, ${topOf(res)}` }],
                        end: f1(res.score),
                      };
                    }),
                )}
              />
              <StripAxis />
            </div>
            <p className="mt-3 text-[13px] leading-5 text-muted">The number at the end of each row is the score, 0 to 100.</p>
            <div className="mt-6">
              <More title="Scores, limiting factors and why each site is proposed">
                <DataTable
                  caption="Proposed Indonesian sites against their own targets"
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
              </More>
            </div>
          </Rv>
        )}
      </Block>

      {/* Purposes */}
      {pv && (
        <Block id="v-purposes" label="Match by purpose: development numbers" title="Do purpose rankings help?" lead={pv.caveat}>
          <Rv className="max-w-[1100px]">
            <p className="max-w-[64ch] text-[15px] leading-6 text-text">
              The test: do the sites used for a purpose rank higher on that purpose&apos;s ranking than on the all-round match, and higher than the other known sites? Where the diamond is not to the
              right of the other two marks, the purpose ranking did not help.
            </p>
            <div className="mt-6">
              <StripLegend
                kinds={[
                  { kind: 'holdout', text: 'On the purpose ranking' },
                  { kind: 'tuning', text: 'Same sites, all-round match' },
                  { kind: 'other', text: 'Other known sites, purpose ranking' },
                ]}
              />
            </div>
            <div className="mt-6">
              <PercentileStrips rows={purposeRows} label="Mean percentile by purpose: on the purpose ranking, same sites on the all-round match, other known sites" />
              <StripAxis />
            </div>
            <h4 className="display mt-12 text-[22px] leading-7 text-text">By dimension</h4>
            <div className="mt-4">
              <StripLegend
                kinds={[
                  { kind: 'holdout', text: 'Sites known for it' },
                  { kind: 'other', text: 'Other known sites' },
                ]}
              />
            </div>
            <div className="mt-4">
              <PercentileStrips rows={dimRows} label="Mean percentile by dimension: sites known for it, other known sites" />
              <StripAxis />
            </div>
            <p className="mt-3 text-[13px] leading-5 text-muted">Mean percentile, 0.5 is chance. {pv.percentile}</p>
            <p className="mt-2 text-[13px] leading-5 text-muted">
              Share of Earth cells with the same rock class as the target:{' '}
              {Object.entries(pv.shareOfEarthCellsWithTheSameRockClassAsTheTarget)
                .map(([id, v]) => `${targetName(id)} ${v === null ? 'no data' : pct1(v)}`)
                .join(', ')}
              .
            </p>
            <div className="mt-6">
              <More title="Purpose and dimension tables">
                <DataTable
                  caption="Purpose rankings against the all-round match"
                  headers={['Purpose', 'Sites used for it', 'On the purpose ranking', 'Same sites, all-round match', 'Other known sites, purpose ranking']}
                  numeric={[1, 2, 3, 4]}
                  minWidth={820}
                >
                  {pv.byPurpose.map((p) => (
                    <tr key={p.purpose} className="border-b border-line">
                      <Td>{p.label}</Td>
                      <Td num>{p.sitesUsedForIt.length}</Td>
                      <Td num>{f3(p.onPurposeRanking.meanPercentile)}</Td>
                      <Td num>{f3(p.sameSitesOnAllRoundScore.meanPercentile)}</Td>
                      <Td num>{f3(p.otherKnownSitesOnPurposeRanking.meanPercentile)}</Td>
                    </tr>
                  ))}
                </DataTable>
                <DataTable caption="Dimensions" headers={['Dimension', 'Sites known for it', 'Their mean percentile', 'Other known sites']} numeric={[1, 2, 3]} minWidth={620}>
                  {pv.byDimension.map((d) => (
                    <tr key={d.dimension} className="border-b border-line">
                      <Td>{d.label}</Td>
                      <Td num>{d.sitesKnownForIt.sites}</Td>
                      <Td num>{f3(d.sitesKnownForIt.meanPercentile)}</Td>
                      <Td num>{f3(d.otherKnownSites.meanPercentile)}</Td>
                    </tr>
                  ))}
                </DataTable>
              </More>
            </div>
          </Rv>
        </Block>
      )}

      {/* Details */}
      <section aria-labelledby="v-details" className="px-5 pb-24 pt-10 sm:px-10 lg:px-16">
        <h3 id="v-details" className="sr-only">
          Definitions and gaps
        </h3>
        <div className="max-w-[1100px]">
          <More title="What was left out of the scores">
            <ul id="v-left-out" className="space-y-1.5">
              {Object.entries(r.targetsMissingValues)
                .filter(([, keys]) => keys.length > 0)
                .map(([id, keys]) => (
                  <li key={id} className="text-[13px] text-text">
                    {targetName(id)}: no published value for <span className="num">{keys.join(', ')}</span>.
                  </li>
                ))}
            </ul>
          </More>
          <More title="How the measures are defined" className="!border-t-0">
            <dl id="v-defs" className="space-y-3">
              {Object.entries(r.definitions).map(([k, v]) => (
                <div key={k}>
                  <dt className="num text-[12px] text-muted">{k}</dt>
                  <dd className="text-[13px] leading-5 text-text">{v}</dd>
                </div>
              ))}
            </dl>
          </More>
          <p className="mt-6 flex items-center gap-2 text-[12px] text-muted">
            <Mark kind="holdout" className="text-accent" /> hold-out
            <Mark kind="tuning" className="ml-3 text-text" /> tuning
            <Mark kind="negative" className="ml-3 text-muted" /> negative control
          </p>
        </div>
      </section>
    </>
  );
}
