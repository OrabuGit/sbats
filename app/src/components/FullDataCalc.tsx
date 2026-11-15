// Pure calculations behind the "Full data" section of the match page. Everything here is computed in the
// browser from the data files; nothing is typed in. A missing input gives null, which the UI prints as "no data".
import type { EarthFile } from '../types';
import type { MatchRecord, MatchRow, MatchSide } from '../lib/matchAdapter';
import { EARTH_EXTRA_KEYS, extraRanges } from '../lib/match';
import { computeEarthRanges, sunElevation } from '../lib/scoring';
import type { CellScore } from '../types';

const MINUS = '−';
export const minus = (s: string) => s.replace('-', MINUS);

/** Decimals per quantity. */
const DIGITS: Record<string, number> = { tempMean: 1, tempRange: 1, precip: 0, ndvi: 2, slope: 1, roughness: 0, sunElevation: 1, wind: 1, dust: 2, ice: 2 };

export function fmt(key: string, v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return 'no data';
  const d = DIGITS[key] ?? 2;
  return minus(v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));
}

export function fmtSigned(key: string, v: number): string {
  const s = fmt(key, Math.abs(v));
  if (v === 0 || /^0\.?0*$/.test(s)) return s;
  return `${v > 0 ? '+' : MINUS}${s}`;
}

export const fmtN = (v: number, d = 0) => minus(v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));

// ---- Earth's range -------------------------------------------------------------------------------

/** The cell field behind each record row key. null: no per-cell value to rank against. */
function earthField(key: string, barrenFallback: boolean): string | null {
  if (key === 'ndvi') return barrenFallback ? 'barrenFrac' : 'ndvi';
  if (key === 'sunElevation') return 'sunElevation';
  const extra = EARTH_EXTRA_KEYS.find((e) => e.id === key);
  if (extra) return extra.key;
  if (['tempMean', 'tempRange', 'precip', 'slope', 'roughness', 'lithology'].includes(key)) return key;
  return null;
}

const sortedOf = new WeakMap<EarthFile, Map<string, Float64Array>>();
function sortedValues(earth: EarthFile, field: string): Float64Array {
  let byField = sortedOf.get(earth);
  if (!byField) sortedOf.set(earth, (byField = new Map()));
  let hit = byField.get(field);
  if (!hit) {
    const out: number[] = [];
    for (const c of earth.cells) {
      const v = field === 'sunElevation' ? sunElevation('earth', c.lat) : (c as unknown as Record<string, unknown>)[field];
      if (typeof v === 'number' && Number.isFinite(v)) out.push(v);
    }
    hit = Float64Array.from(out).sort();
    byField.set(field, hit);
  }
  return hit;
}

function lowerBound(a: Float64Array, v: number): number {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (a[mid] < v) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export interface EarthPlacement {
  /** Mid-rank percentile, 0 to 100: the share of Earth cells with a lower value, ties counted half. */
  percentile: number | null;
  min: number | null;
  max: number | null;
  cells: number;
  /** For a categorical key: the share of Earth cells with the same class, 0 to 100. */
  sameClass: number | null;
}

const NO_PLACE: EarthPlacement = { percentile: null, min: null, max: null, cells: 0, sameClass: null };

export function placeInEarth(earth: EarthFile | null, key: string, value: number | null, barrenFallback: boolean): EarthPlacement {
  if (!earth || value === null) return NO_PLACE;
  const field = earthField(key, barrenFallback);
  if (!field) return NO_PLACE;
  const a = sortedValues(earth, field);
  if (a.length === 0) return NO_PLACE;
  const lo = lowerBound(a, value);
  let hi = lo;
  while (hi < a.length && a[hi] === value) hi++;
  if (field === 'lithology') return { percentile: null, min: null, max: null, cells: a.length, sameClass: ((hi - lo) / a.length) * 100 };
  return { percentile: ((lo + (hi - lo) / 2) / a.length) * 100, min: a[0], max: a[a.length - 1], cells: a.length, sameClass: null };
}

const rangesOf = new WeakMap<EarthFile, ReturnType<typeof computeEarthRanges>>();
const extraOf = new WeakMap<EarthFile, ReturnType<typeof extraRanges>>();

/** Earth's observed range for a key, the one the scorer clamps to (min and max over all cells). */
function earthRange(earth: EarthFile, key: string): { min: number; max: number } | null {
  let r = rangesOf.get(earth);
  if (!r) rangesOf.set(earth, (r = computeEarthRanges(earth.cells)));
  const hit = (r as Record<string, { min: number; max: number } | null | undefined>)[key];
  if (hit) return hit;
  let x = extraOf.get(earth);
  if (!x) extraOf.set(earth, (x = extraRanges(earth.cells)));
  return (x as Record<string, { min: number; max: number } | undefined>)[key] ?? null;
}

// ---- The factor table ----------------------------------------------------------------------------

export interface FactorLine {
  key: string;
  label: string;
  dimension: string;
  inScore: boolean;
  unit: string;
  /** The Earth side is the bare-ground share of the cell (no NDVI there), not an NDVI value. */
  barren: boolean;
  earth: MatchSide;
  target: MatchSide;
  /** Numeric values when both sides are numbers. */
  earthValue: number | null;
  targetValue: number | null;
  /** Earth minus the real target value. */
  diff: number | null;
  /** The target value used in scoring, when it was clamped to Earth's range. */
  clampedTo: number | null;
  /** Earth minus the clamped target value. */
  diffClamped: number | null;
  similarity: number | null;
  placement: EarthPlacement;
  resolution: string;
}

/** Width in pixels of the plot area of the cross-section: the horizontal scale, so the vertical one can match it. */
export const PLOT_W = 560;

export const GRID_TEXT = '0.5° grid cell, about 55 km';

function resolutionOf(side: MatchSide, footprintKm: number | null): string {
  switch (side.scale) {
    case 'grid':
      return GRID_TEXT;
    case 'site':
      return footprintKm !== null ? `footprint, ${fmtN(footprintKm)} km window` : 'footprint of the site';
    case 'volcano':
      return 'whole volcano';
    case 'computed':
      return 'computed from the latitude';
    default:
      return side.value === null ? 'no data' : 'as published';
  }
}

export function factorLines(record: MatchRecord, earth: EarthFile | null, explained: CellScore | null): FactorLine[] {
  const known = new Map((explained?.breakdown ?? []).flatMap((f) => f.keys).map((k) => [k.key as string, k]));
  const out: FactorLine[] = [];
  for (const d of record.dimensions) {
    for (const r of d.rows as MatchRow[]) {
      const earthValue = typeof r.earth.value === 'number' ? r.earth.value : null;
      const targetValue = typeof r.target.value === 'number' ? r.target.value : null;
      const barren = r.key === 'ndvi' && /land cover/i.test(r.earth.text);
      const numeric = r.key !== 'lithology' && r.key !== 'minerals';
      let clampedTo: number | null = null;
      if (numeric && targetValue !== null) {
        const range = earth ? earthRange(earth, r.key) : null;
        if (range) {
          const c = Math.min(range.max, Math.max(range.min, targetValue));
          if (c !== targetValue) clampedTo = c;
        } else {
          // Without the Earth file, read it from the scorer's own breakdown where the key is there.
          const k = known.get(r.key);
          if (k && k.targetValue !== null && k.targetClamped !== null && k.targetValue === targetValue && k.targetClamped !== k.targetValue) clampedTo = k.targetClamped;
        }
      }
      const diff = numeric && !barren && earthValue !== null && targetValue !== null ? earthValue - targetValue : null;
      out.push({
        key: r.key,
        label: r.label,
        dimension: d.label,
        inScore: d.inScore,
        unit: barren ? 'Earth: share of cell that is bare ground. Target: NDVI' : r.unit,
        barren,
        earth: r.earth,
        target: r.target,
        earthValue,
        targetValue,
        diff,
        clampedTo,
        diffClamped: clampedTo !== null && earthValue !== null && !barren ? earthValue - clampedTo : null,
        similarity: r.similarity,
        placement: placeInEarth(earth, r.key, earthValue, barren),
        resolution: resolutionOf(r.earth, record.earth.footprintKm),
      });
    }
  }
  return out;
}

const ordinal = (n: number) => {
  const r = Math.round(n);
  const s = ['th', 'st', 'nd', 'rd'];
  const v = r % 100;
  return `${r}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};
export const percentileWord = (p: number) => `${ordinal(p)} percentile`;

/** One sentence on the table, by rule. */
export function tableReading(lines: FactorLine[]): string {
  const scored = lines.filter((l) => l.similarity !== null);
  if (scored.length === 0) return 'No measurement could be compared for this pair.';
  const clamped = lines.filter((l) => l.clampedTo !== null);
  const matches = scored.filter((l) => (l.similarity as number) >= 0.75).length;
  const weakest = scored.reduce((w, l) => ((l.similarity as number) < (w.similarity as number) ? l : w));
  const parts = [
    `${matches} of ${scored.length} compared measurements are a match (similarity 0.75 or more)`,
    `the weakest is ${weakest.label.toLowerCase()} at ${(weakest.similarity as number).toFixed(2)}`,
  ];
  let s = `${parts.join('; ')}.`;
  if (clamped.length > 0) s += ` ${clamped.length === 1 ? 'One target value lies' : `${clamped.length} target values lie`} outside anything on Earth, so the score compares with Earth's closest value: ${clamped.map((l) => l.label.toLowerCase()).join(', ')}.`;
  return s;
}

// ---- Elevation: profile and slope ------------------------------------------------------------------

export interface Profile {
  /** Distance from the west edge, km. */
  x: number[];
  /** Height above the window's lowest point, m. NaN where there is no data. */
  z: number[];
  lowest: number;
  /** Highest valid point of the whole window above its lowest point. */
  windowRelief: number;
  km: number;
}

/** West-east line through the centre of a square window. Heights are relative to the window's own lowest point. */
export function profileOf(grid: Float32Array, size: number, pixelM: number): Profile | null {
  let lowest = Infinity;
  let highest = -Infinity;
  for (let i = 0; i < grid.length; i++) {
    const v = grid[i];
    if (!Number.isFinite(v)) continue;
    if (v < lowest) lowest = v;
    if (v > highest) highest = v;
  }
  if (!Number.isFinite(lowest)) return null;
  const row = Math.floor(size / 2);
  const x: number[] = [];
  const z: number[] = [];
  for (let c = 0; c < size; c++) {
    x.push(((c + 0.5) * pixelM) / 1000);
    const v = grid[row * size + c];
    z.push(Number.isFinite(v) ? v - lowest : NaN);
  }
  return { x, z, lowest, windowRelief: highest - lowest, km: (size * pixelM) / 1000 };
}

export const BIN_DEG = 2;
export const MAX_DEG = 40;
export const BINS = MAX_DEG / BIN_DEG;

export interface SlopeStats {
  /** Share of valid pixels per 2 degree bin, 0 to 1. */
  shares: number[];
  /** Share steeper than 40 degrees. */
  over: number;
  median: number;
  mean: number;
  pixels: number;
}

/** Slope in degrees per pixel by central differences, using the pixel size in metres. */
export function slopeStats(grid: Float32Array, size: number, pixelM: number): SlopeStats | null {
  const counts = new Array<number>(BINS).fill(0);
  let over = 0;
  let n = 0;
  let sum = 0;
  const all = new Float32Array((size - 2) * (size - 2));
  for (let r = 1; r < size - 1; r++) {
    for (let c = 1; c < size - 1; c++) {
      const e = grid[r * size + c + 1];
      const w = grid[r * size + c - 1];
      const nn = grid[(r - 1) * size + c];
      const s = grid[(r + 1) * size + c];
      if (!(Number.isFinite(e) && Number.isFinite(w) && Number.isFinite(nn) && Number.isFinite(s))) continue;
      const dx = (e - w) / (2 * pixelM);
      const dy = (nn - s) / (2 * pixelM);
      const deg = (Math.atan(Math.hypot(dx, dy)) * 180) / Math.PI;
      all[n++] = deg;
      sum += deg;
      if (deg >= MAX_DEG) over++;
      else counts[Math.floor(deg / BIN_DEG)]++;
    }
  }
  if (n === 0) return null;
  const sorted = all.subarray(0, n).slice().sort();
  return { shares: counts.map((k) => k / n), over: over / n, median: sorted[Math.floor(n / 2)], mean: sum / n, pixels: n };
}

export function histogramOverlap(a: SlopeStats, b: SlopeStats): number {
  let s = 0;
  for (let i = 0; i < BINS; i++) s += Math.min(a.shares[i], b.shares[i]);
  s += Math.min(a.over, b.over);
  return s;
}

/** Reading for the cross-section, by rule from the two profiles. */
export function profileReading(e: Profile, t: Profile, targetName: string): string {
  const rel = (p: Profile) => {
    const v = p.z.filter((q) => Number.isFinite(q));
    return v.length ? Math.max(...v) - Math.min(...v) : 0;
  };
  const top = (p: Profile) => Math.max(...p.z.filter((q) => Number.isFinite(q)));
  const eTop = top(e);
  const tTop = top(t);
  const eRel = rel(e);
  const tRel = rel(t);
  const flat = (r: number) => (r < 5 ? 'within a few metres of flat' : r < 30 ? `gently rolling, ${fmtN(r)} m from low to high` : `${fmtN(r)} m from low to high`);
  const d = eTop - tTop;
  const cmp =
    Math.abs(d) < 1
      ? `The Earth profile and the ${targetName} profile reach the same height above their own lowest points`
      : `The Earth profile is ${fmtN(Math.abs(d))} m ${d > 0 ? 'higher' : 'lower'} than the ${targetName} profile at its highest point`;
  const hidden = Math.max(eRel, tRel) * (PLOT_W / (Math.max(e.km, t.km) * 1000)) < 3 ? ' At true scale a rise this small is under three pixels tall, so both lines look flat.' : '';
  return `${cmp}. Earth is ${flat(eRel)}; ${targetName} is ${flat(tRel)}.${hidden}`;
}

export function slopeReading(e: SlopeStats, t: SlopeStats, targetName: string, ePx: number, tPx: number): string {
  const ov = histogramOverlap(e, t);
  const px = ePx === tPx ? `Both grids have ${fmtN(ePx)} m pixels.` : `Pixel size differs (Earth ${fmtN(ePx)} m, ${targetName} ${fmtN(tPx)} m), and slope depends on it.`;
  return `The median slope is ${fmtN(e.median, 1)}° at the Earth place and ${fmtN(t.median, 1)}° at ${targetName}: half of each window is flatter than that. The two histograms overlap on ${fmtN(ov * 100)}% of the window. ${px}`;
}

// ---- Monthly climate -------------------------------------------------------------------------------

export interface MonthRow {
  month: number;
  tempMean: number | null;
  tempRange: number | null;
  precip: number | null;
  solar: number | null;
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function climateReading(months: MonthRow[], name: string): string {
  const pick = (k: 'tempMean' | 'precip' | 'solar', hi: boolean) => {
    const v = months.filter((m) => m[k] !== null);
    if (v.length === 0) return null;
    return v.reduce((a, m) => ((hi ? (m[k] as number) > (a[k] as number) : (m[k] as number) < (a[k] as number)) ? m : a));
  };
  const wt = pick('tempMean', true);
  const ct = pick('tempMean', false);
  const wp = pick('precip', true);
  const dp = pick('precip', false);
  const parts: string[] = [];
  if (wt && ct) parts.push(`${name} is warmest in ${MONTHS[wt.month - 1]} (${fmtN(wt.tempMean as number, 1)} °C) and coolest in ${MONTHS[ct.month - 1]} (${fmtN(ct.tempMean as number, 1)} °C)`);
  if (wp && dp) {
    const all = months.length === 12 && months.every((m) => m.precip !== null);
    const total = all ? months.reduce((s, m) => s + (m.precip as number), 0) : null;
    parts.push(`wettest in ${MONTHS[wp.month - 1]} (${fmtN(wp.precip as number)} mm) and driest in ${MONTHS[dp.month - 1]} (${fmtN(dp.precip as number)} mm)${total !== null ? `, ${fmtN(total)} mm over the year` : ''}`);
  }
  return parts.length ? `${parts.join('; ')}.` : 'No month has a value.';
}
