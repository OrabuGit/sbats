import type { Analog, CellScore, CellSummary, EarthFile, Target } from '../types';
import { formatCoords, siteCode } from '../lib/geo';
import { formatScore, reasonLine } from '../lib/format';
import { NEW_DISTANCE_KM, type Candidate, type Tally } from '../lib/rank';
import type { PurposeDef } from '../lib/scoringAdapter';
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

function ScoreBlock({ r }: { r: CellSummary | undefined }) {
  return (
    <div className="flex w-16 shrink-0 flex-col items-end">
      {r && r.score !== null ? (
        <span className="num text-[22px] font-semibold leading-6 text-text">{formatScore(r.score)}</span>
      ) : (
        <span className="num text-[11px] uppercase leading-6 tracking-wider text-muted">no data</span>
      )}
      <span className="mt-1">
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
      <header className="border-b border-line p-4">
        <h2 className="label mb-2">02 Candidates</h2>
        <p className="text-[13px] text-text">
          {p.purpose ? 'Match by purpose' : 'All-round match'} to <span className="font-semibold">{target.name}</span>
          {p.purpose ? <>, for <span className="font-semibold">{p.purpose.label.toLowerCase()}</span></> : ''}.
        </p>
        <p className="num mt-2 text-[11px] uppercase tracking-wider text-muted">
          {t.scored.toLocaleString('en-US')} scored · {t.low.toLocaleString('en-US')} low confidence · {t.noData.toLocaleString('en-US')} no data
        </p>
        <div className="mt-3 grid grid-cols-2 gap-px border border-line bg-line" role="group" aria-label="List">
          {(['ranked', 'sites'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={p.mode === m}
              onClick={() => p.onMode(m)}
              className={`label min-h-11 px-3 ${p.mode === m ? 'bg-bg !text-accent' : 'bg-panel !text-text hover:bg-bg'}`}
            >
              {m === 'ranked' ? 'Top cells' : 'Sites'}
            </button>
          ))}
        </div>
        {p.mode === 'ranked' && (
          <label className="mt-1 flex min-h-11 cursor-pointer items-center gap-3 text-[13px] text-text">
            <input
              type="checkbox"
              checked={p.includeLow}
              onChange={(e) => p.onIncludeLow(e.target.checked)}
              className="h-4 w-4 appearance-none border border-muted bg-bg checked:border-accent checked:bg-accent"
            />
            Include low confidence cells
          </label>
        )}
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
