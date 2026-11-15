import type { Analog, CellScore, CellSummary, EarthFile, Target } from '../types';
import { formatCoords } from '../lib/geo';
import { formatScore, reasonLine } from '../lib/format';
import { NEW_DISTANCE_KM, type Candidate, type Tally } from '../lib/rank';
import type { PurposeDef } from '../lib/scoringAdapter';
import type { StabilityResult } from '../lib/matchAdapter';
import { countryKey } from '../lib/where';
import { flags } from '../flags';
import { ConfidenceBadge } from './Badges';

export type ListMode = 'ranked' | 'sites';

interface Props {
  earth: EarthFile;
  target: Target;
  /** The purpose being ranked for, or null for the all-round score. */
  purpose: PurposeDef | null;
  results: CellSummary[];
  candidates: Candidate[];
  explain: (index: number) => CellScore;
  sites: { analog: Analog; index: number }[];
  tally: Tally;
  /** Why nothing is scored, when that is the case. */
  emptyReason: string | null;
  includeLow: boolean;
  onIncludeLow: (v: boolean) => void;
  /** Rank stability for the listed cells, or null while it is being computed or switched off. */
  stability: StabilityResult | null;
  /** Notes that must be shown with any score for this target, for example that it has no temperature. */
  warnings: string[];
  /** Country of each listed cell, filled in as the outline loads. */
  countries: Map<string, string | null>;
  mode: ListMode;
  onMode: (m: ListMode) => void;
  onSelect: (index: number) => void;
}

const KIND_LABEL = {
  candidate: 'Proposed sites',
  known: 'Known analogs',
  negative: 'Negative controls',
} as const;
const KIND_NOTE = {
  candidate: 'Proposed by the SBATS team. Not used in validation.',
  known: 'Analog sites from the literature: the validation set.',
  negative: 'Forests and cities. They must score low.',
} as const;

function Score({ r }: { r: CellSummary | undefined }) {
  const has = !!r && r.score !== null;
  return (
    <div className="flex w-[64px] shrink-0 flex-col items-end">
      {has ? <span className="display text-[28px] leading-8 text-text">{formatScore(r.score)}</span> : <span className="text-[12px] leading-8 text-muted">no data</span>}
      <ConfidenceBadge confidence={r?.confidence ?? null} coverage={r?.coverage} />
    </div>
  );
}

export function CandidateList(p: Props) {
  const { earth, target, results, candidates, sites, tally: t } = p;
  // A purpose with few factors gives few distinct scores (rock class has three levels), so many cells tie.
  const topScore = candidates[0] ? results[candidates[0].index].score : null;
  const tied = topScore === null ? 0 : results.reduce((n, r) => n + (r.score === topScore ? 1 : 0), 0);
  return (
    <div className="flex min-h-0 flex-col">
      <div className="px-5 sm:px-6">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2" role="group" aria-label="List">
          {(['ranked', 'sites'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={p.mode === m}
              onClick={() => p.onMode(m)}
              className={`border-b-2 pb-1 text-[16px] font-medium transition-colors ${p.mode === m ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'}`}
            >
              {m === 'ranked' ? 'Best matches' : 'Named sites'}
            </button>
          ))}
          {p.mode === 'ranked' && (
            <label className="ml-auto flex min-h-8 cursor-pointer items-center gap-2 text-[12px] text-muted">
              <input type="checkbox" checked={p.includeLow} onChange={(e) => p.onIncludeLow(e.target.checked)} className="check" />
              Include low confidence
            </label>
          )}
        </div>
        {p.warnings.map((w) => (
          <p key={w} className="mt-3 border-l-2 border-accent pl-3 text-[12px] leading-[18px] text-text" role="note">
            {w}
          </p>
        ))}
        <p className="mt-3 text-[12px] leading-[18px] text-muted" role="status">
          <span className="num">{t.scored.toLocaleString('en-US')}</span> cells scored.{' '}
          {flags.stability &&
            p.mode === 'ranked' &&
            candidates.length > 0 &&
            (p.stability
              ? `The top ${p.stability.topN} keeps ${Math.round(p.stability.meanTopNOverlap * 100)}% of its cells when every weight is nudged by up to ${Math.round(p.stability.spread * 100)}%.`
              : 'Checking how stable the ranking is.')}
        </p>
      </div>

      {p.mode === 'ranked' ? (
        candidates.length === 0 ? (
          <div className="px-5 py-6 sm:px-6">
            <p className="text-[14px] font-medium text-text">{t.scored > 0 ? 'Nothing to list' : 'No data'}</p>
            <p className="mt-1 text-[13px] leading-5 text-muted">{p.emptyReason ?? 'No cell is listed with these settings.'}</p>
          </div>
        ) : (
          <ol className="mt-3">
            {tied > candidates.length && (
              <li className="px-5 pb-3 text-[12px] leading-[18px] text-muted sm:px-6" role="note">
                <span className="num">{tied.toLocaleString('en-US')}</span> cells tie at the top score of <span className="num">{formatScore(topScore)}</span>. The list is a spaced
                sample of them, in no order.
              </li>
            )}
            {candidates.map((c) => {
              const cell = earth.cells[c.index];
              const r = results[c.index];
              const named = sites.find((s) => s.index === c.index);
              const country = p.countries.get(countryKey(cell.lat, cell.lon));
              const st = flags.stability ? p.stability?.followed.find((f) => f.index === c.index) : null;
              return (
                <li key={c.index}>
                  <button
                    type="button"
                    onClick={() => p.onSelect(c.index)}
                    className="flex w-full items-start gap-4 border-l-2 border-transparent px-[18px] py-3.5 text-left hover:border-accent hover:bg-bg sm:px-[22px]"
                  >
                    <span className="num w-5 shrink-0 pt-[3px] text-[13px] text-muted">{c.rank}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium leading-5 text-text">{named ? named.analog.name.split(',')[0] : (country ?? 'Open land')}</span>
                      <span className="num mt-0.5 block text-[12px] text-muted">{formatCoords(cell.lat, cell.lon)}</span>
                      <span className="mt-1.5 block text-[12px] leading-[18px] text-muted">{reasonLine(p.explain(c.index))}</span>
                      {(c.isNew || st) && (
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                          {c.isNew && (
                            <span className="font-semibold text-accent" title={`More than ${NEW_DISTANCE_KM} km from every known analog`}>
                              New
                            </span>
                          )}
                          {st && (
                            <span>
                              In the top {p.stability?.topN} in {Math.round(st.shareInTopN * 100)}% of redraws
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                    <Score r={r} />
                  </button>
                </li>
              );
            })}
          </ol>
        )
      ) : (
        <div className="mt-2">
          {(['candidate', 'known', 'negative'] as const).map((kind) => {
            const group = sites.filter((s) => s.analog.kind === kind);
            if (group.length === 0) return null;
            return (
              <section key={kind} aria-label={KIND_LABEL[kind]} className="mt-5 first:mt-0">
                <h3 className="px-5 text-[14px] font-semibold text-text sm:px-6">{KIND_LABEL[kind]}</h3>
                <p className="px-5 text-[12px] text-muted sm:px-6">{KIND_NOTE[kind]}</p>
                <ul className="mt-2">
                  {group.map(({ analog, index }) => {
                    const r = index >= 0 ? results[index] : undefined;
                    const forThis = analog.analogFor.includes(target.id);
                    return (
                      <li key={analog.id}>
                        <button
                          type="button"
                          disabled={index < 0}
                          onClick={() => p.onSelect(index)}
                          className="flex w-full items-start gap-4 border-l-2 border-transparent px-[18px] py-3 text-left hover:border-accent hover:bg-bg disabled:hover:border-transparent disabled:hover:bg-transparent sm:px-[22px]"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] leading-5 text-text">{analog.name.split(',')[0]}</span>
                            <span className="mt-0.5 block text-[12px] text-muted">
                              {index < 0
                                ? 'No land cell near this site in the grid.'
                                : kind === 'negative'
                                  ? 'Must score low for every target.'
                                  : forThis
                                    ? `Analog for ${target.name}.`
                                    : 'Analog for other targets.'}
                            </span>
                          </span>
                          <Score r={r} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          {sites.length === 0 && <p className="px-6 text-[14px] text-muted">No data. analogs.json lists no sites.</p>}
        </div>
      )}
    </div>
  );
}
