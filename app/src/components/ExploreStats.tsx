import type { EarthFile, FactorKey, Target } from '../types';
import { FACTOR_KEYS } from '../types';
import { formatValue, keyLabel, type MetaByKey, shortName } from '../lib/format';

// Statistics behind the Explore chart. Everything is computed from the cells in earth.json and
// the values in targets.json when the page opens. No number here is typed in.

export interface KeyStats {
  key: FactorKey;
  /** Rock class: a code, not a quantity. Drawn as rows, never as a scale. */
  categorical: boolean;
  /** Cells with a value for this key. */
  n: number;
  min: number;
  max: number;
  /** Ascending values (numeric keys only). */
  sorted: Float64Array;
  /** Present class codes, ascending (categorical only). */
  codes: number[];
  counts: Map<number, number>;
  /** True when the values bunch up near the minimum, so a square-root scale spreads them (rule in skewed()). */
  skewed: boolean;
}

const cache = new WeakMap<EarthFile, Map<FactorKey, KeyStats>>();

/** A non-negative key whose 90th percentile sits in the lowest quarter of its range. */
function skewed(min: number, max: number, p90: number): boolean {
  return min >= 0 && max > min && p90 - min < 0.25 * (max - min);
}

export function keyStats(earth: EarthFile, key: FactorKey): KeyStats {
  let per = cache.get(earth);
  if (!per) cache.set(earth, (per = new Map()));
  const hit = per.get(key);
  if (hit) return hit;

  const categorical = key === 'lithology';
  const vals: number[] = [];
  const counts = new Map<number, number>();
  for (const c of earth.cells) {
    const v = c[key];
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    if (categorical) counts.set(v, (counts.get(v) ?? 0) + 1);
    else vals.push(v);
  }
  const sorted = Float64Array.from(vals).sort();
  const codes = [...counts.keys()].sort((a, b) => a - b);
  const n = categorical ? codes.reduce((s, c) => s + (counts.get(c) ?? 0), 0) : sorted.length;
  const min = categorical ? (codes[0] ?? NaN) : (sorted[0] ?? NaN);
  const max = categorical ? (codes[codes.length - 1] ?? NaN) : (sorted[sorted.length - 1] ?? NaN);
  const p90 = categorical || n === 0 ? NaN : sorted[Math.min(n - 1, Math.floor(0.9 * n))];
  const stats: KeyStats = { key, categorical, n, min, max, sorted, codes, counts, skewed: !categorical && skewed(min, max, p90) };
  per.set(key, stats);
  return stats;
}

/** The keys the chart can offer: those in earth.meta.factors with at least one value. */
export function availableKeys(earth: EarthFile): FactorKey[] {
  const inMeta = new Set(earth.meta.factors.map((f) => f.key));
  return FACTOR_KEYS.filter((k) => inMeta.has(k) && keyStats(earth, k).n > 0);
}

/** Position on an axis from 0 to 1, or null when the value cannot be placed. Numeric values outside Earth's range are clamped to its ends. */
export function axisUnit(s: KeyStats, v: number | null | undefined, sqrt: boolean): number | null {
  if (v === null || v === undefined || !Number.isFinite(v) || s.n === 0) return null;
  if (s.categorical) {
    const i = s.codes.indexOf(v);
    return i < 0 ? null : (i + 0.5) / s.codes.length;
  }
  if (s.max === s.min) return 0.5;
  const t = Math.min(1, Math.max(0, (v - s.min) / (s.max - s.min)));
  return sqrt ? Math.sqrt(t) : t;
}

/** Inverse of axisUnit for numeric axes: the value at position u. */
export function axisValue(s: KeyStats, u: number, sqrt: boolean): number {
  const t = sqrt ? u * u : u;
  return s.min + t * (s.max - s.min);
}

/** Mid-rank percentile of a value among the Earth cells, 0 to 100 (ties count half). */
export function percentileOf(s: KeyStats, v: number): number {
  const a = s.sorted;
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (a[m] < v) lo = m + 1;
    else hi = m;
  }
  const below = lo;
  hi = a.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (a[m] <= v) lo = m + 1;
    else hi = m;
  }
  return (100 * (below + lo)) / 2 / a.length;
}

/** How far the target sits from the middle of Earth's cells on one key, 0 to 50 (50 means outside the range or at an end). */
export function offCentre(s: KeyStats, v: number): number {
  if (s.categorical) return 0;
  if (v < s.min || v > s.max) return 50;
  return Math.abs(percentileOf(s, v) - 50);
}

/** Default axes: the two keys on which the target sits furthest from the Earth median, in percentile terms. */
export function defaultAxes(earth: EarthFile, target: Target): [FactorKey, FactorKey] {
  const keys = availableKeys(earth);
  const scored = keys
    .filter((k) => k !== 'lithology')
    .map((k): { k: FactorKey; d: number; spread: number } | null => {
      const v = target.values[k]?.value;
      const s = keyStats(earth, k);
      if (v === null || v === undefined || !Number.isFinite(v)) return null;
      // Tie-break among targets outside Earth's range (all 50): how far out, in ranges.
      const spread = s.max > s.min ? Math.abs(v < s.min ? s.min - v : v > s.max ? v - s.max : 0) / (s.max - s.min) : 0;
      return { k, d: offCentre(s, v), spread };
    })
    .filter((x): x is { k: FactorKey; d: number; spread: number } => x !== null)
    .sort((a, b) => b.d - a.d || b.spread - a.spread);
  const picks = scored.slice(0, 2).map((x) => x.k);
  for (const k of keys) {
    if (picks.length >= 2) break;
    if (!picks.includes(k)) picks.push(k);
  }
  const [a, b] = picks;
  return [a ?? FACTOR_KEYS[0], b ?? a ?? FACTOR_KEYS[1]];
}

/** Axis unit for titles. The data file's own unit, with the degree word shortened. */
export function unitOf(key: FactorKey, meta: MetaByKey): string {
  const raw = meta[key]?.unit ?? '';
  return raw === 'degrees' || raw === 'deg' ? '°' : raw;
}

// ---- Ticks --------------------------------------------------------------------------------------

/** Round tick values from lo to hi, about `count` of them. */
export function niceTicks(lo: number, hi: number, count: number): { ticks: number[]; step: number } {
  if (!(hi > lo)) return { ticks: [lo], step: 1 };
  const raw = (hi - lo) / Math.max(1, count);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / mag;
  const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toFixed(10));
  return { ticks: out, step };
}

export function tickText(v: number, step: number): string {
  const d = Math.min(3, Math.max(0, Math.ceil(-Math.log10(step) - 1e-9)));
  return v.toFixed(d).replace('-', '−');
}

// ---- The sentence ---------------------------------------------------------------------------------

/** Plain names for use inside a sentence. */
const NOUN: Record<string, string> = {
  tempMean: 'mean temperature',
  tempRange: 'day-night temperature range',
  precip: 'precipitation',
  ndvi: 'vegetation (NDVI)',
  slope: 'mean slope',
  roughness: 'roughness',
  lithology: 'rock class',
};
export const noun = (key: FactorKey, meta: MetaByKey) => NOUN[key] ?? keyLabel(key, meta).toLowerCase();

/** A share as text: whole numbers, one decimal near the ends. */
function shareText(x: number): string {
  if (x > 99.9) return 'more than 99.9%';
  if (x >= 99.5 || x < 10) return `${x.toFixed(1)}%`;
  return `${Math.round(x)}%`;
}

/** Where a value sits among Earth's cells, as the end of a sentence. Computed from the cells. */
export function positionPhrase(s: KeyStats, v: number, meta: MetaByKey): string {
  if (s.categorical) {
    const share = (100 * (s.counts.get(v) ?? 0)) / s.n;
    return `${formatValue(s.key, v, meta)}, a class shared by ${shareText(share)} of Earth's cells`;
  }
  if (v < s.min) return `below every Earth cell (the lowest is ${formatValue(s.key, s.min, meta)})`;
  if (v > s.max) return `above every Earth cell (the highest is ${formatValue(s.key, s.max, meta)})`;
  if (v === s.min) return `equal to the lowest value of any Earth cell`;
  if (v === s.max) return `equal to the highest value of any Earth cell`;
  const p = percentileOf(s, v);
  const d = Math.abs(p - 50);
  for (const band of [20, 40, 60, 80]) if (d <= band / 2) return `within the middle ${band}% of Earth's cells`;
  return p < 50 ? `below ${shareText(100 - p)} of Earth's cells` : `above ${shareText(p)} of Earth's cells`;
}

/** The one sentence under the chart. */
export function pairSentence(earth: EarthFile, target: Target, xKey: FactorKey, yKey: FactorKey, meta: MetaByKey): string {
  const name = shortName(target.name);
  const parts = [xKey, yKey].map((k) => {
    const v = target.values[k]?.value;
    return { k, v: v === null || v === undefined || !Number.isFinite(v) ? null : v };
  });
  const [a, b] = parts;
  if (a.v === null && b.v === null)
    return `${name} has no value for ${noun(a.k, meta)} or ${noun(b.k, meta)}, so it cannot be placed on this chart.`;
  if (a.v === null || b.v === null) {
    const has = a.v === null ? b : a;
    const lacks = a.v === null ? a : b;
    return `${name}'s ${noun(has.k, meta)} is ${positionPhrase(keyStats(earth, has.k), has.v as number, meta)}; its ${noun(lacks.k, meta)} has no value, so it cannot be placed on this pair.`;
  }
  return `${name}'s ${noun(a.k, meta)} is ${positionPhrase(keyStats(earth, a.k), a.v, meta)}; its ${noun(b.k, meta)} is ${positionPhrase(keyStats(earth, b.k), b.v, meta)}.`;
}
