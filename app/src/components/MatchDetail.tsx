import { ArrowLeft, Bookmark, BookmarkCheck, Check, Minus, X } from 'lucide-react';
import type { CellScore, ClampGap, EarthCell, FactorBreakdown, FactorKey, KeyBreakdown, LandCoverMeta, Target } from '../types';
import type { ExtractItem } from '../data/sites';
import { formatCoords, siteCode } from '../lib/geo';
import { formatScore, formatShare, formatSim, formatValue, isSunKey, keyLabel, unscoredText, type MetaByKey } from '../lib/format';
import { VERDICT_WORD, verdictOf, type Verdict } from '../lib/verdict';
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
  landCover: LandCoverMeta | null;
  purpose: PurposeDef | null;
  gaps: ClampGap[];
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

const minus = (s: string) => s.replace('-', '−');

/** One plain sentence on why a measurement is or is not close. Every number in it is on the row. */
function keyReason(k: KeyBreakdown, target: Target, meta: MetaByKey): string {
  if (k.status === 'missing-target') return `${target.name} has no published value, so this is left out.`;
  if (k.status === 'missing-earth') return 'This cell has no value, so this is left out.';
  if (k.key === 'lithology') {
    if (k.similarity === null) return 'Could not be compared.';
    return k.similarity >= 1 ? 'The same rock class.' : k.similarity >= 0.5 ? 'Related rock classes.' : 'Unrelated rock classes.';
  }
  if (k.bareGround?.source === 'landCover') return `No NDVI here. ${formatShare(k.bareGround.barrenFrac)} of the cell is barren ground, used directly.`;
  if (k.earthValue === null || k.targetClamped === null || k.sigma === null) return 'Could not be compared.';
  const diff = k.earthValue - k.targetClamped;
  const unit = formatValue(k.key, Math.abs(diff), meta);
  const clamped = k.targetValue !== null && k.targetValue !== k.targetClamped;
  const ice = k.bareGround && (k.bareGround.snowIceFrac ?? 0) > 0 ? ` Then lowered for ${formatShare(k.bareGround.snowIceFrac)} permanent ice.` : '';
  const base =
    Math.abs(diff) < k.sigma * 0.05
      ? 'Effectively equal.'
      : `${minus(unit)} ${diff > 0 ? 'above' : 'below'} the target; ${Math.abs(diff / k.sigma).toFixed(1)} times the tolerance of ${formatValue(k.key, k.sigma, meta)}.`;
  return `${base}${clamped ? ` Compared with ${formatValue(k.key, k.targetClamped, meta)}, the nearest value Earth has.` : ''}${ice}`;
}

function FactorRow({ f, target, meta, landCover }: { f: FactorBreakdown; target: Target; meta: MetaByKey; landCover: LandCoverMeta | null }) {
  const v = verdictOf(f.similarity);
  const pct = f.similarity === null ? 0 : Math.max(0, Math.min(1, f.similarity)) * 100;
  return (
    <li className="grid gap-x-6 gap-y-3 border-b border-line py-4 last:border-b-0 md:grid-cols-[150px_minmax(0,1fr)_170px]">
      <div className="flex items-start justify-between gap-3 md:block">
        <h4 className="text-[14px] font-semibold text-text">{f.label}</h4>
        <p className="num text-[11px] text-muted md:mt-1">weight {f.weight.toFixed(2)}</p>
      </div>

      <div className="min-w-0 space-y-3">
        {f.keys.map((k) => {
          const sun = isSunKey(k.key);
          const m = sun ? null : meta[k.key as FactorKey];
          const tv = sun ? null : target.values[k.key as FactorKey];
          const name = sun ? k.label : keyLabel(k.key, meta);
          const cover = k.bareGround?.source === 'landCover';
          return (
            <div key={k.key}>
              <p className="text-[12px] text-muted">{name}</p>
              <dl className="mt-1 grid grid-cols-2 gap-x-4">
                <div>
                  <dt className="label text-[10px]">Earth</dt>
                  <dd className="flex flex-wrap items-center gap-x-2">
                    <span className={`num text-[14px] ${k.earthValue === null && !cover ? 'text-muted' : 'text-text'}`}>
                      {cover ? `${formatShare(k.bareGround?.barrenFrac)} barren` : formatValue(k.key, k.earthValue, meta)}
                    </span>
                    {cover ? (
                      <SourceBadge badge="Measured" source={landCover?.source ?? 'MODIS MCD12C1 land cover'} />
                    ) : k.earthValue !== null ? (
                      sun ? <ComputedBadge /> : <SourceBadge badge={m?.badge ?? null} source={m?.source} />
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="label text-[10px]">{target.name}</dt>
                  <dd className="flex flex-wrap items-center gap-x-2">
                    <span className={`num text-[14px] ${k.targetValue === null ? 'text-muted' : 'text-text'}`}>
                      {k.targetValue === null ? 'no data' : formatValue(k.key, k.targetValue, meta)}
                    </span>
                    {k.targetValue !== null && (sun ? <ComputedBadge /> : <SourceBadge badge={tv?.badge ?? null} source={tv?.source} />)}
                  </dd>
                </div>
              </dl>
              <p className="mt-1 text-[12px] text-muted">{keyReason(k, target, meta)}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 md:flex-col md:items-end md:justify-start">
        <VerdictChip v={v} />
        <div className="flex w-[150px] items-center gap-2 md:w-full">
          <div
            className="h-1.5 flex-1 bg-line"
            role="meter"
            aria-label={`${f.label} similarity`}
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={f.similarity ?? 0}
            aria-valuetext={f.similarity === null ? 'no data' : f.similarity.toFixed(2)}
          >
            <div className={`h-full ${v === 'miss' ? 'bg-muted' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`num w-12 text-right ${f.similarity === null ? 'text-[10px] uppercase text-muted' : 'text-[13px] text-text'}`}>{formatSim(f.similarity)}</span>
        </div>
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

export function MatchDetail({ cell, placeName, kindLabel, target, explained: e, meta, landCover, purpose, gaps, notes, rank, ground, saved, onSave, onBack, actions, children }: Props) {
  const scored = e.score !== null;
  const used = e.breakdown.filter((f) => f.weight > 0);
  const by = (v: Verdict) => used.filter((f) => verdictOf(f.similarity) === v).map((f) => f.label.toLowerCase());
  const matches = by('match');
  const partial = by('partial');
  const misses = by('miss');
  const none = by('none');
  const name = placeName ?? siteCode(cell);
  const sigmaOf = new Map(e.breakdown.flatMap((f) => f.keys).map((k) => [k.key as string, k.sigma]));
  const realGaps = gaps.filter((g) => {
    const sigma = sigmaOf.get(g.key);
    return typeof sigma !== 'number' || Math.abs(g.gap) >= sigma / 2;
  });

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
                <p className="label">{purpose ? purpose.label : 'All-round match'}</p>
                <p className={`num mt-1 font-semibold leading-none ${scored ? 'text-[44px] text-text' : 'text-[22px] text-muted'}`}>
                  {scored ? formatScore(e.score) : 'NO DATA'}
                  {scored && <span className="ml-1.5 text-[13px] font-normal text-muted">/ 100</span>}
                </p>
                <span className="mt-3 block h-0.5 w-[180px] bg-line" aria-hidden="true">
                  {scored && <span className="block h-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, e.score as number))}%` }} />}
                </span>
                <p className="mt-2 flex items-center gap-3 text-[12px] text-muted">
                  {scored && <span className="font-semibold text-text">{matchWord(e.score as number)} match</span>}
                  <ConfidenceBadge confidence={e.confidence} coverage={e.coverage} />
                </p>
              </div>
              <div className="max-w-[62ch]">
                <p className="text-[14px] leading-[22px] text-text">{scored ? e.reason : unscoredText(e, meta)}</p>
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
            {notes.map((n) => (
              <p key={n} className="mt-3 text-[12px] text-accent" role="note">
                {n}
              </p>
            ))}
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
              Factor by factor
            </h3>
            <p className="mt-1 max-w-[72ch] text-[12px] text-muted">
              Similarity runs from 0 to 1. At 0.6 or more a factor matches; below 0.3 it does not.
            </p>
            <ul className="mt-2">
              {e.breakdown.map((f) => (
                <FactorRow key={f.factor} f={f} target={target} meta={meta} landCover={landCover} />
              ))}
            </ul>
          </section>

          <section className="border-b border-line px-4 py-6 sm:px-6" aria-labelledby="h-cannot">
            <h3 id="h-cannot" className="text-[14px] font-semibold text-text">
              What Earth cannot copy
            </h3>
            <p className="mt-1 text-[12px] text-muted">Never part of the score. No rehearsal at this place tests these.</p>
            <ul className="mt-3 max-w-[72ch] space-y-2">
              {target.cannotCopy.map((s, i) => (
                <li key={i} className="border-l-2 border-line pl-3 text-[13px] text-text">
                  {s}
                </li>
              ))}
              {realGaps.map((g) => (
                <li key={g.key} className="border-l-2 border-line pl-3 text-[13px] text-text">
                  {isSunKey(g.key) ? g.label : keyLabel(g.key, meta)}: {target.name} is <span className="num">{formatValue(g.key, g.targetValue, meta)}</span>. The
                  nearest value in any Earth cell is <span className="num">{formatValue(g.key, g.clampedValue, meta)}</span>, so the real difference is
                  larger than the score shows.
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
