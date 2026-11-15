import type { Analog, CellScore, CellSummary, EarthFile, Target } from '../types';
import { formatCoords, siteCode } from '../lib/geo';
import { formatScore, reasonLine } from '../lib/format';
import { NEW_DISTANCE_KM, type Candidate, type Tally } from '../lib/rank';
import type { PurposeDef } from '../lib/scoringAdapter';
import type { StabilityResult } from '../lib/matchAdapter';
import { flags } from '../flags';
import { ConfidenceBadge, Tag } from './Badges';

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
  mode: ListMode;
  onMode: (m: ListMode) => void;
  onSelect: (index: number) => void;
}

const KIND_LABEL = { candidate: 'Proposed site', known: 'Known analog', negative: 'Negative control' } as const;
const KIND_NOTE = {
  candidate: 'Proposed by the SBATS team. Not used in validation.',
  known: 'Analog sites from the literature. The validation set.',
  negative: 'Forests and cities. They must score low.',
} as const;

/** Score, a rule whose length is the score, and the confidence under it. */
function ScoreBlock({ r }: { r: CellSummary | undefined }) {
  const has = !!r && r.score !== null;
  return (
    <div className="flex w-[76px] shrink-0 flex-col items-end">
      {has ? (
        <span className="num text-[22px] font-semibold leading-6 text-text">{formatScore(r.score)}</span>
      ) : (
        <span className="num text-[11px] uppercase leading-6 tracking-wider text-muted">no data</span>
      )}
      <span className="mt-1.5 block h-0.5 w-full bg-line" aria-hidden="true">
        {has && <span className="block h-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, r.score as number))}%` }} />}
      </span>
      <span className="mt-1.5">
        <ConfidenceBadge confidence={r?.confidence ?? null} coverage={r?.coverage} />
      </span>
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
      <header className="border-b border-line">
        <div className="px-4 pt-4">
          <h2 className="label">02 Candidates</h2>
          <p className="mt-1 text-[14px] text-text">
            {p.purpose ? 'Match by purpose' : 'All-round match'} to <span className="font-semibold">{target.name}</span>
            {p.purpose ? <>, for {p.purpose.label.toLowerCase()}</> : ''}
          </p>
          <dl className="num mt-2 flex gap-4 text-[11px] text-muted">
            {[
              ['scored', t.scored],
              ['low confidence', t.low],
              ['no data', t.noData],
            ].map(([k, v]) => (
              <div key={k as string} className="flex items-baseline gap-1.5">
                <dd className="text-text">{(v as number).toLocaleString('en-US')}</dd>
                <dt>{k}</dt>
              </div>
            ))}
          </dl>
        </div>
        {flags.stability && p.mode === 'ranked' && candidates.length > 0 && (
          <p className="px-4 pt-2 text-[12px] text-muted" role="status">
            <span className="label mr-2">Stability</span>
            {p.stability
              ? `The top ${p.stability.topN} keeps ${Math.round(p.stability.meanTopNOverlap * 100)}% of its cells on average when each weight is redrawn within ±${Math.round(p.stability.spread * 100)}% (${p.stability.draws} redraws, at worst ${Math.round(p.stability.minTopNOverlap * 100)}%).`
              : 'Computing 200 redraws of the weights'}
          </p>
        )}
        <div className="tabs mt-2 px-4" role="group" aria-label="List">
          {(['ranked', 'sites'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={p.mode === m} onClick={() => p.onMode(m)} className="tab !pl-0 !pr-0 mr-5">
              {m === 'ranked' ? 'Top cells' : 'Sites'}
            </button>
          ))}
          {p.mode === 'ranked' && (
            <label className="ml-auto flex min-h-11 cursor-pointer items-center gap-2 text-[12px] text-muted">
              <input type="checkbox" checked={p.includeLow} onChange={(e) => p.onIncludeLow(e.target.checked)} className="check" />
              Low confidence
            </label>
          )}
        </div>
      </header>

      {p.mode === 'ranked' ? (
        candidates.length === 0 ? (
          <div className="p-4">
            <p className="label mb-1 !text-text">{t.scored > 0 ? 'Nothing to list' : 'No data'}</p>
            <p className="text-[13px] text-text">
              {p.emptyReason ?? 'No cell is listed with these settings.'}
            </p>
          </div>
        ) : (
          <ol>
            {tied > candidates.length && (
              <li className="border-b border-line px-4 py-3 text-[12px] text-text" role="note">
                <span className="num">{tied.toLocaleString('en-US')}</span> cells tie at the top score of{' '}
                <span className="num">{formatScore(topScore)}</span>. The list is a spaced sample of them, in no order.
              </li>
            )}
            {candidates.map((c) => {
              const cell = earth.cells[c.index];
              const r = results[c.index];
              const named = sites.find((s) => s.index === c.index);
              return (
                <li key={c.index} className="border-b border-line">
                  <button type="button" onClick={() => p.onSelect(c.index)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-bg">
                    <span className="num w-6 shrink-0 pt-0.5 text-[13px] text-muted">{String(c.rank).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="num text-[13px] font-medium text-text">{named ? named.analog.name : siteCode(cell)}</span>
                        {c.isNew && (
                          <Tag tone="accent" title={`More than ${NEW_DISTANCE_KM} km from every known analog site`}>
                            New
                          </Tag>
                        )}
                      </span>
                      <span className="num mt-0.5 block text-[11px] text-muted">
                        {named ? `${siteCode(cell)} · ` : ''}
                        {formatCoords(cell.lat, cell.lon)}
                      </span>
                      <span className="mt-1 block text-[12px] text-muted">{reasonLine(p.explain(c.index))}</span>
                      {flags.stability &&
                        (() => {
                          const st = p.stability?.followed.find((f) => f.index === c.index);
                          return st ? (
                            <span className="num mt-0.5 block text-[11px] text-muted">
                              In the top {p.stability?.topN} in {Math.round(st.shareInTopN * 100)}% of redraws
                            </span>
                          ) : null;
                        })()}
                    </span>
                    <ScoreBlock r={r} />
                  </button>
                </li>
              );
            })}
          </ol>
        )
      ) : (
        <div>
          {(['candidate', 'known', 'negative'] as const).map((kind) => {
            const group = sites.filter((s) => s.analog.kind === kind);
            if (group.length === 0) return null;
            return (
              <section key={kind} aria-label={KIND_LABEL[kind]}>
                <div className="border-b border-line bg-bg px-4 py-2">
                  <h3 className="label !text-text">{KIND_LABEL[kind]}s</h3>
                  <p className="mt-0.5 text-[12px] text-muted">{KIND_NOTE[kind]}</p>
                </div>
                <ul>
                  {group.map(({ analog, index }) => {
                    const r = index >= 0 ? results[index] : undefined;
                    const forThis = analog.analogFor.includes(target.id);
                    return (
                      <li key={analog.id} className="border-b border-line">
                        <button
                          type="button"
                          disabled={index < 0}
                          onClick={() => p.onSelect(index)}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-bg disabled:hover:bg-transparent"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-medium text-text">{analog.name}</span>
                            <span className="num mt-0.5 block text-[11px] text-muted">
                              {index >= 0 ? `${siteCode(earth.cells[index])} · ` : ''}
                              {formatCoords(analog.lat, analog.lon)}
                            </span>
                            <span className="mt-1 block text-[12px] text-muted">
                              {index < 0
                                ? 'No land cell near this site in the grid.'
                                : kind === 'negative'
                                  ? 'Must score low for every target.'
                                  : forThis
                                    ? `Analog for ${target.name}.`
                                    : 'Analog for other targets.'}
                            </span>
                          </span>
                          <ScoreBlock r={r} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          {sites.length === 0 && <p className="p-4 text-[13px] text-muted">No data. analogs.json lists no sites.</p>}
        </div>
      )}
    </div>
  );
}
