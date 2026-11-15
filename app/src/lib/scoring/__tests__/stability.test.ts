// Unit tests for rank stability. Run: npx tsx --test app/src/lib/scoring/__tests__/*.test.ts

import { deepEqual, equal, ok, throws } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PRESETS, PRESET_IDS } from '../presets';
import { prepareTarget, scoreCells } from '../score';
import { STABILITY_DRAWS, STABILITY_SEED, STABILITY_SPREAD, perturbWeights, rankStability, scoresFromBasis, seededRandom, stabilityBasis } from '../stability';
import { FACTOR_IDS } from '../types';
import type { EarthCell, Weights } from '../types';
import { BASE, TABLE, WIDE_RANGES, makeTarget } from './fixtures';

/** A varied, deterministic set of cells: every kind of gap the score has a rule for. */
function world(n: number): EarthCell[] {
  const r = seededRandom(7);
  const pick = <T>(xs: T[]): T => xs[Math.floor(r() * xs.length)] as T;
  const cells: EarthCell[] = [];
  for (let i = 0; i < n; i += 1) {
    const gap = r();
    cells.push({
      lat: -80 + 160 * r(),
      lon: -180 + 360 * r(),
      tempMean: gap < 0.05 ? null : -30 + 60 * r(),
      tempRange: gap > 0.05 && gap < 0.1 ? null : 2 + 28 * r(),
      precip: gap > 0.1 && gap < 0.13 ? null : 3000 * r() ** 3,
      ndvi: gap > 0.13 && gap < 0.2 ? null : r() ** 2,
      slope: gap > 0.2 && gap < 0.25 ? null : 20 * r() ** 2,
      roughness: gap > 0.22 && gap < 0.3 ? null : 800 * r() ** 2,
      lithology: gap > 0.3 && gap < 0.4 ? null : pick([1, 2, 3]),
      snowIceFrac: r() < 0.1 ? r() : 0,
      barrenFrac: gap > 0.15 && gap < 0.18 ? null : r(),
    });
  }
  return cells;
}

const CELLS = world(600);
const prepared = prepareTarget(makeTarget(), WIDE_RANGES, TABLE);
const basis = stabilityBasis(CELLS, prepared);

describe('scoresFromBasis reproduces the frozen score exactly', () => {
  for (const id of PRESET_IDS) {
    it(`matches scoreCells cell by cell with the ${id} weights`, () => {
      const fast = scoresFromBasis(basis, PRESETS[id].weights);
      const slow = scoreCells(CELLS, prepared, PRESETS[id].weights);
      let scored = 0;
      for (let i = 0; i < CELLS.length; i += 1) {
        const s = slow[i]?.score ?? null;
        if (s === null) ok(Number.isNaN(fast[i] as number), `cell ${i} must have no score`);
        else {
          scored += 1;
          ok(Math.abs((fast[i] as number) - s) < 1e-9, `cell ${i}: ${fast[i]} against ${s}`);
        }
      }
      ok(scored > 300 && scored < 600, `the fixture must hold scored and unscored cells, got ${scored}`);
    });
  }

  it('matches with a zero weight, a missing target value and no rock table', () => {
    const odd: Weights = { ...BASE, rockType: 0, sunlight: 0.3 };
    const p2 = prepareTarget(makeTarget({ tempRange: { value: null, sigma: null, source: null, badge: null } }), WIDE_RANGES, null);
    const b2 = stabilityBasis(CELLS, p2);
    const fast = scoresFromBasis(b2, odd);
    const slow = scoreCells(CELLS, p2, odd);
    for (let i = 0; i < CELLS.length; i += 1) {
      const s = slow[i]?.score ?? null;
      if (s === null) ok(Number.isNaN(fast[i] as number), `cell ${i}`);
      else ok(Math.abs((fast[i] as number) - s) < 1e-9, `cell ${i}`);
    }
  });
});

describe('Redrawing the weights', () => {
  it('is repeatable for a seed and different for another', () => {
    const a = seededRandom(1);
    const b = seededRandom(1);
    const c = seededRandom(2);
    const xs = [a(), a(), a()];
    deepEqual(xs, [b(), b(), b()]);
    ok(xs[0] !== c());
    for (const x of xs) ok(x >= 0 && x < 1);
  });

  it('keeps every weight within the spread and the sum at 1, and leaves the preset untouched', () => {
    const before = JSON.stringify(PRESETS.base.weights);
    const random = seededRandom(3);
    for (let d = 0; d < 50; d += 1) {
      const w = perturbWeights(PRESETS.base.weights, random, 0.25);
      const sum = FACTOR_IDS.reduce((s, id) => s + w[id], 0);
      ok(Math.abs(sum - 1) < 1e-12);
      for (const id of FACTOR_IDS) {
        // Before renormalising each weight moved by at most 25%; after it, by at most 1.25 / 0.75.
        ok(w[id] >= (PRESETS.base.weights[id] * 0.75) / 1.25 - 1e-12 && w[id] <= (PRESETS.base.weights[id] * 1.25) / 0.75 + 1e-12, id);
      }
    }
    equal(JSON.stringify(PRESETS.base.weights), before);
  });

  it('with no spread returns the weights themselves', () => {
    const w = perturbWeights(PRESETS.base.weights, seededRandom(1), 0);
    for (const id of FACTOR_IDS) ok(Math.abs(w[id] - PRESETS.base.weights[id]) < 1e-12);
  });
});

describe('rankStability', () => {
  const result = rankStability(basis, PRESETS.base.weights);

  it('uses 200 draws and a fixed seed by default, and gives the same answer every time', () => {
    equal(result.draws, 200);
    equal(STABILITY_DRAWS, 200);
    equal(result.seed, STABILITY_SEED);
    equal(result.spread, STABILITY_SPREAD);
    deepEqual(rankStability(basis, PRESETS.base.weights), result);
    ok(JSON.stringify(rankStability(basis, PRESETS.base.weights, { seed: 99 })) !== JSON.stringify(result));
  });

  it('follows the top ten by default, in rank order', () => {
    equal(result.followed.length, 10);
    deepEqual(result.followed.map((c) => c.baseRank), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const scores = scoresFromBasis(basis, PRESETS.base.weights);
    equal(result.followed[0]?.baseScore, scores[result.followed[0]?.index as number]);
  });

  it('reports best, median and worst rank in order, and shares between 0 and 1', () => {
    for (const c of result.followed) {
      ok(c.bestRank !== null && c.medianRank !== null && c.worstRank !== null && c.rankP05 !== null && c.rankP95 !== null);
      ok(c.bestRank <= c.rankP05 && c.rankP05 <= c.medianRank && c.medianRank <= c.rankP95 && c.rankP95 <= c.worstRank, JSON.stringify(c));
      ok(c.shareInTopN >= 0 && c.shareInTopN <= 1 && c.shareScored > 0 && c.shareScored <= 1);
    }
    ok(result.meanTopNOverlap > 0 && result.meanTopNOverlap <= 1);
    ok(result.minTopNOverlap <= result.meanTopNOverlap);
    ok(result.summary.includes('200 redraws') && result.summary.includes('25%'));
  });

  it('never moves a rank when the spread is zero', () => {
    const still = rankStability(basis, PRESETS.base.weights, { spread: 0, draws: 20 });
    equal(still.meanTopNOverlap, 1);
    for (const c of still.followed) {
      equal(c.bestRank, c.baseRank);
      equal(c.worstRank, c.baseRank);
      equal(c.shareInTopN, 1);
    }
  });

  it('keeps a cell that wins on every factor at rank 1 whatever the weights', () => {
    const t = makeTarget();
    const perfect: EarthCell = { lat: 20, lon: 0, tempMean: 10, tempRange: 20, precip: 0, ndvi: 0.05, slope: 5, roughness: 100, lithology: 1, snowIceFrac: 0, barrenFrac: 1 };
    const cells = [...CELLS, perfect];
    const r = rankStability(stabilityBasis(cells, prepareTarget(t, WIDE_RANGES, TABLE)), PRESETS.base.weights, { follow: [cells.length - 1] });
    equal(r.followed[0]?.baseRank, 1);
    equal(r.followed[0]?.worstRank, 1);
    equal(r.followed[0]?.shareInTopN, 1);
  });

  it('can follow any cells, including one with no score', () => {
    const unscored = CELLS.findIndex((c) => c.precip === null);
    ok(unscored >= 0);
    const r = rankStability(basis, PRESETS.base.weights, { follow: [unscored, 0], draws: 10, topN: 5 });
    equal(r.followed[0]?.baseScore, null);
    equal(r.followed[0]?.baseRank, null);
    equal(r.followed[0]?.medianRank, null);
    equal(r.followed[0]?.shareScored, 0);
    equal(r.topN, 5);
  });

  it('rejects settings that make no sense', () => {
    throws(() => rankStability(basis, PRESETS.base.weights, { draws: 0 }), RangeError);
    throws(() => rankStability(basis, PRESETS.base.weights, { spread: 1 }), RangeError);
    throws(() => rankStability(basis, PRESETS.base.weights, { follow: [CELLS.length] }), RangeError);
  });

  it('says so when nothing has a score', () => {
    const empty = rankStability(stabilityBasis([{ lat: 0, lon: 0, tempMean: null, tempRange: null, precip: null, ndvi: null, slope: null, roughness: null, lithology: null }], prepared), PRESETS.base.weights, { draws: 5 });
    equal(empty.scoredCells, 0);
    ok(empty.summary.startsWith('No cell has a score'));
  });
});
