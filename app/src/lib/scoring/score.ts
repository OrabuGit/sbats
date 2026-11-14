import { buildReason } from './explain';
import { COVERAGE_DECIMALS, FACTORS, KEY_INFO, MEDIUM_CONFIDENCE_COVERAGE, MIN_COVERAGE, REQUIRED_KEYS } from './factors';
import { buildLithologyLookup, LithologyPairError } from './lithology';
import { normaliseWeights } from './presets';
import { clampToRange, gaussianLogSimilarity, isNumber } from './similarity';
import { SUN_ELEVATION_SIGMA_DEG, sunElevation } from './sunlight';
import { NUMERIC_KEYS } from './types';
import type {
  BareGroundSource,
  CellScore,
  CellSummary,
  ClampGap,
  Confidence,
  EarthCell,
  EarthRanges,
  FactorBreakdown,
  FactorId,
  FactorKey,
  GaussianKey,
  KeyBreakdown,
  KeyStatus,
  LithologyTable,
  PreparedGaussian,
  PreparedTarget,
  Range,
  ScoreKey,
  Target,
  TargetValue,
  UnscoredReason,
  Weights,
} from './types';

const REQUIRED = new Set<ScoreKey>(REQUIRED_KEYS);
const COVERAGE_SCALE = 10 ** COVERAGE_DECIMALS;

/**
 * Earth's observed range for every Gaussian key, taken from the cells themselves.
 * Target values are clamped to these ranges before scoring.
 */
export function computeEarthRanges(cells: readonly EarthCell[]): EarthRanges {
  const ranges = {} as Record<GaussianKey, Range | null>;
  for (const key of NUMERIC_KEYS) {
    let min = Infinity;
    let max = -Infinity;
    for (const cell of cells) {
      const v = cell[key];
      if (!isNumber(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    ranges[key] = min <= max ? { min, max } : null;
  }
  let sunMin = Infinity;
  let sunMax = -Infinity;
  for (const cell of cells) {
    const v = sunElevation('earth', cell.lat);
    if (v < sunMin) sunMin = v;
    if (v > sunMax) sunMax = v;
  }
  ranges.sunElevation = sunMin <= sunMax ? { min: sunMin, max: sunMax } : null;
  return ranges;
}

/** Options for prepareTarget. The app never passes any: they exist for the validation tools. */
export interface PrepareOptions {
  /** Overrides the Sunlight tolerance (SUN_ELEVATION_SIGMA_DEG). Used only by the one-off tuning script. */
  sunElevationSigmaDeg?: number;
}

/**
 * Makes a target ready for scoring.
 *
 * - Clamps each target value to Earth's observed range and records the gap for "what Earth cannot copy".
 *   The value stored in targets.json stays unclamped.
 * - Computes the target's Sunlight quantity from its body and latitude.
 * - Builds the rock-class lookup from the similarity table.
 * - A null target value (or a value with no usable sigma) makes that key missing for every cell.
 *   It never throws for missing data.
 *
 * Pass `null` for the table while data/lithology_similarity.json does not exist: Rock type is then
 * left out for every cell under the missing-factor rule and a warning is recorded.
 * Call once per target and reuse the result.
 */
export function prepareTarget(
  target: Target,
  ranges: EarthRanges,
  lithologyTable: LithologyTable | null,
  options: PrepareOptions = {},
): PreparedTarget {
  const gaussian = {} as Record<GaussianKey, PreparedGaussian | null>;
  const missingTargetKeys: FactorKey[] = [];
  const gaps: ClampGap[] = [];
  const warnings: string[] = [];

  const addGaussian = (key: GaussianKey, value: number, sigma: number): void => {
    const range = ranges[key];
    const clamped = range ? clampToRange(value, range) : value;
    gaussian[key] = { value, clamped, sigma };
    if (range && clamped !== value) {
      gaps.push({
        key,
        label: KEY_INFO[key].label,
        unit: KEY_INFO[key].unit,
        targetValue: value,
        clampedValue: clamped,
        gap: value - clamped,
        earthRange: range,
      });
    }
  };

  // The file may be hand-edited, so a missing entry is treated like a null value.
  const values = target.values as Partial<Record<FactorKey, TargetValue>>;

  for (const key of NUMERIC_KEYS) {
    const tv = values[key];
    if (!tv || !isNumber(tv.value)) {
      gaussian[key] = null;
      missingTargetKeys.push(key);
      continue;
    }
    if (!isNumber(tv.sigma) || tv.sigma <= 0) {
      gaussian[key] = null;
      missingTargetKeys.push(key);
      warnings.push(`${target.id}: "${key}" has a value but no sigma greater than 0, so it is treated as missing`);
      continue;
    }
    addGaussian(key, tv.value, tv.sigma);
  }

  const sunSigma = options.sunElevationSigmaDeg ?? SUN_ELEVATION_SIGMA_DEG;
  if (!(sunSigma > 0)) throw new RangeError(`sunElevationSigmaDeg must be greater than 0, got ${String(sunSigma)}`);
  addGaussian('sunElevation', sunElevation(target.body, target.lat), sunSigma);

  let lithology: PreparedTarget['lithology'] = null;
  const lv = values.lithology;
  if (!lv || !isNumber(lv.value)) {
    missingTargetKeys.push('lithology');
  } else if (!lithologyTable) {
    missingTargetKeys.push('lithology');
    warnings.push(`${target.id}: no lithology similarity table was given, so Rock type is treated as missing`);
  } else {
    lithology = {
      code: lv.value,
      similarityByCode: buildLithologyLookup(lv.value, lithologyTable),
      levels: { ...lithologyTable.levels },
    };
  }

  return { target, gaussian, lithology, missingTargetKeys, gaps, warnings };
}

// One reusable record for the result of evaluating a key. Scoring a 0.5 degree grid evaluates
// several hundred thousand keys per pass, so the hot path avoids allocating one object per key.
const out: {
  earthValue: number | null;
  logSim: number;
  status: 'scored' | 'missing-earth' | 'missing-target';
  bareGroundSource: BareGroundSource | null;
} = {
  earthValue: null,
  logSim: 0,
  status: 'scored',
  bareGroundSource: null,
};

/** A land cover share as a number from 0 to 1, or null when the cell does not carry it. */
function share(v: number | null | undefined): number | null {
  if (!isNumber(v)) return null;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Bare ground (data/SCHEMA.md, "Bare ground and permanent ice"). One rule for every cell:
 * the similarity is the share of the cell's ground that is exposed and ice-free.
 *
 * - `ndvi` present:  s = gaussian(ndvi, target, sigma) * (1 - snowIceFrac). A null snowIceFrac counts as 0.
 * - `ndvi` null:     s = barrenFrac, used directly. No Gaussian. It is not multiplied by (1 - snowIceFrac)
 *                    again, because barrenFrac is already the ice-free bare share.
 * - both null:       Bare ground is missing, and since it is required the cell has no score.
 *
 * A cell that is all permanent ice gets a similarity of 0 either way, so its score is 0: scored, not "no data".
 * A target with no ndvi value makes Bare ground missing for every cell, like any other null target value.
 */
function evaluateBareGround(cell: EarthCell, pt: PreparedTarget): void {
  const v = cell.ndvi;
  out.earthValue = isNumber(v) ? v : null;
  out.bareGroundSource = null;
  const t = pt.gaussian.ndvi;
  if (!t) {
    out.status = 'missing-target';
    return;
  }
  if (out.earthValue !== null) {
    const iceFree = 1 - (share(cell.snowIceFrac) ?? 0);
    out.logSim = gaussianLogSimilarity(out.earthValue, t.clamped, t.sigma) + Math.log(iceFree);
    out.status = 'scored';
    out.bareGroundSource = 'ndvi';
    return;
  }
  const barren = share(cell.barrenFrac);
  if (barren === null) {
    out.status = 'missing-earth';
    return;
  }
  out.logSim = Math.log(barren);
  out.status = 'scored';
  out.bareGroundSource = 'landCover';
}

function evaluateKey(key: ScoreKey, cell: EarthCell, pt: PreparedTarget): void {
  if (key === 'lithology') {
    const v = cell.lithology;
    out.earthValue = isNumber(v) ? v : null;
    if (!pt.lithology) {
      out.status = 'missing-target';
    } else if (out.earthValue === null) {
      out.status = 'missing-earth';
    } else {
      const sim = pt.lithology.similarityByCode.get(out.earthValue);
      if (sim === undefined) throw new LithologyPairError(out.earthValue, pt.lithology.code);
      out.logSim = Math.log(sim);
      out.status = 'scored';
    }
    return;
  }

  if (key === 'ndvi') {
    evaluateBareGround(cell, pt);
    return;
  }

  if (key === 'sunElevation') {
    out.earthValue = sunElevation('earth', cell.lat);
  } else {
    const v = cell[key];
    out.earthValue = isNumber(v) ? v : null;
  }
  const t = pt.gaussian[key];
  if (!t) {
    out.status = 'missing-target';
  } else if (out.earthValue === null) {
    out.status = 'missing-earth';
  } else {
    out.logSim = gaussianLogSimilarity(out.earthValue, t.clamped, t.sigma);
    out.status = 'scored';
  }
}

type KeySink = (
  factor: FactorId,
  key: ScoreKey,
  keyWeight: number,
  earthValue: number | null,
  logSim: number,
  status: KeyStatus,
) => void;

interface Core extends CellSummary {
  /** Sum of the weights that had data, before rounding. */
  presentWeight: number;
}

/**
 * The scoring rule, in one place. `nw` must already be normalised to sum to 1.
 *
 * Each factor's weight is split equally over its keys, so a two-key factor with one key missing
 * keeps half its weight. Bare ground follows its own rule (see evaluateBareGround). The present keys
 * enter a weighted geometric mean, renormalised over the weight that is present:
 *
 *     score = 100 * exp( sum(w_k * ln s_k) / sum(w_k) )      over the present keys k
 */
function core(cell: EarthCell, pt: PreparedTarget, nw: Weights, sink?: KeySink): Core {
  let presentWeight = 0;
  let logSum = 0;
  let requiredMissing = false;
  let bareGroundSource: BareGroundSource | null = null;
  const missing: FactorKey[] = [];

  for (const factor of FACTORS) {
    const keyWeight = nw[factor.id] / factor.keys.length;
    for (const key of factor.keys) {
      evaluateKey(key, cell, pt);
      if (key === 'ndvi') bareGroundSource = out.bareGroundSource;
      if (out.status !== 'scored') {
        const required = REQUIRED.has(key);
        if (required) requiredMissing = true;
        // Sunlight is always present, so anything that reaches here is a data key.
        if (keyWeight > 0 || required) missing.push(key as FactorKey);
        sink?.(factor.id, key, keyWeight, out.earthValue, 0, out.status);
      } else if (keyWeight > 0) {
        presentWeight += keyWeight;
        logSum += keyWeight * out.logSim;
        sink?.(factor.id, key, keyWeight, out.earthValue, out.logSim, 'scored');
      } else {
        sink?.(factor.id, key, keyWeight, out.earthValue, out.logSim, 'zero-weight');
      }
    }
  }

  const coverage = Math.min(1, Math.round(presentWeight * COVERAGE_SCALE) / COVERAGE_SCALE);

  let unscoredReason: UnscoredReason | null = null;
  if (requiredMissing) unscoredReason = 'required-factor-missing';
  else if (coverage < MIN_COVERAGE) unscoredReason = 'coverage-too-low';

  if (unscoredReason) {
    return { score: null, coverage, missing, confidence: null, unscoredReason, bareGroundSource, presentWeight };
  }

  const score = 100 * Math.exp(logSum / presentWeight);
  const confidence: Confidence = coverage >= 1 ? 'high' : coverage >= MEDIUM_CONFIDENCE_COVERAGE ? 'medium' : 'low';
  return { score, coverage, missing, confidence, unscoredReason: null, bareGroundSource, presentWeight };
}

/**
 * Similarity of each scoring factor for one cell, with no weights, no veto and no limits applied.
 * `similarity` is the geometric mean of the factor's keys that have data, or null when none has.
 * `present` is the share of the factor's keys that have data (0, 0.5 or 1).
 * These are the same per-factor similarities that enter the score. The analog profile is built from them.
 */
export function factorSimilarities(
  cell: EarthCell,
  target: PreparedTarget,
): Record<FactorId, { similarity: number | null; present: number }> {
  const result = {} as Record<FactorId, { similarity: number | null; present: number }>;
  for (const factor of FACTORS) {
    let logSum = 0;
    let count = 0;
    for (const key of factor.keys) {
      evaluateKey(key, cell, target);
      if (out.status !== 'scored') continue;
      logSum += out.logSim;
      count += 1;
    }
    result[factor.id] = { similarity: count > 0 ? Math.exp(logSum / count) : null, present: count / factor.keys.length };
  }
  return result;
}

function toSummary(c: Core): CellSummary {
  return {
    score: c.score,
    coverage: c.coverage,
    missing: c.missing,
    confidence: c.confidence,
    unscoredReason: c.unscoredReason,
    bareGroundSource: c.bareGroundSource,
  };
}

/**
 * Scores one cell and returns only the contract fields of data/SCHEMA.md
 * (score, coverage, missing, confidence, unscoredReason).
 */
export function scoreCellSummary(cell: EarthCell, target: PreparedTarget, weights: Weights): CellSummary {
  return toSummary(core(cell, target, normaliseWeights(weights)));
}

/** Scores every cell. The result has the same order and length as `cells`. Use for the heatmap. */
export function scoreCells(cells: readonly EarthCell[], target: PreparedTarget, weights: Weights): CellSummary[] {
  const nw = normaliseWeights(weights);
  const results: CellSummary[] = [];
  for (const cell of cells) {
    results.push(toSummary(core(cell, target, nw)));
  }
  return results;
}

/**
 * Scores one cell with the full detail for the dossier: per-factor breakdown, limiting factor
 * and a plain-language reason. Gives exactly the same score as scoreCells and scoreCellSummary.
 */
export function scoreCell(cell: EarthCell, target: PreparedTarget, weights: Weights): CellScore {
  const nw = normaliseWeights(weights);
  const keysByFactor = new Map<FactorId, KeyBreakdown[]>();
  const logByKey = new Map<ScoreKey, number>();

  const c = core(cell, target, nw, (factor, key, keyWeight, earthValue, logSim, status) => {
    const prepared = key === 'lithology' ? null : target.gaussian[key];
    const targetValue = key === 'lithology' ? (target.lithology?.code ?? null) : (prepared?.value ?? null);
    const targetClamped = key === 'lithology' ? targetValue : (prepared?.clamped ?? null);
    const hasSimilarity = status === 'scored' || status === 'zero-weight';
    if (hasSimilarity) logByKey.set(key, logSim);
    const entry: KeyBreakdown = {
      key,
      label: KEY_INFO[key].label,
      unit: KEY_INFO[key].unit,
      earthValue,
      targetValue,
      targetClamped,
      sigma: prepared?.sigma ?? null,
      similarity: hasSimilarity ? Math.exp(logSim) : null,
      weight: keyWeight,
      status,
    };
    if (key === 'ndvi' && out.bareGroundSource) {
      entry.bareGround = {
        source: out.bareGroundSource,
        snowIceFrac: isNumber(cell.snowIceFrac) ? cell.snowIceFrac : null,
        barrenFrac: isNumber(cell.barrenFrac) ? cell.barrenFrac : null,
      };
    }
    const list = keysByFactor.get(factor);
    if (list) list.push(entry);
    else keysByFactor.set(factor, [entry]);
  });

  const breakdown: FactorBreakdown[] = [];
  let limitingFactor: FactorId | null = null;
  let worstPenalty = -1e-12;

  for (const factor of FACTORS) {
    const keys = keysByFactor.get(factor.id) ?? [];
    let coveredWeight = 0;
    let weightedLog = 0;
    // Similarity shown for the factor: geometric mean of the keys that have a similarity.
    // Keys carry equal weight inside a factor, so this is the plain mean of their logs.
    let shownLog = 0;
    let shownCount = 0;
    for (const k of keys) {
      const log = logByKey.get(k.key);
      if (log === undefined) continue;
      shownLog += log;
      shownCount += 1;
      if (k.status === 'scored') {
        coveredWeight += k.weight;
        weightedLog += k.weight * log;
      }
    }
    breakdown.push({
      factor: factor.id,
      label: factor.label,
      weight: nw[factor.id],
      coveredWeight,
      effectiveWeight: c.presentWeight > 0 ? coveredWeight / c.presentWeight : 0,
      similarity: shownCount > 0 ? Math.exp(shownLog / shownCount) : null,
      keys,
    });
    // The limiting factor is the one with the largest weighted log penalty, that is, the one
    // that lowers the score the most.
    if (c.score !== null && coveredWeight > 0 && weightedLog < worstPenalty) {
      worstPenalty = weightedLog;
      limitingFactor = factor.id;
    }
  }

  const summary = toSummary(c);
  return {
    ...summary,
    breakdown,
    limitingFactor,
    reason: buildReason(summary, breakdown, limitingFactor, target),
  };
}

const EARTH_RADIUS_KM = 6371;

/**
 * Finds the cell whose centre is closest to a point (great-circle distance).
 * Used to snap an analogs.json site to its earth.json cell. Returns null for an empty list.
 */
export function nearestCell(
  cells: readonly EarthCell[],
  lat: number,
  lon: number,
): { index: number; cell: EarthCell; distanceKm: number } | null {
  const rad = Math.PI / 180;
  const cos1 = Math.cos(lat * rad);
  let best = -1;
  let bestCell: EarthCell | null = null;
  let bestH = Infinity;
  let i = 0;
  for (const cell of cells) {
    const sp = Math.sin(((cell.lat - lat) * rad) / 2);
    const sl = Math.sin(((cell.lon - lon) * rad) / 2);
    const h = sp * sp + cos1 * Math.cos(cell.lat * rad) * sl * sl;
    if (h < bestH) {
      bestH = h;
      best = i;
      bestCell = cell;
    }
    i++;
  }
  if (!bestCell) return null;
  const distanceKm = 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(bestH)));
  return { index: best, cell: bestCell, distanceKm };
}
