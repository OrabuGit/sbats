import { ArrowLeft } from 'lucide-react';
import type { Analog, CellScore, ClampGap, EarthCell, FactorBreakdown, FactorKey, KeyBreakdown, LandCoverMeta, Target } from '../types';
import { formatCoords, siteCode } from '../lib/geo';
import { formatScore, formatShare, formatSim, formatValue, isSunKey, keyLabel, unscoredText, type MetaByKey } from '../lib/format';
import { NEW_DISTANCE_KM } from '../lib/rank';
import { PURPOSES, type DimensionProfile, type PurposeDef, type PurposeId } from '../lib/scoringAdapter';
import { ComputedBadge, ConfidenceBadge, SourceBadge, Tag } from './Badges';
import { Radar } from './Radar';

interface Props {
  cell: EarthCell;
  target: Target;
  explained: CellScore;
  meta: MetaByKey;
  /** Land cover metadata from earth.json, for the badge on the ice and barren shares. */
  landCover: LandCoverMeta | null;
  /** The purpose the headline score is for, or null for the all-round score. */
  purpose: PurposeDef | null;
  profile: DimensionProfile[] | null;
  purposeScores: { id: PurposeId; result: CellScore }[] | null;
  onPurpose: (id: PurposeId) => void;
  named: Analog | null;
  isNew: boolean;
  rank: number | null;
  /** Share of scored cells this cell beats, 0 to 100. null when unscored. */
  percentile: number | null;
  /** Target values outside Earth's observed range, from the scoring library. */
  gaps: ClampGap[];
  /** Notes from scoring, for example when Rock type had to be left out. */
  notes: string[];
  onBack: () => void;
  /** Opens the base sandbox on this cell. null while the sandbox is not available. */
  onBuild: (() => void) | null;
}

const KIND_LABEL = { candidate: 'SBATS candidate', known: 'Known analog', negative: 'Negative control' } as const;

function ValueRow({ k, target, meta }: { k: KeyBreakdown; target: Target; meta: MetaByKey }) {
  const sun = isSunKey(k.key);
  const tv = sun ? null : target.values[k.key as FactorKey];
  const m = sun ? null : meta[k.key as FactorKey];
  const clamped = k.targetValue !== null && k.targetClamped !== null && k.targetValue !== k.targetClamped;
  const state =
    k.status === 'scored'
      ? `sim ${formatSim(k.similarity)}`
      : k.status === 'zero-weight'
        ? `sim ${formatSim(k.similarity)} · weight 0`
        : 'left out';
  return (
    <div className="mt-2 border-l border-line pl-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] text-text">{sun ? k.label : keyLabel(k.key, meta)}</span>
        <span className="num text-[11px] text-muted">{state}</span>
      </div>
      <dl className="mt-1 grid grid-cols-[52px_1fr] gap-x-2 gap-y-1">
        <dt className="label text-[10px]">Earth</dt>
        <dd className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className={`num text-[12px] ${k.earthValue === null ? 'text-muted' : 'text-text'}`}>{formatValue(k.key, k.earthValue, meta)}</span>
          {k.earthValue !== null && (sun ? <ComputedBadge /> : <SourceBadge badge={m?.badge ?? null} source={m?.source} />)}
        </dd>
        <dt className="label text-[10px]">Target</dt>
        <dd className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className={`num text-[12px] ${k.targetValue === null ? 'text-muted' : 'text-text'}`}>
            {k.targetValue === null ? 'no published value' : formatValue(k.key, k.targetValue, meta)}
          </span>
          {k.targetValue !== null && (sun ? <ComputedBadge /> : <SourceBadge badge={tv?.badge ?? null} source={tv?.source} />)}
          {clamped && <span className="text-[11px] text-muted">scored as {formatValue(k.key, k.targetClamped, meta)}, Earth's limit</span>}
        </dd>
      </dl>
    </div>
  );
}

/** Says which measurement gave the Bare ground similarity, with the land cover shares behind it. */
function BareGroundNote({ k, landCover }: { k: KeyBreakdown; landCover: LandCoverMeta | null }) {
  const b = k.bareGround;
  if (!b) return null;
  const badge = <SourceBadge badge="Measured" source={landCover?.source ?? 'MODIS MCD12C1 land cover'} />;
  const ice = b.snowIceFrac ?? 0;
  return (
    <div className="mt-2 border-l border-line pl-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] text-text">Measured from</span>
        <span className="num text-[11px] uppercase tracking-wider text-text">{b.source === 'ndvi' ? 'NDVI' : 'Land cover'}</span>
      </div>
      <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-2 gap-y-1">
        <dt className="text-[12px] text-muted">Permanent snow and ice</dt>
        <dd className="flex items-center justify-end gap-2">
          <span className="num text-[12px] text-text">{formatShare(b.snowIceFrac)}</span>
          {b.snowIceFrac !== null && badge}
        </dd>
        {(b.source === 'landCover' || b.barrenFrac !== null) && (
          <>
            <dt className="text-[12px] text-muted">Barren ground</dt>
            <dd className="flex items-center justify-end gap-2">
              <span className="num text-[12px] text-text">{formatShare(b.barrenFrac)}</span>
              {b.barrenFrac !== null && badge}
            </dd>
          </>
        )}
      </dl>
      <p className="mt-1.5 text-[11px] text-muted">
        {b.source === 'ndvi'
          ? ice > 0
            ? `The NDVI match is multiplied by the ice-free share of the cell (${formatShare(1 - ice)}). Ice is not regolith.`
            : 'The NDVI match is used as it is. No permanent ice in this cell.'
          : 'The NDVI product has no data here. The barren share of the cell stands in for it and is used directly as the similarity.'}
        {k.similarity === 0 ? ' The cell is all permanent ice, so the score is 0. It is scored, not missing.' : ''}
      </p>
    </div>
  );
}

function FactorBlock({ f, target, meta, landCover }: { f: FactorBreakdown; target: Target; meta: MetaByKey; landCover: LandCoverMeta | null }) {
  const pct = f.similarity === null ? 0 : Math.max(0, Math.min(1, f.similarity)) * 100;
  const partial = f.weight > 0 && f.coveredWeight > 0 && f.coveredWeight < f.weight - 1e-9;
  const dropped = f.weight > 0 && f.coveredWeight === 0;
  return (
    <li className="border-b border-line px-4 py-3 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="label !text-text">{f.label}</h4>
        <span className="num text-[11px] text-muted">weight {f.weight.toFixed(2)}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <div
          className="h-2 flex-1 border border-line bg-bg"
          role="meter"
          aria-label={`${f.label} similarity`}
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={f.similarity ?? 0}
          aria-valuetext={f.similarity === null ? 'no data' : f.similarity.toFixed(2)}
        >
          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <span className={`num w-14 text-right text-[13px] font-semibold ${f.similarity === null ? 'text-muted' : 'text-text'}`}>
          {f.similarity === null ? 'no data' : formatSim(f.similarity)}
        </span>
      </div>
      {partial && <p className="mt-1 text-[11px] text-muted">One of two inputs is missing. This factor counts for half its weight.</p>}
      {dropped && <p className="mt-1 text-[11px] text-muted">Left out of the score. The other weights were rescaled.</p>}
      {f.keys.map((k) => (
        <div key={k.key}>
          <ValueRow k={k} target={target} meta={meta} />
          <BareGroundNote k={k} landCover={landCover} />
        </div>
      ))}
    </li>
  );
}

export function Dossier({ cell, target, explained: e, meta, landCover, purpose, profile, purposeScores, onPurpose, named, isNew, rank, percentile, gaps, notes, onBack, onBuild }: Props) {
  const scored = e.score !== null;
  const sources = new Map<string, string>();
  for (const f of e.breakdown)
    for (const k of f.keys) {
      if (isSunKey(k.key)) continue;
      const m = meta[k.key as FactorKey];
      if (m && k.earthValue !== null) sources.set(`${m.badge}: ${m.source}`, m.badge);
      const tv = target.values[k.key as FactorKey];
      if (tv?.badge && tv.source && k.targetValue !== null) sources.set(`${tv.badge}: ${tv.source}`, tv.badge);
    }
  // Only gaps that matter: a target value beyond Earth's range by at least half its tolerance.
  const sigmaOf = new Map(e.breakdown.flatMap((f) => f.keys).map((k) => [k.key as string, k.sigma]));
  const realGaps = gaps.filter((g) => {
    const sigma = sigmaOf.get(g.key);
    return typeof sigma !== 'number' || Math.abs(g.gap) >= sigma / 2;
  });
  const hasSun = e.breakdown.some((f) => f.keys.some((k) => isSunKey(k.key)));

  return (
    <article aria-labelledby="h-dossier">
      <header className="border-b border-line">
        <button type="button" onClick={onBack} className="label flex min-h-11 w-full items-center gap-2 border-b border-line px-4 !text-text hover:!text-accent">
          <ArrowLeft size={14} aria-hidden="true" /> Back to candidates
        </button>
        <div className="p-4">
          <p className="label">Site dossier</p>
          <h2 id="h-dossier" className="mt-1 text-[17px] font-semibold leading-6 text-text">
            {named ? named.name : siteCode(cell)}
          </h2>
          <p className="num mt-0.5 text-[12px] text-muted">
            {named ? `${siteCode(cell)} · ` : ''}
            {formatCoords(cell.lat, cell.lon)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {named && <Tag>{KIND_LABEL[named.kind]}</Tag>}
            {scored && isNew && (
              <Tag tone="accent" title={`More than ${NEW_DISTANCE_KM} km from every known analog site`}>
                New
              </Tag>
            )}
            {rank !== null && <Tag>Rank {rank}</Tag>}
          </div>

          <div className="mt-4 flex items-end justify-between gap-4 border border-line bg-bg p-3">
            <div>
              <p className="label">{purpose ? `${purpose.label}: match to ${target.name}` : `All-round match to ${target.name}`}</p>
              <p className={`num mt-1 text-[44px] font-semibold leading-none ${scored ? 'text-accent' : 'text-muted'}`}>
                {scored ? formatScore(e.score) : 'NO DATA'}
                {scored && <span className="ml-1 text-[14px] font-normal text-muted">/ 100</span>}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 pb-0.5">
              <ConfidenceBadge confidence={e.confidence} coverage={e.coverage} />
              <span className="num text-[11px] text-muted">coverage {(e.coverage * 100).toFixed(0)}%</span>
              {percentile !== null && <span className="num text-[11px] text-muted">beats {percentile.toFixed(0)}% of cells</span>}
            </div>
          </div>
          <p className="mt-3 text-[14px] text-text">{scored ? e.reason : unscoredText(e, meta)}</p>
          {/* "Best month to test" goes here when flags.bestMonth is on. It needs monthly climate data, which earth.json does not have yet. */}
          {onBuild && (
            <button type="button" onClick={onBuild} className="label mt-3 flex min-h-11 w-full items-center justify-center gap-2 border border-accent !text-accent hover:bg-bg">
              Build a base here
            </button>
          )}
          {notes.map((n) => (
            <p key={n} className="mt-2 text-[12px] text-accent" role="note">
              {n}
            </p>
          ))}
        </div>
      </header>

      <section className="border-b border-line" aria-labelledby="h-missing">
        <div className="px-4 py-3">
          <h3 id="h-missing" className="label">
            Missing factors
          </h3>
          {e.missing.length === 0 ? (
            <p className="mt-1 text-[13px] text-text">None. Every factor has data for this cell and target.</p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {e.missing.map((key) => {
                const noTarget = !isSunKey(key) && target.values[key as FactorKey]?.value == null;
                const noCell = !isSunKey(key) && cell[key as FactorKey] == null;
                return (
                  <li key={key} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="text-text">{keyLabel(key, meta)}</span>
                    <span className="text-right text-[12px] text-muted">
                      {noTarget && noCell
                        ? 'no data here, no published target value'
                        : noTarget
                          ? 'no published target value'
                          : noCell
                            ? 'no data in this cell'
                            : 'could not be compared'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {profile && (
        <section className="border-b border-line px-4 py-3" aria-labelledby="h-profile">
          <h3 id="h-profile" className="label">
            Analog profile
          </h3>
          <p className="mt-1 text-[12px] text-muted">
            What this cell is like the target in, one dimension at a time. No veto and no weights: it reports what is there.
          </p>
          <ul className="mt-2 space-y-2.5">
            {profile.map((d) => (
              <li key={d.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-medium text-text">{d.label}</span>
                  <span className={`num text-[13px] font-semibold ${d.similarity === null ? 'text-muted' : 'text-text'}`}>
                    {d.similarity === null ? 'no data' : formatSim(d.similarity)}
                  </span>
                </div>
                <div
                  className="mt-1 h-2 border border-line bg-bg"
                  role="meter"
                  aria-label={`${d.label} similarity`}
                  aria-valuemin={0}
                  aria-valuemax={1}
                  aria-valuenow={d.similarity ?? 0}
                  aria-valuetext={d.similarity === null ? 'no data' : d.similarity.toFixed(2)}
                >
                  <div className="h-full bg-accent" style={{ width: `${(d.similarity ?? 0) * 100}%` }} />
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                  <span>{d.measures}.</span>
                  {d.percentile !== null && (
                    <span className="num">
                      Beats or ties {(d.percentile * 100).toFixed(0)}% of Earth cells
                      {d.shareTied !== null && d.shareTied >= 0.05 ? `, tied with ${(d.shareTied * 100).toFixed(0)}%` : ''}
                    </span>
                  )}
                  {d.similarity !== null && <ComputedBadge title="Computed in the browser from the factor similarities below, which come from the sourced values." />}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {purposeScores && (
        <section className="border-b border-line" aria-labelledby="h-purposes">
          <div className="px-4 pt-3">
            <h3 id="h-purposes" className="label">
              Match by purpose
            </h3>
            <p className="mt-1 text-[12px] text-muted">
              The same formula with only the factors each use depends on. Pick one to rank the whole Earth by it.
            </p>
          </div>
          <ul className="mt-2 border-t border-line">
            {purposeScores.map(({ id, result }) => {
              const def = PURPOSES.find((x) => x.id === id);
              if (!def) return null;
              const on = purpose?.id === id;
              return (
                <li key={id} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onPurpose(id)}
                    className={`flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left hover:bg-bg ${on ? 'bg-bg' : ''}`}
                  >
                    <span className={`block h-2.5 w-2.5 shrink-0 border ${on ? 'border-accent bg-accent' : 'border-muted'}`} aria-hidden="true" />
                    <span className={`flex-1 text-[13px] ${on ? 'text-accent' : 'text-text'}`}>{def.label}</span>
                    <ConfidenceBadge confidence={result.confidence} coverage={result.coverage} />
                    <span className={`num w-9 text-right text-[15px] font-semibold ${result.score === null ? 'text-muted' : 'text-text'}`}>
                      {formatScore(result.score)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-line px-4 py-2 text-[11px] text-muted">
            Full base rehearsal is the all-round score with the Base weights. The purposes were defined after validation results had been seen:
            a second view, not proof.
          </p>
        </section>
      )}

      <section className="border-b border-line" aria-labelledby="h-radar">
        <h3 id="h-radar" className="label px-4 pt-3">
          Similarity by factor
        </h3>
        <div className="px-4 pb-2">
          <Radar factors={e.breakdown} />
        </div>
      </section>

      <section className="border-b border-line" aria-labelledby="h-breakdown">
        <h3 id="h-breakdown" className="label border-b border-line px-4 py-3">
          Factor breakdown
        </h3>
        <ul>
          {e.breakdown.map((f) => (
            <FactorBlock key={f.factor} f={f} target={target} meta={meta} landCover={landCover} />
          ))}
        </ul>
      </section>

      <section className="border-b border-line px-4 py-3" aria-labelledby="h-cannot">
        <h3 id="h-cannot" className="label">
          What Earth cannot copy
        </h3>
        <p className="mt-1 text-[12px] text-muted">Never part of the score. No site on Earth reproduces these.</p>
        <ul className="mt-2 space-y-2">
          {target.cannotCopy.map((s, i) => (
            <li key={i} className="border-l-2 border-line pl-3 text-[13px] text-text">
              {s}
            </li>
          ))}
          {realGaps.map((g) => {
            const sun = isSunKey(g.key);
            const tv = sun ? null : target.values[g.key as FactorKey];
            const m = sun ? null : meta[g.key as FactorKey];
            return (
              <li key={g.key} className="border-l-2 border-line pl-3 text-[13px] text-text">
                {sun ? g.label : keyLabel(g.key, meta)}: the target is <span className="num">{formatValue(g.key, g.targetValue, meta)}</span>{' '}
                {sun ? <ComputedBadge /> : <SourceBadge badge={tv?.badge ?? null} source={tv?.source} />}. The closest any Earth cell comes is{' '}
                <span className="num">{formatValue(g.key, g.clampedValue, meta)}</span>{' '}
                {sun ? <ComputedBadge /> : <SourceBadge badge={m?.badge ?? null} source={m?.source} />}. The score compares against that Earth limit, so
                the real gap is larger than the score shows.
              </li>
            );
          })}
        </ul>
      </section>

      <section className="px-4 py-3" aria-labelledby="h-sources">
        <h3 id="h-sources" className="label">
          Sources for this dossier
        </h3>
        <ul className="mt-1.5 space-y-1">
          {[...sources.keys()].sort().map((s) => (
            <li key={s} className="text-[12px] text-muted">
              {s}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[12px] text-muted">
          Measured: computed from a dataset. Mission: measured by a spacecraft or rover. Literature: an estimate from a paper.
          {hasSun ? ' Sunlight values are computed in the browser from latitude and axial tilt.' : ''}
        </p>
      </section>
    </article>
  );
}
