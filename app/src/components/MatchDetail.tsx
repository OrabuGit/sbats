import { Suspense, lazy, useState } from 'react';
import { ArrowLeft, Bookmark, BookmarkCheck, Check, Minus, X } from 'lucide-react';
import type { CellScore, EarthCell, EarthFile, Target } from '../types';
import type { MatchDimension, MatchRecord, MatchSide, SharedMinerals } from '../lib/matchAdapter';
import type { ExtractItem } from '../data/sites';
import { formatCoords, siteCode } from '../lib/geo';
import { formatScore, formatSim, unscoredText, type MetaByKey } from '../lib/format';
import { MATCH, MISS, VERDICT_WORD, fromRecord, type Verdict } from '../lib/verdict';
import { matchWord, type PurposeDef } from '../lib/scoringAdapter';
import { ComputedBadge, ConfidenceBadge, SourceBadge } from './Badges';
import { Ground } from './Ground';
import { Locator } from './Locator';
import { ActivityArt, type Activity } from './ActivityArt';
import { ELEMENT_NAME, ElementIcon, isElement } from './ElementIcon';
import { ScoreDial } from './ScoreDial';
import { PlainResults } from './PlainResults';
import { FieldLogistics, logisticsFromRecord } from './FieldLogistics';
import { CompareSlider } from './CompareSlider';
import { FullData } from './FullData';
import type { SiteClimate } from '../data/sandbox';
import { countryKey, useCountries } from '../lib/where';

const Terrain3D = lazy(() => import('./Terrain3D').then((m) => ({ default: m.Terrain3D })));

export interface Tool {
  title: string;
  line: string;
  cta: string;
  art: Activity;
  onClick: (() => void) | null;
  why?: string;
}

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
  /** Elevation extracts of both places, when they were built: the 3D terrain is then shown at the top. */
  terrain: { earth: ExtractItem; target: ExtractItem; windowKm: number; onOpen: () => void } | null;
  /** The two tools, ordered by what the match is for. */
  tools: { primary: Tool; secondary: Tool };
  actions: { label: string; onClick: (() => void) | null; primary?: boolean; why?: string }[];
  /** data/earth.json, for the "Full data" table (percentile among Earth cells, clamping). Left out: read from the app's cached data load. null: none. */
  earth?: EarthFile | null;
  /** data/site_climate.json, for the monthly chart of a named site. Left out: read from the app's cached loader. null: none. */
  climate?: SiteClimate | null;
  /** Minerals shared with the target (the match library's result). Optional. */
  minerals?: SharedMinerals | null;
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
  match: 'text-text',
  partial: 'text-text/80',
  miss: 'text-muted',
  none: 'text-muted',
};

function VerdictChip({ v }: { v: Verdict }) {
  return (
    <span className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold ${CHIP[v]}`}>
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
        {side.scale && SCALE_TAG[side.scale] && <span className="num text-[10px] text-muted">{SCALE_TAG[side.scale]}</span>}
      </dd>
      {side.note && <dd className="mt-0.5 text-[11px] leading-4 text-muted">{side.note}</dd>}
    </div>
  );
}

/** Similarity on a track in three zones: below 0.30 no match, 0.30 to 0.75 partly, 0.75 and up a match. */
function Track({ value, label }: { value: number | null; label: string }) {
  const v = value === null ? 0 : Math.max(0, Math.min(1, value));
  const zones = [
    { from: 0, to: MISS, word: 'No' },
    { from: MISS, to: MATCH, word: 'Partly' },
    { from: MATCH, to: 1, word: 'Match' },
  ];
  return (
    <div role="meter" aria-label={`${label} similarity`} aria-valuemin={0} aria-valuemax={1} aria-valuenow={value ?? 0} aria-valuetext={value === null ? 'no data' : value.toFixed(2)}>
      <div className="relative flex h-2 gap-[3px]">
        {zones.map((z) => {
          const fill = Math.max(0, Math.min(1, (v - z.from) / (z.to - z.from)));
          return (
            <span key={z.word} className="relative block bg-line" style={{ width: `${(z.to - z.from) * 100}%` }}>
              {value !== null && <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${fill * 100}%` }} />}
            </span>
          );
        })}
      </div>
      <div className="mt-1 flex gap-[3px] text-[10px] leading-3 text-muted" aria-hidden="true">
        {zones.map((z) => (
          <span key={z.word} style={{ width: `${(z.to - z.from) * 100}%` }}>
            {z.word}
          </span>
        ))}
      </div>
    </div>
  );
}

/** One dimension: its measurements on both sides, the reason in a sentence, and the verdict at the right. */
function DimensionRow({ d, targetName }: { d: MatchDimension; targetName: string }) {
  const v = fromRecord(d.verdict);
  return (
    <li id={`dim-${d.id}`} className="grid scroll-mt-20 gap-x-8 gap-y-3 border-t border-line py-6 md:grid-cols-[170px_minmax(0,1fr)_220px]">
      <div className="flex items-start gap-3">
        {isElement(d.id) && (
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 ${v === 'match' ? 'border-accent bg-accent text-bg' : v === 'partial' ? 'border-accent text-accent' : 'border-line text-muted'}`}>
            <ElementIcon id={d.id} size={26} />
          </span>
        )}
        <div className="min-w-0">
          <h4 className="text-[16px] font-semibold text-text">{d.label}</h4>
          <p className="mt-0.5 text-[12px] leading-4 text-muted">{d.measures}</p>
        </div>
      </div>

      <div className="min-w-0 space-y-3">
        <p className="text-[14px] leading-[22px] text-text">{d.reason}</p>
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

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <VerdictChip v={v} />
          <span className={d.similarity === null ? 'text-[12px] text-muted' : 'display num text-[28px] leading-8 text-text'}>{formatSim(d.similarity)}</span>
        </div>
        <Track value={d.similarity} label={d.label} />
        {d.percentile !== null && <p className="num text-[11px] text-muted">Closer than {(d.percentile * 100).toFixed(0)}% of Earth cells</p>}
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

export function MatchDetail({ cell, placeName, kindLabel, target, explained: e, meta, purpose, record, scale, onScale, stability, notes, rank, ground, saved, onSave, onBack, actions, tools, terrain, earth, climate, minerals = null, children }: Props) {
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
  // The dimension shown in the detail beside the dial: the weakest one until another is chosen.
  const weakest = core.reduce((w, d, i) => (d.similarity !== null && (w < 0 || d.similarity < (core[w].similarity as number)) ? i : w), -1);
  const [picked, setPicked] = useState<number | null>(null);
  const sel = Math.min(picked ?? Math.max(0, weakest), Math.max(0, core.length - 1));
  const countries = useCountries([cell]);
  const country = countries.get(countryKey(cell.lat, cell.lon)) ?? null;
  // A cell with no site in it is named by where it is.
  const name = placeName ?? (country ? `Open land in ${country}` : 'Open land');
  const worldWord = target.body === 'moon' ? 'the Moon' : 'Mars';
  // Conditions typed in by hand are not a place: no second world, no ground picture of it.
  const custom = target.id === 'custom-conditions';
  const pad = 'mx-auto w-full max-w-[1200px] px-5 sm:px-10';
  return (
    <main className="scroll min-h-0 flex-1 bg-bg" aria-labelledby="h-match">
      <div className={`${pad} flex items-center justify-between pt-3`}>
        <button type="button" onClick={onBack} className="btn btn-ghost !pl-0">
          <ArrowLeft size={15} aria-hidden="true" /> Back to the globe
        </button>
        <button type="button" onClick={onSave} aria-pressed={saved} className="btn btn-ghost">
          {saved ? <BookmarkCheck size={15} aria-hidden="true" /> : <Bookmark size={15} aria-hidden="true" />} {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      <div>
        <div>
          <header className={`${pad} grid gap-x-12 gap-y-8 pb-12 pt-6 ${terrain ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,640px)]' : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)]'}`}>
            <div className="min-w-0">
              <p className="text-[14px] text-muted">
                {rank !== null ? `Match number ${rank}` : 'Match'}
                {kindLabel ? ` · ${kindLabel}` : ''}
              </p>
              <h2 id="h-match" className="display-l mt-2 text-[36px] sm:text-[52px]">
                {name}
              </h2>
              <p className="mt-2 text-[18px] leading-7 text-muted">
                {custom ? (
                  <>
                    as a match for <span className="text-text">your custom conditions</span>
                  </>
                ) : (
                  <>
                    as a stand-in for <span className="text-text">{target.name}</span> on {worldWord}
                  </>
                )}
              </p>
              <p className="num mt-2 text-[12px] text-muted">
                {country && placeName ? `${country} · ` : ''}
                {formatCoords(cell.lat, cell.lon)} · cell <span className="code">{siteCode(cell)}</span>
              </p>

              <div className="mt-8 flex items-end gap-5">
                <p className={`display leading-none ${scored ? 'text-[76px] text-text' : 'text-[28px] text-muted'}`}>
                  {scored ? formatScore(score) : 'No data'}
                </p>
                <div className="pb-2">
                  <p className="text-[14px] text-muted">{site ? `out of 100, footprint ${record.earth.footprintKm ?? ''} km` : `out of 100, ${purpose ? purpose.label.toLowerCase() : 'all-round'}`}</p>
                  <p className="mt-1 flex items-center gap-3 text-[14px]">
                    {scored && <span className="font-semibold text-text">{matchWord(score as number)} match</span>}
                    <ConfidenceBadge confidence={site ? record.score.confidence : e.confidence} coverage={site ? record.score.coverage : e.coverage} />
                  </p>
                </div>
              </div>
              <p className="mt-5 max-w-[56ch] text-[16px] leading-[26px] text-text">{site ? record.score.reason : scored ? e.reason : unscoredText(e, meta)}</p>
              <dl className="mt-4 space-y-1.5 text-[14px]">
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
              {stability && <p className="mt-5 max-w-[64ch] text-[13px] leading-5 text-muted">{stability.text}</p>}
              {notes.map((n) => (
                <p key={n} className="mt-3 max-w-[64ch] border-l-2 border-accent pl-3 text-[13px] leading-5 text-text" role="note">
                  {n}
                </p>
              ))}
              {onScale && (
                <div className="tabs mt-6 max-w-[420px]" role="group" aria-label="Scale of the Earth values">
                  {(['grid', 'site'] as const).map((sc) => (
                    <button key={sc} type="button" aria-pressed={scale === sc} onClick={() => onScale(sc)} className="tab">
                      {sc === 'grid' ? 'Grid cell, 55 km' : `Footprint, ${record.earth.footprintKm ?? 'site'} km`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className={`lg:pt-6 ${terrain ? 'order-first lg:order-none' : ''}`}>
              {terrain ? (
                <figure className="m-0">
                  <Suspense fallback={<div className="h-[320px] w-full bg-bg" role="status" aria-label="Loading terrain" />}>
                    <Terrain3D earth={{ item: terrain.earth, modules: [] }} target={{ item: terrain.target, modules: [] }} windowKm={terrain.windowKm} layer="image" cols={24} rows={12} />
                  </Suspense>
                  <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[13px] text-muted">
                    <span>The two places as 3D terrain, at one scale. Drag to turn it.</span>
                    <button type="button" onClick={terrain.onOpen} className="btn btn-primary !px-5">
                      Open full 3D view
                    </button>
                  </figcaption>
                </figure>
              ) : custom ? null : (
                <Locator
                  points={[
                    { world: 'earth', lat: cell.lat, lon: cell.lon, name: placeName?.split(',')[0] ?? country ?? 'This cell', where: placeName ? country : null },
                    { world: target.body, lat: target.lat, lon: target.lon, name: target.name.split(',')[0], where: null },
                  ]}
                />
              )}
            </div>
          </header>

          <PlainResults record={record} score={score} placeName={name} />

          {core.length > 0 && (
            <section className={`${pad} pb-16`} aria-labelledby="h-why">
              <h3 id="h-why" className="display text-[24px] leading-8 text-text">
                {scored ? `Why it scores ${formatScore(score)}` : 'What can be compared'}
              </h3>
              <p className="mt-1 max-w-[60ch] text-[14px] leading-[22px] text-muted">
                One ring for each thing the two places are compared on. A ring fills the more alike they are; the gaps mark where a match starts.
              </p>
              <div className="mt-8 grid items-start gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
                <ScoreDial dims={core} score={scored ? (score as number) : null} selected={sel} onSelect={setPicked} />
                <ul>
                  {core.map((d, i) => {
                    const v = fromRecord(d.verdict);
                    const open = i === sel;
                    return (
                      <li key={d.id} className={`border-l-2 ${open ? 'border-accent' : 'border-line'}`}>
                        <button type="button" onClick={() => setPicked(i)} aria-expanded={open} className="flex w-full items-center gap-4 py-3 pl-4 pr-1 text-left">
                          {isElement(d.id) && (
                            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${v === 'miss' || v === 'none' ? 'bg-line text-muted' : 'bg-accent text-bg'}`}>
                              <ElementIcon id={d.id} size={26} still={!open} />
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className={`block text-[17px] leading-6 ${open ? 'font-semibold text-text' : 'text-text/85'}`}>{isElement(d.id) ? ELEMENT_NAME[d.id] : d.label}</span>
                            <span className="block text-[12px] leading-4 text-muted">{d.measures}</span>
                          </span>
                          <span className={`display text-[28px] leading-none ${d.similarity === null ? 'text-[14px] text-muted' : 'text-text'}`}>{formatSim(d.similarity)}</span>
                        </button>
                        {open && (
                          <div className="pb-5 pl-4 pr-1">
                            <div className="flex items-center gap-4">
                              <VerdictChip v={v} />
                              <div className="flex-1">
                                <Track value={d.similarity} label={d.label} />
                              </div>
                            </div>
                            <p className="mt-4 text-[15px] leading-6 text-text">{d.reason}</p>
                            {d.rows.slice(0, 2).map((r) => (
                              <dl key={r.key} className="mt-3 grid grid-cols-2 gap-x-6">
                                <Side label="Earth" side={r.earth} />
                                <Side label={target.name} side={r.target} />
                              </dl>
                            ))}
                            {weakest >= 0 && i === weakest && (
                              <p className="mt-4 text-[13px] leading-5 text-muted">
                                <span className="font-semibold text-text">The weakest link.</span> The score multiplies the factors together, a weighted geometric mean, so a weak one cannot be averaged away.
                              </p>
                            )}
                            <a href={`#dim-${d.id}`} className="link-rule mt-3 inline-block text-[13px] font-medium text-text">
                              All the numbers
                            </a>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          )}

          <section className={`${pad} pb-14`} aria-labelledby="h-do">
            <h3 id="h-do" className="display text-[24px] leading-8 text-text">
              Work with this place
            </h3>
            <div className="mt-5 grid gap-x-10 gap-y-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              {[tools.primary, tools.secondary].map((t, i) => (
                <div key={t.title} className={`border-t-2 pt-4 ${i === 0 ? 'border-accent' : 'border-line'}`}>
                  <ActivityArt kind={t.art} className={`w-auto ${i === 0 ? 'h-16 text-accent' : 'h-12 text-muted'}`} />
                  <h4 className={`display mt-3 text-text ${i === 0 ? 'text-[28px] leading-8' : 'text-[20px] leading-7'}`}>{t.title}</h4>
                  <p className="mt-1 max-w-[46ch] text-[14px] leading-[22px] text-muted">{t.line}</p>
                  <button type="button" onClick={t.onClick ?? undefined} disabled={!t.onClick} className={`btn mt-4 ${i === 0 ? 'btn-primary !h-12 !px-6 !text-[15px]' : ''}`}>
                    {t.cta}
                  </button>
                  {!t.onClick && t.why && <p className="mt-2 max-w-[46ch] text-[12px] leading-[18px] text-muted">{t.why}</p>}
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-x-2 gap-y-1">
              {actions.map((a) => (
                <button key={a.label} type="button" onClick={a.onClick ?? undefined} disabled={!a.onClick} title={a.onClick ? undefined : a.why} className="btn btn-ghost !pl-0 !pr-4">
                  {a.label}
                </button>
              ))}
            </div>
          </section>

          {!custom && (
          <section className={`${pad} py-10`} aria-labelledby="h-side">
            <h3 id="h-side" className="display mb-4 text-[24px] leading-8 text-text">
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
          )}

          {ground.earth && ground.target && (
            <section className={`${pad} py-10`} aria-labelledby="h-slide">
              <h3 id="h-slide" className="display mb-4 text-[24px] leading-8 text-text">
                Slide between the two
              </h3>
              <CompareSlider earth={ground.earth} target={ground.target} windowKm={ground.windowKm} earthName={name} targetName={target.name} targetWorld={target.body === 'moon' ? 'Moon' : 'Mars'} />
            </section>
          )}

          <FieldLogistics
            lat={cell.lat}
            {...logisticsFromRecord(record)}
            relief={ground.earth?.elevation ? { item: ground.earth, windowKm: ground.windowKm } : null}
          />

          <section className={`${pad} py-10`} aria-labelledby="h-rows">
            <h3 id="h-rows" className="display text-[24px] leading-8 text-text">
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

          <section className={`${pad} py-10`} aria-labelledby="h-extra">
            <h3 id="h-extra" className="display text-[24px] leading-8 text-text">
              Added after the score was frozen
            </h3>
            <p className="mt-1 max-w-[72ch] text-[12px] text-muted">Shown beside the score, never part of it, and not validated.</p>
            <ul className="mt-2">
              {extra.map((d) => (
                <DimensionRow key={d.id} d={d} targetName={target.name} />
              ))}
            </ul>
            {record.purposes.some((p) => p.extendedScore !== null) && (
              <div className="mt-4 max-w-[560px]">
                <h4 className="label">Purpose scores with the added dimensions, not validated</h4>
                <table className="mt-2 w-full border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className="label py-1.5 font-normal">Purpose</th>
                      <th scope="col" className="label py-1.5 text-right font-normal">Frozen score</th>
                      <th scope="col" className="label py-1.5 text-right font-normal">With added</th>
                      <th scope="col" className="label py-1.5 pl-4 font-normal">Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.purposes.map((p) => (
                      <tr key={p.id} className="border-b border-line">
                        <td className="py-1.5 text-text">{p.label}</td>
                        <td className={`num py-1.5 text-right ${p.score === null ? 'text-muted' : 'text-text'}`}>{p.score === null ? 'no data' : p.score.toFixed(0)}</td>
                        <td className={`num py-1.5 text-right ${p.extendedScore === null ? 'text-muted' : 'text-text'}`}>{p.extendedScore === null ? 'no data' : p.extendedScore.toFixed(0)}</td>
                        <td className="py-1.5 pl-4 text-[12px] text-muted">{p.extraDimensions.length > 0 ? p.extraDimensions.join(', ') : 'none'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px] text-muted">
                  Scores out of 100. An added dimension joins a purpose with the average weight of that purpose's own factors. No weight was fitted
                  and nothing here has been validated. The all-round match is unchanged.
                </p>
              </div>
            )}
          </section>

          <section className={`${pad} py-10`} aria-labelledby="h-cannot">
            <h3 id="h-cannot" className="display text-[24px] leading-8 text-text">
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

          <FullData
            record={record}
            explained={e}
            cell={cell}
            target={target}
            meta={meta}
            placeName={name}
            scale={scale}
            ground={ground}
            earth={earth}
            climate={climate}
            minerals={minerals}
          />
        </div>

        <section className={`${pad} border-t border-line py-10`} aria-labelledby="h-more">
          <h3 id="h-more" className="display text-[24px] leading-8 text-text">
            More about this place
          </h3>
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
