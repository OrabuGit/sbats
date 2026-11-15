import { ArrowLeft, Bookmark, BookmarkCheck, Check, Minus, X } from 'lucide-react';
import type { CellScore, EarthCell, Target } from '../types';
import type { MatchDimension, MatchRecord, MatchSide } from '../lib/matchAdapter';
import type { ExtractItem } from '../data/sites';
import { formatCoords, siteCode } from '../lib/geo';
import { formatScore, formatSim, unscoredText, type MetaByKey } from '../lib/format';
import { MATCH, MISS, VERDICT_WORD, fromRecord, type Verdict } from '../lib/verdict';
import { matchWord, type PurposeDef } from '../lib/scoringAdapter';
import { ComputedBadge, ConfidenceBadge, SourceBadge, Tag } from './Badges';
import { Ground } from './Ground';

interface Props {
  cell: EarthCell;
  /** Name of the site in this cell, or null for an unnamed cell. */
  placeName: string | null;
  kindLabel: string | null;
  target: Target;
  explained: CellScore;
  meta: MetaByKey;
  purpose: PurposeDef | null;
  /** The match record for this pair at the scale on screen (Session C's library). */
  record: MatchRecord;
  /** 'site' when the record compares the footprint of a featured site; 'grid' for the 0.5° cell. */
  scale: 'grid' | 'site';
  /** Switches scale. null when the place has no footprint values. */
  onScale: ((s: 'grid' | 'site') => void) | null;
  /** How this cell's rank moves when the weights are redrawn. null while it is computed or when not followed. */
  stability: { text: string } | null;
  notes: string[];
  rank: number | null;
  /** Same-scale ground for the two places. null where no extract was built. */
  ground: { earth: ExtractItem | null; target: ExtractItem | null; windowKm: number; state: 'loading' | 'ready' | 'error' };
  saved: boolean;
  onSave: () => void;
  onBack: () => void;
  actions: { label: string; onClick: (() => void) | null; primary?: boolean; why?: string }[];
  /** Everything else known about the cell: profile, purposes, best month, sources. */
  children: React.ReactNode;
}

const ICON: Record<Verdict, React.ReactNode> = {
  match: <Check size={14} strokeWidth={2.5} aria-hidden="true" />,
  partial: <Minus size={14} strokeWidth={2.5} aria-hidden="true" />,
  miss: <X size={14} strokeWidth={2.5} aria-hidden="true" />,
  none: null,
};
// Shape and weight carry the verdict as well as the words: solid, outlined, hollow.
const CHIP: Record<Verdict, string> = {
  match: 'bg-text text-bg border-text',
  partial: 'text-text border-text',
  miss: 'text-muted border-muted',
  none: 'text-muted border-line border-dashed',
};

function VerdictChip({ v }: { v: Verdict }) {
  return (
    <span className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap border px-2 text-[12px] font-semibold ${CHIP[v]}`}>
      {ICON[v]}
      {VERDICT_WORD[v]}
    </span>
  );
}

const SCALE_TAG: Record<string, string | null> = { grid: null, site: 'footprint', volcano: 'whole volcano', computed: null, target: null };

function Side({ label, side }: { label: string; side: MatchSide }) {
  const none = side.value === null;
  return (
    <div>
      <dt className="label text-[10px]">{label}</dt>
      <dd className="flex flex-wrap items-center gap-x-2">
        <span className={`num text-[14px] ${none ? 'text-muted' : 'text-text'}`}>{side.text}</span>
        {!none && (side.scale === 'computed' ? <ComputedBadge /> : <SourceBadge badge={side.badge} source={side.source} />)}
        {side.scale && SCALE_TAG[side.scale] && <span className="num text-[10px] uppercase tracking-wider text-muted">{SCALE_TAG[side.scale]}</span>}
      </dd>
    </div>
  );
}

/** One dimension: its measurements on both sides, the reason in a sentence, and the verdict at the right. */
function DimensionRow({ d, targetName }: { d: MatchDimension; targetName: string }) {
  const v = fromRecord(d.verdict);
  const pct = d.similarity === null ? 0 : Math.max(0, Math.min(1, d.similarity)) * 100;
  return (
    <li className="grid gap-x-6 gap-y-3 border-b border-line py-4 last:border-b-0 md:grid-cols-[150px_minmax(0,1fr)_170px]">
      <div>
        <h4 className="text-[14px] font-semibold text-text">{d.label}</h4>
        <p className="mt-0.5 text-[12px] text-muted">{d.measures}</p>
      </div>

      <div className="min-w-0 space-y-3">
        <p className="text-[13px] leading-5 text-text">{d.reason}</p>
        {d.rows.map((r) => (
          <div key={r.key}>
            <p className="text-[12px] text-muted">{r.label}</p>
            <dl className="mt-1 grid grid-cols-2 gap-x-4">
              <Side label="Earth" side={r.earth} />
              <Side label={targetName} side={r.target} />
            </dl>
            {d.rows.length > 1 && <p className="mt-1 text-[12px] text-muted">{r.reason}</p>}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 md:flex-col md:items-end md:justify-start">
        <VerdictChip v={v} />
        <div className="flex w-[150px] items-center gap-2 md:w-full">
          <div
            className="h-1.5 flex-1 bg-line"
            role="meter"
            aria-label={`${d.label} similarity`}
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={d.similarity ?? 0}
            aria-valuetext={d.similarity === null ? 'no data' : d.similarity.toFixed(2)}
          >
            <div className={`h-full ${v === 'miss' ? 'bg-muted' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`num w-12 text-right ${d.similarity === null ? 'text-[10px] uppercase text-muted' : 'text-[13px] text-text'}`}>{formatSim(d.similarity)}</span>
        </div>
        {d.percentile !== null && <p className="num text-[11px] text-muted md:text-right">percentile {(d.percentile * 100).toFixed(0)} of Earth cells</p>}
      </div>
    </li>
  );
}

/** Same-size frame whether or not there is a picture, so the page does not move when one arrives. */
function Place({ title, sub, item, layer, windowKm, state }: { title: string; sub: string; item: ExtractItem | null; layer: 'image' | 'relief'; windowKm: number; state: Props['ground']['state'] }) {
  return (
    <div className="min-w-0">
      <p className="label">{sub}</p>
      <h3 className="mb-2 mt-0.5 text-[17px] font-semibold leading-6 text-text">{title}</h3>
      {item ? (
        <Ground item={item} layer={layer} windowKm={windowKm} />
      ) : (
        <div className="flex aspect-square w-full items-start border border-dashed border-line p-3">
          <p className="text-[12px] text-muted" role={state === 'loading' ? 'status' : undefined}>
            {state === 'loading'
              ? 'Loading ground'
              : state === 'error'
                ? 'The ground extracts could not be loaded.'
                : `No data. No ${windowKm} km ground extract was built for this place. Extracts exist for the featured sites and the listed targets.`}
          </p>
        </div>
      )}
    </div>
  );
}

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export function MatchDetail({ cell, placeName, kindLabel, target, explained: e, meta, purpose, record, scale, onScale, stability, notes, rank, ground, saved, onSave, onBack, actions, children }: Props) {
  const site = scale === 'site';
  const score = site ? record.score.value : e.score;
  const scored = score !== null;
  const core = record.dimensions.filter((d) => d.inScore);
  const extra = record.dimensions.filter((d) => d.addedAfterFreeze);
  const by = (v: Verdict) => core.filter((d) => fromRecord(d.verdict) === v).map((d) => d.label.toLowerCase());
  const matches = by('match');
  const partial = by('partial');
  const misses = by('miss');
  const none = by('none');
  const name = placeName ?? siteCode(cell);
  return (
    <main className="scroll min-h-0 flex-1 bg-panel" aria-labelledby="h-match">
      <div className="flex items-stretch border-b border-line">
        <button type="button" onClick={onBack} className="tool border-r border-line">
          <ArrowLeft size={14} aria-hidden="true" /> Matches
        </button>
        <span className="flex-1" />
        <button type="button" onClick={onSave} aria-pressed={saved} className="tool border-l border-line">
          {saved ? <BookmarkCheck size={14} aria-hidden="true" /> : <Bookmark size={14} aria-hidden="true" />} {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 lg:border-r lg:border-line">
          <header className="border-b border-line px-4 py-6 sm:px-6">
            <p className="label">04 Match{rank !== null ? ` · rank ${rank}` : ''}</p>
            <h2 id="h-match" className="mt-1 max-w-[28ch] text-[22px] font-semibold leading-7 text-text">
              {name} as a stand-in for {target.name}
            </h2>
            <p className="num mt-1 text-[12px] text-muted">
              {placeName ? `${siteCode(cell)} · ` : ''}
              {formatCoords(cell.lat, cell.lon)}
            </p>
            {kindLabel && (
              <p className="mt-2">
                <Tag>{kindLabel}</Tag>
              </p>
            )}

            <div className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-[auto_minmax(0,1fr)]">
              <div>
                <p className="label">{site ? `Footprint, ${record.earth.footprintKm ?? ''} km, Base weights` : purpose ? purpose.label : 'All-round match'}</p>
                <p className={`num mt-1 font-semibold leading-none ${scored ? 'text-[44px] text-text' : 'text-[22px] text-muted'}`}>
                  {scored ? formatScore(score) : 'NO DATA'}
                  {scored && <span className="ml-1.5 text-[13px] font-normal text-muted">/ 100</span>}
                </p>
                <span className="mt-3 block h-0.5 w-[180px] bg-line" aria-hidden="true">
                  {scored && <span className="block h-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, score as number))}%` }} />}
                </span>
                <p className="mt-2 flex items-center gap-3 text-[12px] text-muted">
                  {scored && <span className="font-semibold text-text">{matchWord(score as number)} match</span>}
                  <ConfidenceBadge confidence={site ? record.score.confidence : e.confidence} coverage={site ? record.score.coverage : e.coverage} />
                </p>
              </div>
              <div className="max-w-[62ch]">
                <p className="text-[14px] leading-[22px] text-text">{site ? record.score.reason : scored ? e.reason : unscoredText(e, meta)}</p>
                <dl className="mt-3 space-y-1.5 text-[13px]">
                  {[
                    { v: 'match' as const, items: matches },
                    { v: 'partial' as const, items: partial },
                    { v: 'miss' as const, items: misses },
                    { v: 'none' as const, items: none },
                  ]
                    .filter((g) => g.items.length > 0)
                    .map((g) => (
                      <div key={g.v} className="flex items-baseline gap-3">
                        <dt className="w-[120px] shrink-0">
                          <VerdictChip v={g.v} />
                        </dt>
                        <dd className="text-text">{list(g.items)}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            </div>
            {stability && (
              <p className="mt-4 max-w-[72ch] text-[12px] text-muted">
                <span className="label mr-2">Stability</span>
                {stability.text}
              </p>
            )}
            {notes.map((n) => (
              <p key={n} className="mt-3 text-[12px] text-accent" role="note">
                {n}
              </p>
            ))}
            {onScale && (
              <div className="tabs mt-5 max-w-[420px]" role="group" aria-label="Scale of the Earth values">
                {(['grid', 'site'] as const).map((sc) => (
                  <button key={sc} type="button" aria-pressed={scale === sc} onClick={() => onScale(sc)} className="tab">
                    {sc === 'grid' ? 'Grid cell, 55 km' : `Footprint, ${record.earth.footprintKm ?? 'site'} km`}
                  </button>
                ))}
              </div>
            )}
          </header>

          <section className="border-b border-line px-4 py-6 sm:px-6" aria-labelledby="h-side">
            <h3 id="h-side" className="mb-3 text-[14px] font-semibold text-text">
              Side by side, {ground.windowKm} km across
            </h3>
            <div className="grid max-w-[680px] grid-cols-2 gap-4">
              <Place title={name} sub="Earth" item={ground.earth} layer="image" windowKm={ground.windowKm} state={ground.state} />
              <Place title={target.name} sub={target.body === 'moon' ? 'Moon' : 'Mars'} item={ground.target} layer="relief" windowKm={ground.windowKm} state={ground.state} />
            </div>
            <p className="mt-3 max-w-[72ch] text-[12px] text-muted">
              Both squares cover the same ground area, north up. The score describes the whole 0.5° cell around the Earth place, about 55 km on a
              side, which is larger than either square.
            </p>
          </section>

          <section className="border-b border-line px-4 py-6 sm:px-6" aria-labelledby="h-rows">
            <h3 id="h-rows" className="text-[14px] font-semibold text-text">
              Dimension by dimension
            </h3>
            <p className="mt-1 max-w-[72ch] text-[12px] text-muted">
              Similarity runs from 0 to 1. At {MATCH.toFixed(2)} or more a dimension matches; below {MISS.toFixed(2)} it does not.{' '}
              {site ? 'Terrain, vegetation and rock are measured inside the footprint. Climate is the value of the 55 km cell.' : 'Every Earth value describes the whole 55 km cell.'}
            </p>
            <ul className="mt-2">
              {core.map((d) => (
                <DimensionRow key={d.id} d={d} targetName={target.name} />
              ))}
            </ul>
            {record.caveats.length > 0 && (
              <ul className="mt-3 max-w-[72ch] space-y-1">
                {record.caveats.map((c) => (
                  <li key={c} className="text-[12px] text-muted">
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border-b border-line px-4 py-6 sm:px-6" aria-labelledby="h-extra">
            <h3 id="h-extra" className="text-[14px] font-semibold text-text">
              Added after the score was frozen
            </h3>
            <p className="mt-1 max-w-[72ch] text-[12px] text-muted">Shown beside the score, never part of it, and not validated.</p>
            <ul className="mt-2">
              {extra.map((d) => (
                <DimensionRow key={d.id} d={d} targetName={target.name} />
              ))}
            </ul>
          </section>

          <section className="border-b border-line px-4 py-6 sm:px-6" aria-labelledby="h-cannot">
            <h3 id="h-cannot" className="text-[14px] font-semibold text-text">
              What Earth cannot copy
            </h3>
            <p className="mt-1 text-[12px] text-muted">Never part of the score. No rehearsal at this place tests these.</p>
            <ul className="mt-3 max-w-[72ch] space-y-2">
              {record.cannotCopy.map((t, i) => (
                <li key={i} className="border-l-2 border-line pl-3 text-[13px] text-text">
                  {t}
                </li>
              ))}
              {record.beyondEarth.map((g) => (
                <li key={g.key} className="border-l-2 border-line pl-3 text-[13px] text-text">
                  {g.text}
                </li>
              ))}
            </ul>
          </section>

          <section className="px-4 py-6 sm:px-6" aria-labelledby="h-actions">
            <h3 id="h-actions" className="label">
              05 Actions
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {actions.map((a) => (
                <button key={a.label} type="button" onClick={a.onClick ?? undefined} disabled={!a.onClick} title={a.onClick ? undefined : a.why} className={`btn ${a.primary ? 'btn-primary' : ''}`}>
                  {a.label}
                </button>
              ))}
            </div>
            {actions
              .filter((a) => !a.onClick && a.why)
              .map((a) => (
                <p key={a.label} className="mt-2 text-[12px] text-muted">
                  {a.label}: {a.why}
                </p>
              ))}
          </section>
        </div>

        <aside aria-label="More about this cell" className="border-t border-line lg:border-t-0">
          {children}
        </aside>
      </div>
    </main>
  );
}
