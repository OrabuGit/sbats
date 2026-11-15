// "Best month to test": the calendar month whose climate is closest to the target.
//
// Rule (see the Method page): the same Gaussian comparison as the match score, applied to the
// monthly normals of the three climate keys, with the Base preset's Dryness and Temperature weights.
// Monthly precipitation is scaled to a yearly rate so it can be compared with the target's mm/year.
// Nothing else enters, and this never changes a match score.
import type { CellScore } from '../types';
import { PRESETS } from './scoringAdapter';

export interface MonthNormals {
  month: number;
  tempMean: number | null;
  tempRange: number | null;
  precip: number | null;
  solar: number | null;
}

export interface MonthMatch extends MonthNormals {
  /** Precipitation as a yearly rate, mm/year. */
  precipYearly: number | null;
  /** 0 to 1: weighted geometric mean of the climate similarities for this month. null when nothing could be compared. */
  match: number | null;
  /** Weighted squared distance in tolerances. Ranks months even when `match` rounds to 0. */
  distance: number | null;
}

export interface BestMonth {
  months: MonthMatch[];
  /** 1 to 12, or null when no month could be compared. */
  best: number | null;
  /** The climate keys that entered the comparison. */
  keys: ('precip' | 'tempMean' | 'tempRange')[];
}

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTH_SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));
const DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** `explained` supplies the target value (clamped to Earth's range) and tolerance of each climate key. */
export function bestMonth(months: MonthNormals[], explained: CellScore): BestMonth {
  const base = PRESETS[0].weights;
  const ref = new Map(explained.breakdown.flatMap((f) => f.keys).map((k) => [k.key as string, k]));
  const parts = (
    [
      { key: 'precip', weight: base.dryness },
      { key: 'tempMean', weight: base.temperature / 2 },
      { key: 'tempRange', weight: base.temperature / 2 },
    ] as const
  ).filter((p) => {
    const k = ref.get(p.key);
    return k && k.targetClamped !== null && k.sigma !== null && k.sigma > 0;
  });
  const out: MonthMatch[] = months.map((m) => {
    const precipYearly = m.precip === null ? null : (m.precip * 365.25) / DAYS[m.month - 1];
    let sum = 0;
    let weight = 0;
    for (const p of parts) {
      const v = p.key === 'precip' ? precipYearly : m[p.key];
      if (v === null) continue;
      const k = ref.get(p.key)!;
      const z = (v - (k.targetClamped as number)) / (k.sigma as number);
      sum += p.weight * z * z;
      weight += p.weight;
    }
    const distance = weight > 0 ? sum / weight : null;
    return { ...m, precipYearly, distance, match: distance === null ? null : Math.exp(-0.5 * distance) };
  });
  let best: number | null = null;
  let bestD = Infinity;
  for (const m of out)
    if (m.distance !== null && m.distance < bestD) {
      bestD = m.distance;
      best = m.month;
    }
  return { months: out, best, keys: parts.map((p) => p.key) };
}
