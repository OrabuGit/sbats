import type { Range } from './types';

/**
 * Per-factor similarity of the Method page:
 *
 *     s = exp( -0.5 * ((x - t) / sigma)^2 )
 *
 * x is the Earth value, t the target value (already clamped to Earth's observed range),
 * sigma the tolerance. Returns 1 for a perfect match and falls towards 0 as the values diverge.
 */
export function gaussianSimilarity(x: number, t: number, sigma: number): number {
  return Math.exp(gaussianLogSimilarity(x, t, sigma));
}

/** Natural log of gaussianSimilarity. Used so that very poor matches do not underflow mid-calculation. */
export function gaussianLogSimilarity(x: number, t: number, sigma: number): number {
  if (!(sigma > 0)) {
    throw new RangeError(`sigma must be greater than 0, got ${String(sigma)}`);
  }
  const z = (x - t) / sigma;
  return -0.5 * z * z;
}

/** Clamps a target value to Earth's observed range. */
export function clampToRange(value: number, range: Range): number {
  if (value < range.min) return range.min;
  if (value > range.max) return range.max;
  return value;
}

/**
 * Overall score of the Method page: 100 times the weighted geometric mean of the similarities.
 *
 *     S = 100 * product over i of ( s_i ^ (w_i / sum of w) )
 *
 * Weights are renormalised over the entries given, so callers pass only the factors that are present.
 * A similarity of 0 with a positive weight gives a score of 0 (the veto).
 */
export function weightedGeometricMean(entries: readonly { similarity: number; weight: number }[]): number {
  let logSum = 0;
  let weightSum = 0;
  for (const e of entries) {
    if (!(e.weight > 0)) continue;
    if (!(e.similarity >= 0 && e.similarity <= 1)) {
      throw new RangeError(`similarity must be between 0 and 1, got ${String(e.similarity)}`);
    }
    logSum += e.weight * Math.log(e.similarity);
    weightSum += e.weight;
  }
  if (weightSum <= 0) {
    throw new RangeError('weightedGeometricMean needs at least one entry with a positive weight');
  }
  return 100 * Math.exp(logSum / weightSum);
}

export function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
