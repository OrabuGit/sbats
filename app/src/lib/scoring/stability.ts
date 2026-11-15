// Rank stability: does a place keep its rank when the weights are nudged?
//
// A check on the frozen score, not a change to it. The preset weights are a judgement. If a place is
// in the top ten only for one exact set of weights, that rank means little. Here the weights are
// redrawn many times around the preset (each multiplied by a random factor, then renormalised), every
// cell is scored again with the frozen formula, and the spread of each place's rank is reported.
//
// Speed: the per-factor similarities do not depend on the weights, so they are computed once
// (stabilityBasis) and each draw is a weighted sum. scoresFromBasis reproduces scoreCells exactly:
// the unit tests compare the two cell by cell.

import { COVERAGE_DECIMALS, MIN_COVERAGE } from './factors';
import { normaliseWeights } from './presets';
import { factorSimilarities } from './score';
import { FACTOR_IDS } from './types';
import type { EarthCell, FactorId, PreparedTarget, Weights } from './types';

/** The seed and draw count the reports use, so that numbers can be reproduced. */
export const STABILITY_SEED = 20261115;
export const STABILITY_DRAWS = 200;
/** Each weight is multiplied by a factor drawn evenly from 1 - spread to 1 + spread. */
export const STABILITY_SPREAD = 0.25;

/** Per-factor log-similarity and data share for every cell, in FACTOR_IDS order. */
export interface StabilityBasis {
  cells: number;
  /** logSim[f][i]: natural log of factor f's similarity in cell i (0 where the factor has no data). */
  logSim: Float64Array[];
  /** present[f][i]: share of factor f's keys with data in cell i (0, 0.5 or 1). */
  present: Float32Array[];
}

/** Computes the weight-independent part of the score for every cell. */
export function stabilityBasis(cells: readonly EarthCell[], target: PreparedTarget): StabilityBasis {
  const logSim = FACTOR_IDS.map(() => new Float64Array(cells.length));
  const present = FACTOR_IDS.map(() => new Float32Array(cells.length));
  for (let i = 0; i < cells.length; i += 1) {
    const sims = factorSimilarities(cells[i] as EarthCell, target);
    for (let f = 0; f < FACTOR_IDS.length; f += 1) {
      const s = sims[FACTOR_IDS[f] as FactorId];
      (present[f] as Float32Array)[i] = s.present;
      (logSim[f] as Float64Array)[i] = s.similarity === null ? 0 : Math.log(s.similarity);
    }
  }
  return { cells: cells.length, logSim, present };
}

const BARE = FACTOR_IDS.indexOf('bareGround');
const DRY = FACTOR_IDS.indexOf('dryness');
const COVERAGE_SCALE = 10 ** COVERAGE_DECIMALS;

/**
 * Scores every cell from the basis with the given weights. Same rules as the score: Bare ground and
 * Dryness are required, the present weight must reach the minimum coverage, and the present factors
 * are renormalised. NaN marks a cell with no score.
 */
export function scoresFromBasis(basis: StabilityBasis, weights: Weights, into?: Float64Array): Float64Array {
  const nw = normaliseWeights(weights);
  const w = FACTOR_IDS.map((id) => nw[id]);
  const out = into ?? new Float64Array(basis.cells);
  for (let i = 0; i < basis.cells; i += 1) {
    if ((basis.present[BARE] as Float32Array)[i] === 0 || (basis.present[DRY] as Float32Array)[i] === 0) {
      out[i] = Number.NaN;
      continue;
    }
    let presentWeight = 0;
    let logSum = 0;
    for (let f = 0; f < w.length; f += 1) {
      const wf = w[f] as number;
      if (wf <= 0) continue;
      const p = (basis.present[f] as Float32Array)[i] as number;
      if (p === 0) continue;
      // A two-key factor with one key present carries half its weight; its log-similarity is that key's.
      presentWeight += wf * p;
      logSum += wf * p * ((basis.logSim[f] as Float64Array)[i] as number);
    }
    const coverage = Math.min(1, Math.round(presentWeight * COVERAGE_SCALE) / COVERAGE_SCALE);
    out[i] = coverage < MIN_COVERAGE || presentWeight <= 0 ? Number.NaN : 100 * Math.exp(logSum / presentWeight);
  }
  return out;
}

/** A small seeded random generator (mulberry32). Same seed, same sequence, on every machine. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One redraw of the weights: each multiplied by a factor in [1 - spread, 1 + spread], then normalised to sum to 1. */
export function perturbWeights(weights: Weights, random: () => number, spread: number = STABILITY_SPREAD): Weights {
  const out = {} as Record<FactorId, number>;
  for (const id of FACTOR_IDS) out[id] = weights[id] * (1 + spread * (2 * random() - 1));
  return normaliseWeights(out);
}

/** 1-based rank of a score among all scores: one plus the number of cells strictly above it. NaN scores rank nowhere. */
function rankOf(scores: Float64Array, value: number): number {
  let above = 0;
  for (let i = 0; i < scores.length; i += 1) if ((scores[i] as number) > value) above += 1;
  return above + 1;
}

export interface StabilityOptions {
  draws?: number;
  seed?: number;
  spread?: number;
  /** Size of the "top" list whose membership is tracked. Default 10. */
  topN?: number;
  /** Cell indices to follow. Default: the top N cells with the given weights. */
  follow?: readonly number[];
}

export interface CellStability {
  /** Index of the cell in the array given to stabilityBasis. */
  index: number;
  /** Score and rank with the unperturbed weights. null when the cell has no score. */
  baseScore: number | null;
  baseRank: number | null;
  /** Rank over the draws in which the cell had a score. */
  bestRank: number | null;
  medianRank: number | null;
  worstRank: number | null;
  /** 5th and 95th percentile of the rank: nine draws in ten fall between them. */
  rankP05: number | null;
  rankP95: number | null;
  /** Share of draws in which the cell was in the top N. */
  shareInTopN: number;
  /** Share of draws in which the cell had a score at all (coverage changes with the weights). */
  shareScored: number;
}

export interface StabilityResult {
  draws: number;
  seed: number;
  spread: number;
  topN: number;
  scoredCells: number;
  followed: CellStability[];
  /** Mean share of the base top N that is still in the top N after a redraw. 1 means the list never changes. */
  meanTopNOverlap: number;
  /** Lowest such share over all draws. */
  minTopNOverlap: number;
  /** One plain sentence. */
  summary: string;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(((sorted[lo] as number) + ((sorted[hi] as number) - (sorted[lo] as number)) * (pos - lo)) * 10) / 10;
}

/**
 * Redraws the weights `draws` times and reports how the ranks move. Deterministic for a given seed.
 * The frozen weights themselves are never changed: `weights` is read only.
 */
export function rankStability(basis: StabilityBasis, weights: Weights, options: StabilityOptions = {}): StabilityResult {
  const draws = options.draws ?? STABILITY_DRAWS;
  const seed = options.seed ?? STABILITY_SEED;
  const spread = options.spread ?? STABILITY_SPREAD;
  const topN = options.topN ?? 10;
  if (!(draws > 0) || !(spread >= 0 && spread < 1) || !(topN > 0)) throw new RangeError('draws and topN must be positive and spread between 0 and 1');

  const base = scoresFromBasis(basis, weights);
  const order: number[] = [];
  for (let i = 0; i < base.length; i += 1) if (!Number.isNaN(base[i] as number)) order.push(i);
  order.sort((a, b) => (base[b] as number) - (base[a] as number) || a - b);
  const baseTop = order.slice(0, topN);
  const follow = options.follow ? [...options.follow] : baseTop;
  for (const i of follow) if (!(i >= 0 && i < basis.cells)) throw new RangeError(`cell index ${i} is out of range`);

  const ranks: number[][] = follow.map(() => []);
  const inTop = follow.map(() => 0);
  const random = seededRandom(seed);
  const scores = new Float64Array(basis.cells);
  let overlapSum = 0;
  let overlapMin = 1;
  for (let d = 0; d < draws; d += 1) {
    scoresFromBasis(basis, perturbWeights(weights, random, spread), scores);
    for (let k = 0; k < follow.length; k += 1) {
      const s = scores[follow[k] as number] as number;
      if (Number.isNaN(s)) continue;
      const r = rankOf(scores, s);
      (ranks[k] as number[]).push(r);
      if (r <= topN) inTop[k] = (inTop[k] as number) + 1;
    }
    let kept = 0;
    for (const i of baseTop) {
      const s = scores[i] as number;
      if (!Number.isNaN(s) && rankOf(scores, s) <= topN) kept += 1;
    }
    const overlap = baseTop.length > 0 ? kept / baseTop.length : 1;
    overlapSum += overlap;
    overlapMin = Math.min(overlapMin, overlap);
  }

  const followed: CellStability[] = follow.map((index, k) => {
    const r = [...(ranks[k] as number[])].sort((a, b) => a - b);
    const b = base[index] as number;
    const has = r.length > 0;
    return {
      index,
      baseScore: Number.isNaN(b) ? null : b,
      baseRank: Number.isNaN(b) ? null : rankOf(base, b),
      bestRank: has ? (r[0] as number) : null,
      medianRank: has ? quantile(r, 0.5) : null,
      worstRank: has ? (r[r.length - 1] as number) : null,
      rankP05: has ? quantile(r, 0.05) : null,
      rankP95: has ? quantile(r, 0.95) : null,
      shareInTopN: (inTop[k] as number) / draws,
      shareScored: r.length / draws,
    };
  });

  const meanTopNOverlap = overlapSum / draws;
  const pct = Math.round(spread * 100);
  const summary =
    baseTop.length === 0
      ? 'No cell has a score, so there is no ranking to test.'
      : `With every weight moved by up to ${pct}% in ${draws} redraws, ${Math.round(meanTopNOverlap * 100)}% of the top ${baseTop.length} stayed in the top ${topN} on average (${Math.round(overlapMin * 100)}% in the worst redraw).`;
  return { draws, seed, spread, topN, scoredCells: order.length, followed, meanTopNOverlap, minTopNOverlap: overlapMin, summary };
}
