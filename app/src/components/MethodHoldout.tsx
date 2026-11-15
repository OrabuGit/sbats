import { useAsync } from '../lib/useAsync';
import { loadReport, type SetStats } from '../data/validation';
import { Reveal } from './HomeStory';

const NO = 'no data';

interface Row {
  label: string;
  note: string;
  /** Scale maximum: 1 for shares, 100 for scores. */
  max: number;
  chance: number | null;
  chanceText: string;
  hold: number | null;
  tune: number | null;
  fmt: (v: number | null) => string;
}

const f3 = (v: number | null) => (v === null ? NO : v.toFixed(3));
const p1 = (v: number | null) => (v === null ? NO : `${(v * 100).toFixed(1)}%`);
const f1 = (v: number | null) => (v === null ? NO : v.toFixed(1));

/** Hold-out numbers of the Base preset, drawn against chance. Read from the same report the Validation page reads. */
export function MethodHoldout() {
  const report = useAsync(() => loadReport('base'), 'method-report-base');
  if (report.status === 'loading') return <p className="label" role="status">Loading the validation report</p>;
  if (report.status === 'error' || report.value === null) {
    return <p className="text-[14px] text-muted">No data. No validation report was published with this build.</p>;
  }
  const r = report.value;
  const h: SetStats = r.sets.holdout.overall;
  const t: SetStats = r.sets.tuning.overall;
  const rows: Row[] = [
    { label: 'ROC AUC', note: 'A known analog outscores a negative control', max: 1, chance: 0.5, chanceText: 'chance 0.5', hold: h.rocAuc, tune: t.rocAuc, fmt: f3 },
    { label: 'Mean percentile', note: 'Share of Earth cells a known analog beats', max: 1, chance: 0.5, chanceText: 'chance 0.5', hold: h.meanPercentile, tune: t.meanPercentile, fmt: f3 },
    { label: 'In the top 10%', note: 'Known analogs in the best tenth of Earth', max: 1, chance: 0.1, chanceText: 'chance 10%', hold: h.top10Share, tune: t.top10Share, fmt: p1 },
    { label: 'Mean score, known sites', note: 'Out of 100: low in absolute terms', max: 100, chance: null, chanceText: '', hold: h.meanScoreKnown, tune: t.meanScoreKnown, fmt: f1 },
    { label: 'Mean score, negative controls', note: 'Out of 100: rainforests and cities', max: 100, chance: null, chanceText: '', hold: h.meanScoreNegative, tune: t.meanScoreNegative, fmt: f1 },
  ];
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-muted">
        <span className="flex items-center gap-2">
          <span className="block h-[6px] w-6 bg-accent" aria-hidden="true" /> Hold-out set
        </span>
        <span className="flex items-center gap-2">
          <span className="block h-[6px] w-6 bg-muted" aria-hidden="true" /> Tuning set
        </span>
        <span className="flex items-center gap-2">
          <span className="block h-4 w-[2px] bg-text" aria-hidden="true" /> Chance
        </span>
        <span className="num ml-auto">
          {h.knownSites} known sites, {h.negativeSites} controls in the hold-out set
        </span>
      </div>
      <ul className="space-y-7">
        {rows.map((row, i) => (
          <li key={row.label}>
            <Reveal i={i}>
              <div className="grid items-center gap-x-6 gap-y-2 sm:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                  <p className="text-[14px] font-medium text-text">{row.label}</p>
                  <p className="text-[12px] text-muted">{row.note}</p>
                </div>
                <div>
                  {[
                    { v: row.hold, c: 'bg-accent', k: 'Hold-out' },
                    { v: row.tune, c: 'bg-muted', k: 'Tuning' },
                  ].map((b) => (
                    <div key={b.k} className="flex items-center gap-3 py-[3px]">
                      <div className="relative h-[8px] min-w-0 flex-1 bg-line">
                        {b.v !== null && <div className={`bar-grow h-full w-full ${b.c}`} style={{ ['--to' as string]: Math.max(0, Math.min(1, b.v / row.max)), ['--i' as string]: i }} />}
                        {row.chance !== null && <div className="absolute -top-1 h-4 w-[2px] bg-text" style={{ left: `${(row.chance / row.max) * 100}%` }} aria-hidden="true" />}
                      </div>
                      <span className={`num w-[72px] shrink-0 text-right text-[13px] ${b.k === 'Hold-out' ? 'text-text' : 'text-muted'}`}>
                        <span className="sr-only">{b.k} </span>
                        {row.fmt(b.v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </div>
  );
}
