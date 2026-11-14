// ============================================================================================
// TEMPORARY STUB. NOT THE SCORING LIBRARY.
//
// The real scoring library is owned by Session C and lives in ./scoring. This file exists only
// so the ORBIT screen works before that library is complete. It exports the same functions with
// the same signatures as ./scoring:
//
//   PRESETS, PRESET_IDS
//   computeEarthRanges(cells)
//   prepareTarget(target, ranges, lithologyTable | null)
//   scoreCells(cells, preparedTarget, weights)   -> CellSummary[]
//   scoreCell(cell, preparedTarget, weights)     -> CellScore
//
// It follows data/SCHEMA.md and DESIGN.md section 6 as written, but it has no unit tests and is
// not the reference. The app never imports this file directly. It goes through
// ./scoringAdapter, which uses ./scoring/index.ts when that exists and this stub otherwise, and
// reports which is active so the status strip can show "SCORING: TEMPORARY STUB".
// Delete this file once ./scoring is in use.
// ============================================================================================

import {
  FACTOR_IDS,
  type CellScore,
  type CellSummary,
  type ClampGap,
  type EarthCell,
  type FactorBreakdown,
  type FactorId,
  type FactorKey,
  type KeyBreakdown,
  type KeyStatus,
  type LithologySimilarity,
  type PreparedTarget,
  type Preset,
  type ScoreKey,
  type SunKey,
  type Target,
  type Weights,
} from '../types';

const FACTORS: { id: FactorId; label: string; keys: ScoreKey[] }[] = [
  { id: 'terrain', label: 'Terrain', keys: ['slope', 'roughness'] },
  { id: 'bareGround', label: 'Bare ground', keys: ['ndvi'] },
  { id: 'dryness', label: 'Dryness', keys: ['precip'] },
  { id: 'temperature', label: 'Temperature', keys: ['tempMean', 'tempRange'] },
  { id: 'sunlight', label: 'Sunlight', keys: ['sunElevation', 'sunSeason'] },
  { id: 'rockType', label: 'Rock type', keys: ['lithology'] },
];

const KEY_INFO: Record<ScoreKey, { label: string; unit: string }> = {
  tempMean: { label: 'Mean temperature', unit: '°C' },
  tempRange: { label: 'Day-night swing', unit: '°C' },
  precip: { label: 'Precipitation', unit: 'mm/year' },
  ndvi: { label: 'Vegetation (NDVI)', unit: '' },
  slope: { label: 'Slope', unit: '°' },
  roughness: { label: 'Roughness', unit: 'm' },
  lithology: { label: 'Rock class', unit: '' },
  sunElevation: { label: 'Noon Sun elevation', unit: '°' },
  sunSeason: { label: 'Seasonal Sun swing', unit: '°' },
};

// Base is the table in DESIGN.md section 6. The other three follow the direction given there.
export const PRESETS: Record<string, Preset> = {
  base: {
    id: 'base',
    label: 'Base',
    description: 'Balanced weights for a crewed surface base.',
    weights: { terrain: 0.25, bareGround: 0.2, dryness: 0.15, temperature: 0.15, sunlight: 0.1, rockType: 0.15 },
  },
  rover: {
    id: 'rover',
    label: 'Rover',
    description: 'Mobility tests. Raises Terrain.',
    weights: { terrain: 0.4, bareGround: 0.2, dryness: 0.1, temperature: 0.1, sunlight: 0.1, rockType: 0.1 },
  },
  ice: {
    id: 'ice',
    label: 'Ice',
    description: 'Ice prospecting and cold operations. Raises Temperature and Rock type.',
    weights: { terrain: 0.15, bareGround: 0.15, dryness: 0.1, temperature: 0.3, sunlight: 0.05, rockType: 0.25 },
  },
  astrobiology: {
    id: 'astrobiology',
    label: 'Astrobiology',
    description: 'Habitability and biosignature studies. Raises Dryness and Rock type.',
    weights: { terrain: 0.1, bareGround: 0.15, dryness: 0.3, temperature: 0.1, sunlight: 0.05, rockType: 0.3 },
  },
};
export const PRESET_IDS = ['base', 'rover', 'ice', 'astrobiology'] as const;

const NUMERIC_KEYS = ['tempMean', 'tempRange', 'precip', 'ndvi', 'slope', 'roughness'] as const;
const SUN_KEYS = ['sunElevation', 'sunSeason'] as const;
type GaussianKey = (typeof NUMERIC_KEYS)[number] | SunKey;
type Range = { min: number; max: number };
type Ranges = Record<GaussianKey, Range | null>;

const REQUIRED: ScoreKey[] = ['ndvi', 'precip'];
const MIN_COVERAGE = 0.6;
const SUN_SIGMA = 15;
const TILT: Record<'earth' | 'moon' | 'mars', number> = { earth: 23.44, moon: 1.54, mars: 25.19 };

const sunCache = new Map<string, Record<SunKey, number>>();
/** Mean noon Sun elevation over a year and its seasonal swing, from latitude and axial tilt. */
function sun(body: 'earth' | 'moon' | 'mars', lat: number): Record<SunKey, number> {
  const id = `${body}:${lat}`;
  const hit = sunCache.get(id);
  if (hit) return hit;
  const d = Math.PI / 180;
  let sum = 0;
  let max = -Infinity;
  let min = Infinity;
  for (let i = 0; i < 360; i++) {
    const dec = Math.asin(Math.sin(TILT[body] * d) * Math.sin(i * d)) / d;
    const noon = Math.max(0, 90 - Math.abs(lat - dec));
    sum += noon;
    if (noon > max) max = noon;
    if (noon < min) min = noon;
  }
  const out = { sunElevation: sum / 360, sunSeason: max - min };
  sunCache.set(id, out);
  return out;
}

export function computeEarthRanges(cells: readonly EarthCell[]): Ranges {
  const ranges = {} as Ranges;
  const span = (get: (c: EarthCell) => number | null) => {
    let min = Infinity;
    let max = -Infinity;
    for (const c of cells) {
      const v = get(c);
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return min <= max ? { min, max } : null;
  };
  for (const k of NUMERIC_KEYS) ranges[k] = span((c) => c[k]);
  for (const k of SUN_KEYS) ranges[k] = span((c) => sun('earth', c.lat)[k]);
  return ranges;
}

interface StubPrepared extends PreparedTarget {
  gaussian: Record<GaussianKey, { value: number; clamped: number; sigma: number } | null>;
  lithology: { code: number; table: LithologySimilarity } | null;
}

export function prepareTarget(target: Target, ranges: Ranges, table: LithologySimilarity | null): StubPrepared {
  const gaussian = {} as StubPrepared['gaussian'];
  const missingTargetKeys: string[] = [];
  const gaps: ClampGap[] = [];
  const warnings: string[] = [];
  const add = (key: GaussianKey, value: number, sigma: number) => {
    const r = ranges[key];
    const clamped = r ? Math.min(r.max, Math.max(r.min, value)) : value;
    gaussian[key] = { value, clamped, sigma };
    if (r && clamped !== value)
      gaps.push({ key, label: KEY_INFO[key].label, unit: KEY_INFO[key].unit, targetValue: value, clampedValue: clamped, gap: value - clamped, earthRange: r });
  };
  for (const key of NUMERIC_KEYS) {
    const tv = target.values[key];
    if (!tv || typeof tv.value !== 'number' || typeof tv.sigma !== 'number' || tv.sigma <= 0) {
      gaussian[key] = null;
      missingTargetKeys.push(key);
    } else add(key, tv.value, tv.sigma);
  }
  const s = sun(target.body, target.lat);
  for (const key of SUN_KEYS) add(key, s[key], SUN_SIGMA);
  let lithology: StubPrepared['lithology'] = null;
  const lv = target.values.lithology;
  if (!lv || typeof lv.value !== 'number') missingTargetKeys.push('lithology');
  else if (!table) {
    missingTargetKeys.push('lithology');
    warnings.push(`${target.id}: no lithology similarity table, so Rock type is treated as missing`);
  } else lithology = { code: lv.value, table };
  return { target, gaussian, lithology, missingTargetKeys, gaps, warnings };
}

function normalise(weights: Weights): Weights {
  const total = FACTOR_IDS.reduce((a, id) => a + weights[id], 0);
  if (!(total > 0)) throw new RangeError('At least one weight must be greater than zero');
  const out = {} as Weights;
  for (const id of FACTOR_IDS) out[id] = weights[id] / total;
  return out;
}

function evaluate(key: ScoreKey, cell: EarthCell, pt: StubPrepared): { earthValue: number | null; similarity: number | null; status: Exclude<KeyStatus, 'zero-weight'> } {
  if (key === 'lithology') {
    const v = cell.lithology;
    if (!pt.lithology) return { earthValue: v, similarity: null, status: 'missing-target' };
    if (typeof v !== 'number') return { earthValue: null, similarity: null, status: 'missing-earth' };
    const { code, table } = pt.lithology;
    if (v === code) return { earthValue: v, similarity: table.levels.same, status: 'scored' };
    const lo = Math.min(v, code);
    const hi = Math.max(v, code);
    const pair = table.pairs.find((p) => p.a === lo && p.b === hi);
    if (!pair) throw new Error(`Rock classes ${v} and ${code} have no entry in lithology_similarity.json`);
    return { earthValue: v, similarity: table.levels[pair.relation], status: 'scored' };
  }
  const earthValue = key === 'sunElevation' || key === 'sunSeason' ? sun('earth', cell.lat)[key] : cell[key];
  const t = pt.gaussian[key];
  if (!t) return { earthValue: earthValue ?? null, similarity: null, status: 'missing-target' };
  if (typeof earthValue !== 'number') return { earthValue: null, similarity: null, status: 'missing-earth' };
  return { earthValue, similarity: Math.exp(-0.5 * ((earthValue - t.clamped) / t.sigma) ** 2), status: 'scored' };
}

export function scoreCell(cell: EarthCell, target: PreparedTarget, weights: Weights): CellScore {
  const pt = target as StubPrepared;
  const nw = normalise(weights);
  let present = 0;
  let logSum = 0;
  let requiredMissing = false;
  const missing: string[] = [];
  const breakdown: FactorBreakdown[] = [];
  let limitingFactor: FactorId | null = null;
  let worst = -1e-12;

  for (const f of FACTORS) {
    const kw = nw[f.id] / f.keys.length;
    const keys: KeyBreakdown[] = [];
    let covered = 0;
    let wLog = 0;
    let shownLog = 0;
    let shown = 0;
    for (const key of f.keys) {
      const e = evaluate(key, cell, pt);
      const g = key === 'lithology' ? null : pt.gaussian[key];
      const targetValue = key === 'lithology' ? (pt.lithology?.code ?? null) : (g?.value ?? null);
      let status: KeyStatus = e.status;
      if (e.status !== 'scored') {
        const required = REQUIRED.includes(key);
        if (required) requiredMissing = true;
        if (kw > 0 || required) missing.push(key);
      } else {
        const log = Math.log(Math.max(e.similarity as number, 1e-300));
        shownLog += log;
        shown++;
        if (kw > 0) {
          covered += kw;
          wLog += kw * log;
        } else status = 'zero-weight';
      }
      keys.push({
        key,
        label: KEY_INFO[key].label,
        unit: KEY_INFO[key].unit,
        earthValue: e.earthValue,
        targetValue,
        targetClamped: key === 'lithology' ? targetValue : (g?.clamped ?? null),
        sigma: g?.sigma ?? null,
        similarity: e.similarity,
        weight: kw,
        status,
      });
    }
    present += covered;
    logSum += wLog;
    breakdown.push({ factor: f.id, label: f.label, weight: nw[f.id], coveredWeight: covered, effectiveWeight: 0, similarity: shown > 0 ? Math.exp(shownLog / shown) : null, keys });
    if (covered > 0 && wLog < worst) {
      worst = wLog;
      limitingFactor = f.id;
    }
  }
  for (const b of breakdown) b.effectiveWeight = present > 0 ? b.coveredWeight / present : 0;

  const coverage = Math.min(1, Math.round(present * 1e9) / 1e9);
  const unscoredReason = requiredMissing ? 'required-factor-missing' : coverage < MIN_COVERAGE ? 'coverage-too-low' : null;
  if (unscoredReason) {
    const reason =
      unscoredReason === 'required-factor-missing'
        ? 'No score: vegetation or precipitation data is missing, and both are required.'
        : `No score: the factors with data cover ${(coverage * 100).toFixed(0)}% of the weight, below the 60% minimum.`;
    return { score: null, coverage, missing, confidence: null, unscoredReason, breakdown, limitingFactor: null, reason };
  }
  const score = 100 * Math.exp(logSum / present);
  const confidence = coverage >= 1 ? 'high' : coverage >= 0.8 ? 'medium' : 'low';
  const scored = breakdown.filter((b) => b.coveredWeight > 0 && b.similarity !== null);
  const best = [...scored].sort((a, b) => (b.similarity as number) - (a.similarity as number))[0];
  const limit = breakdown.find((b) => b.factor === limitingFactor);
  let reason = best ? `Closest to ${pt.target.name} on ${best.label.toLowerCase()}` : `Scored against ${pt.target.name}`;
  reason += limit && limit !== best ? `, held back most by ${limit.label.toLowerCase()}.` : '.';
  return { score, coverage, missing, confidence, unscoredReason: null, breakdown, limitingFactor, reason };
}

export function scoreCellSummary(cell: EarthCell, target: PreparedTarget, weights: Weights): CellSummary {
  const { score, coverage, missing, confidence, unscoredReason } = scoreCell(cell, target, weights);
  return { score, coverage, missing, confidence, unscoredReason };
}

export function scoreCells(cells: readonly EarthCell[], target: PreparedTarget, weights: Weights): CellSummary[] {
  return cells.map((c) => scoreCellSummary(c, target, weights));
}

export type { FactorKey };
