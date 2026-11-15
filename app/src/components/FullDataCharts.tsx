import { useMemo } from 'react';
import type { ExtractItem } from '../data/sites';
import { loadElevation } from '../data/sites';
import { useAsync } from '../lib/useAsync';
import { niceTicks, tickText } from './ExploreStats';
import { ComputedBadge, SourceBadge } from './Badges';
import { BINS, BIN_DEG, MAX_DEG, PLOT_W, fmtN, profileOf, profileReading, slopeReading, slopeStats, type Profile } from './FullDataCalc';

export const INK = '#D7DDE3';
export const MUTED = '#7C8894';
export const LINE = '#2A3138';
export const ACCENT = '#FFB000';
/** The second place: a neutral grey, drawn dashed so the two differ in style as well as colour. */
export const GREY = '#A9B4BE';
export const MONO = 'IBM Plex Mono, ui-monospace, monospace';

const M = { l: 66, r: 96, t: 14, b: 48 };
const W = M.l + PLOT_W + M.r;

/** Key to two lines: amber solid for the Earth place, grey dashed for the target. */
export function Legend({ items }: { items: { label: string; dash?: string; color: string; bar?: boolean }[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-text">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-2">
          <svg width="30" height="8" aria-hidden="true">
            {it.bar ? <rect x="9" y="0" width="12" height="8" fill={it.color} /> : <line x1="1" x2="29" y1="4" y2="4" stroke={it.color} strokeWidth="2.5" strokeDasharray={it.dash} />}
          </svg>
          {it.label}
        </li>
      ))}
    </ul>
  );
}

export const DASH = '7 4';

/** Both extracts, loaded once. null elevation on either side means there is nothing to draw. */
function useGrids(earth: ExtractItem | null, target: ExtractItem | null) {
  const ee = earth?.elevation ?? null;
  const te = target?.elevation ?? null;
  return useAsync(async () => (ee && te ? { e: await loadElevation(ee), t: await loadElevation(te) } : null), `fd-${ee?.file ?? ''}|${te?.file ?? ''}`);
}

export const NO_EXTRACT = 'No data: no 20 km elevation extract was built for this pair.';

function pathOf(p: Profile, x: (km: number) => number, y: (m: number) => number): string {
  let d = '';
  let pen = false;
  p.x.forEach((km, i) => {
    const z = p.z[i];
    if (!Number.isFinite(z)) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(km).toFixed(1)} ${y(z).toFixed(1)}`;
    pen = true;
  });
  return d;
}

const NICE = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

interface PairProps {
  earth: ExtractItem | null;
  target: ExtractItem | null;
  earthName: string;
  targetName: string;
}

/** The two places as one pair of axes, west to east through the centre of each window, at true scale. */
export function ElevationSection({ earth, target, earthName, targetName }: PairProps) {
  const grids = useGrids(earth, target);
  const ready = grids.status === 'ready' ? grids.value : null;
  const model = useMemo(() => {
    if (!ready || !earth?.elevation || !target?.elevation) return null;
    const e = profileOf(ready.e, earth.elevation.size, earth.elevation.pixelM);
    const t = profileOf(ready.t, target.elevation.size, target.elevation.pixelM);
    return e && t ? { e, t } : null;
  }, [ready, earth, target]);

  if (!earth?.elevation || !target?.elevation) return <p className="text-[14px] leading-[22px] text-muted">{NO_EXTRACT}</p>;
  if (grids.status === 'loading') return <p className="text-[14px] text-muted" role="status">Loading the elevation extracts</p>;
  if (grids.status === 'error') return <p className="text-[14px] text-muted">No data: the elevation extracts could not be loaded.</p>;
  if (!model) return <p className="text-[14px] text-muted">No data: an elevation extract holds no valid height.</p>;

  const { e, t } = model;
  const km = Math.max(e.km, t.km);
  const px = PLOT_W / (km * 1000); // pixels per metre, the same both ways
  const top = Math.max(...[...e.z, ...t.z].filter((q) => Number.isFinite(q)));
  const plotH = Math.max(44, top * px * 1.08);
  const yMax = plotH / px;
  const yt = niceTicks(0, yMax, 4);
  const xt = niceTicks(0, km, 5);
  const x = (v: number) => M.l + (v / km) * PLOT_W;
  const y = (v: number) => M.t + plotH - v * px;
  const barM = [...NICE].reverse().find((n) => n <= Math.max(1, top / 2)) ?? 1;
  const H = M.t + plotH + M.b + 28;
  const reading = profileReading(e, t, targetName);
  const label = `Cross-sections west to east through the centre of each ${fmtN(km)} km window, at one scale with no vertical exaggeration. ${reading}`;

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[520px] max-w-[760px]" role="img" aria-label={label}>
          {yt.ticks.map((v) => (
            <g key={v}>
              <line x1={M.l} x2={M.l + PLOT_W} y1={y(v)} y2={y(v)} stroke={LINE} strokeWidth="1" />
              <text x={M.l - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fontFamily={MONO} fill={MUTED}>
                {tickText(v, yt.step)}
              </text>
            </g>
          ))}
          {xt.ticks.map((v) => (
            <g key={v}>
              <line x1={x(v)} x2={x(v)} y1={M.t + plotH} y2={M.t + plotH + 5} stroke={MUTED} strokeWidth="1" />
              <text x={x(v)} y={M.t + plotH + 20} textAnchor="middle" fontSize="12" fontFamily={MONO} fill={MUTED}>
                {tickText(v, xt.step)}
              </text>
            </g>
          ))}
          <line x1={M.l} x2={M.l + PLOT_W} y1={y(0)} y2={y(0)} stroke={MUTED} strokeWidth="1" />
          <path d={pathOf(t, x, y)} fill="none" stroke={GREY} strokeWidth="2.5" strokeDasharray={DASH} strokeLinejoin="round" />
          <path d={pathOf(e, x, y)} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinejoin="round" />
          <text x={M.l + PLOT_W / 2} y={M.t + plotH + 40} textAnchor="middle" fontSize="12" fill={INK}>
            Distance from the west edge (km)
          </text>
          <text transform={`translate(14 ${M.t + plotH / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill={INK}>
            Height (m)
          </text>
          {/* Scale bars, drawn at the same scale on both axes: 5 km across below the plot, a height at its right. */}
          <g transform={`translate(${M.l + PLOT_W + 26} ${y(0)})`}>
            <path d={`M0 ${-barM * px} V0 M-4 ${-barM * px} H4 M-4 0 H4`} stroke={INK} strokeWidth="1.5" fill="none" />
            <text x="10" y={-(barM * px) / 2 + 4} fontSize="12" fontFamily={MONO} fill={INK}>{fmtN(barM)} m</text>
          </g>
          <g transform={`translate(${M.l} ${M.t + plotH + M.b + 10})`}>
            <path d={`M0 0 H${(5 / km) * PLOT_W} M0 -4 V4 M${(5 / km) * PLOT_W} -4 V4`} stroke={INK} strokeWidth="1.5" fill="none" />
            <text x={(5 / km) * PLOT_W + 8} y="4" fontSize="12" fontFamily={MONO} fill={INK}>5 km</text>
            <text x={(5 / km) * PLOT_W + 60} y="4" fontSize="12" fill={MUTED}>Scale bars: 5 km across and {fmtN(barM)} m up, one scale.</text>
          </g>
        </svg>
      </div>
      <Legend
        items={[
          { label: `${earthName}, Earth`, color: ACCENT },
          { label: targetName, color: GREY, dash: DASH },
        ]}
      />
      <p className="mt-3 max-w-[72ch] text-[14px] leading-[22px] text-text">{reading}</p>
      <p className="mt-2 max-w-[72ch] text-[12px] leading-4 text-muted">
        Vertical exaggeration: 1x, no vertical exaggeration. Heights are measured from the lowest point of each window. One window per place, {fmtN(km)} km across, one west-east line through its centre.{' '}
        <SourceBadge badge={earth.elevation.badge} source={earth.elevation.product} /> Earth: {earth.elevation.product}, {fmtN(earth.elevation.pixelM)} m pixels.{' '}
        <SourceBadge badge={target.elevation.badge} source={target.elevation.product} /> Target: {target.elevation.product}, {fmtN(target.elevation.pixelM)} m pixels.
      </p>
    </div>
  );
}

/** Step outline of a histogram: bin tops joined by vertical risers. */
function stepPath(shares: number[], x: (deg: number) => number, y: (pct: number) => number): string {
  let d = `M${x(0).toFixed(1)} ${y(shares[0] * 100).toFixed(1)}`;
  for (let i = 0; i < BINS; i++) {
    d += `H${x((i + 1) * BIN_DEG).toFixed(1)}`;
    if (i + 1 < BINS) d += `V${y(shares[i + 1] * 100).toFixed(1)}`;
  }
  return d;
}

/** Slope of every pixel of the two windows, in 2 degree bins up to 40 degrees. */
export function SlopeSection({ earth, target, earthName, targetName }: PairProps) {
  const grids = useGrids(earth, target);
  const ready = grids.status === 'ready' ? grids.value : null;
  const model = useMemo(() => {
    if (!ready || !earth?.elevation || !target?.elevation) return null;
    const e = slopeStats(ready.e, earth.elevation.size, earth.elevation.pixelM);
    const t = slopeStats(ready.t, target.elevation.size, target.elevation.pixelM);
    return e && t ? { e, t } : null;
  }, [ready, earth, target]);

  if (!earth?.elevation || !target?.elevation) return <p className="text-[14px] leading-[22px] text-muted">{NO_EXTRACT}</p>;
  if (grids.status === 'loading') return <p className="text-[14px] text-muted" role="status">Loading the elevation extracts</p>;
  if (grids.status === 'error') return <p className="text-[14px] text-muted">No data: the elevation extracts could not be loaded.</p>;
  if (!model) return <p className="text-[14px] text-muted">No data: an elevation extract holds too few valid heights.</p>;

  const { e, t } = model;
  const H = 300;
  const ph = H - 14 - 50;
  const peak = Math.max(...e.shares, ...t.shares) * 100;
  const yt = niceTicks(0, peak * 1.08, 4);
  const yTop = yt.ticks[yt.ticks.length - 1] >= peak ? yt.ticks[yt.ticks.length - 1] : peak * 1.08;
  const xt = niceTicks(0, MAX_DEG, 8);
  const x = (v: number) => M.l + (v / MAX_DEG) * PLOT_W;
  const y = (v: number) => 14 + ph - (v / yTop) * ph;
  const reading = slopeReading(e, t, targetName, earth.elevation.pixelM, target.elevation.pixelM);
  const label = `Histogram of slope in 2 degree bins up to 40 degrees, as a share of each 20 km window, for ${earthName} and ${targetName}. ${reading}`;

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[520px] max-w-[760px]" role="img" aria-label={label}>
          {yt.ticks.map((v) => (
            <g key={v}>
              <line x1={M.l} x2={M.l + PLOT_W} y1={y(v)} y2={y(v)} stroke={LINE} strokeWidth="1" />
              <text x={M.l - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fontFamily={MONO} fill={MUTED}>
                {tickText(v, yt.step)}
              </text>
            </g>
          ))}
          {xt.ticks.map((v) => (
            <g key={v}>
              <line x1={x(v)} x2={x(v)} y1={14 + ph} y2={14 + ph + 5} stroke={MUTED} strokeWidth="1" />
              <text x={x(v)} y={14 + ph + 20} textAnchor="middle" fontSize="12" fontFamily={MONO} fill={MUTED}>
                {tickText(v, xt.step)}
              </text>
            </g>
          ))}
          <path d={stepPath(t.shares, x, y)} fill="none" stroke={GREY} strokeWidth="2.5" strokeDasharray={DASH} strokeLinejoin="round" />
          <path d={stepPath(e.shares, x, y)} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinejoin="round" />
          <text x={M.l + PLOT_W / 2} y={H - 8} textAnchor="middle" fontSize="12" fill={INK}>
            Slope (degrees), 2 degree bins
          </text>
          <text transform={`translate(14 ${14 + ph / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill={INK}>
            Share of the window (%)
          </text>
        </svg>
      </div>
      <Legend
        items={[
          { label: `${earthName}, Earth`, color: ACCENT },
          { label: targetName, color: GREY, dash: DASH },
        ]}
      />
      <p className="mt-3 max-w-[72ch] text-[14px] leading-[22px] text-text">{reading}</p>
      <p className="mt-2 max-w-[72ch] text-[12px] leading-4 text-muted">
        <ComputedBadge title="Computed in the browser from the elevation grids: central differences, using the pixel size in metres." /> Steeper than {MAX_DEG}&deg; (not drawn): Earth {fmtN(e.over * 100, 1)}%, target{' '}
        {fmtN(t.over * 100, 1)}%. Pixels counted: Earth {fmtN(e.pixels)}, target {fmtN(t.pixels)}. Source heights: {earth.elevation.product}; {target.elevation.product}.
      </p>
    </div>
  );
}
