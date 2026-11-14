import { describe, it } from 'node:test';
import { deepEqual, equal, notEqual, ok, throws } from 'node:assert/strict';
import { FACTORS } from '../factors';
import { normaliseWeights, PRESET_IDS, PRESETS } from '../presets';
import { computeEarthRanges, nearestCell, prepareTarget, scoreCell, scoreCells, scoreCellSummary } from '../score';
import { FACTOR_IDS } from '../types';
import type { EarthCell, EarthRanges, Weights } from '../types';
import {
  BASE,
  makeCell,
  makeTarget,
  near,
  NULL_VALUE,
  productScore,
  sunSimilarity,
  TABLE,
  TARGET_LAT,
  WIDE_RANGES,
} from './fixtures';

const target = makeTarget();
const prepared = prepareTarget(target, WIDE_RANGES, TABLE);
const SUN = sunSimilarity(TARGET_LAT, target);
/** Base weights with Sunlight switched off, so that a cell equal to the target scores exactly 100. */
const NO_SUN: Weights = { ...BASE, sunlight: 0 };

describe('Overall score (DESIGN.md section 6)', () => {
  it('is 100 for a cell that equals the target on every factor', () => {
    const result = scoreCell(makeCell(), prepared, NO_SUN);
    ok(near(result.score, 100));
    equal(result.coverage, 1);
    equal(result.confidence, 'high');
    deepEqual(result.missing, []);
    equal(result.unscoredReason, null);
  });

  it('matches a hand calculation of 100 * product(s_i ^ w_i)', () => {
    // precip one sigma off (s = e^-0.5), slope two sigma off (s = e^-2). Slope is half of Terrain.
    const cell = makeCell({ precip: 250, slope: 15 });
    const expected = productScore([
      { s: Math.exp(-0.5), w: 0.15 }, // dryness
      { s: Math.exp(-2), w: 0.125 }, // slope: half of terrain 0.25
      { s: 1, w: 0.125 }, // roughness
      { s: 1, w: 0.2 }, // ndvi
      { s: 1, w: 0.15 }, // temperature
      { s: SUN, w: 0.1 },
      { s: 1, w: 0.15 }, // rock type
    ]);
    ok(near(scoreCell(cell, prepared, BASE).score, expected));
    // And as a closed form with Sunlight off: exp(-(0.5*0.15 + 2*0.125) / 0.9)
    ok(near(scoreCell(cell, prepared, NO_SUN).score, 100 * Math.exp(-(0.5 * 0.15 + 2 * 0.125) / 0.9)));
  });

  it('scores a two-key factor as the geometric mean of its two keys', () => {
    const result = scoreCell(makeCell({ tempMean: 20, tempRange: 40 }), prepared, BASE);
    const temperature = result.breakdown.find((f) => f.factor === 'temperature');
    ok(temperature);
    // tempMean is 1 sigma off, tempRange 2 sigma off
    ok(near(temperature.similarity, Math.sqrt(Math.exp(-0.5) * Math.exp(-2))));
  });

  it('gives the same score when all weights are scaled', () => {
    const cell = makeCell({ precip: 300, ndvi: 0.2 });
    const doubled = Object.fromEntries(FACTOR_IDS.map((id) => [id, BASE[id] * 2])) as Weights;
    ok(near(scoreCell(cell, prepared, doubled).score, scoreCell(cell, prepared, BASE).score ?? -1));
  });

  it('gives the same score from scoreCell, scoreCellSummary and scoreCells', () => {
    const cells = [makeCell(), makeCell({ precip: 900 }), makeCell({ ndvi: null }), makeCell({ lithology: null })];
    const all = scoreCells(cells, prepared, BASE);
    equal(all.length, cells.length);
    cells.forEach((cell, i) => {
      const full = scoreCell(cell, prepared, BASE);
      const summary = scoreCellSummary(cell, prepared, BASE);
      for (const other of [summary, all[i]]) {
        ok(other);
        equal(other.score, full.score);
        equal(other.coverage, full.coverage);
        equal(other.confidence, full.confidence);
        equal(other.unscoredReason, full.unscoredReason);
        deepEqual(other.missing, full.missing);
      }
    });
  });

  it('rejects negative, non-finite or all-zero weights', () => {
    throws(() => scoreCell(makeCell(), prepared, { ...BASE, terrain: -0.1 }), RangeError);
    throws(() => scoreCell(makeCell(), prepared, { ...BASE, terrain: Number.NaN }), RangeError);
    const zero = Object.fromEntries(FACTOR_IDS.map((id) => [id, 0])) as Weights;
    throws(() => scoreCell(makeCell(), prepared, zero), RangeError);
  });
});

describe('Veto behaviour', () => {
  it('drags a dense forest to near zero even when everything else is perfect', () => {
    const forest = scoreCell(makeCell({ ndvi: 0.85 }), prepared, NO_SUN);
    // z = (0.85 - 0.05) / 0.1 = 8, s = e^-32, share of weight 0.2 / 0.9
    ok(near(forest.score, 100 * Math.exp((-32 * 0.2) / 0.9)));
    ok((forest.score ?? 100) < 1);
    equal(forest.limitingFactor, 'bareGround');
  });

  it('drags a very wet cell to near zero', () => {
    const wet = scoreCell(makeCell({ precip: 3000 }), prepared, NO_SUN);
    ok((wet.score ?? 100) < 1);
    equal(wet.limitingFactor, 'dryness');
  });

  it('is much harsher than a weighted average would be', () => {
    const forest = scoreCell(makeCell({ ndvi: 0.85 }), prepared, NO_SUN);
    const average = 100 * forest.breakdown.reduce((sum, f) => sum + f.weight * (f.similarity ?? 0), 0);
    ok(average > 75);
    ok((forest.score ?? 100) < average / 50);
  });

  it('returns exactly 0, not an error, when a similarity underflows', () => {
    const result = scoreCell(makeCell({ precip: 1e9 }), prepared, BASE);
    equal(result.score, 0);
    equal(result.unscoredReason, null);
  });
});

describe('Mission presets', () => {
  it('lists Base, Rover, Ice and Astrobiology', () => {
    deepEqual([...PRESET_IDS], ['base', 'rover', 'ice', 'astrobiology']);
    for (const id of PRESET_IDS) equal(PRESETS[id].id, id);
  });

  it('uses the Base weights of the DESIGN.md table', () => {
    deepEqual(PRESETS.base.weights, { terrain: 0.25, bareGround: 0.2, dryness: 0.15, temperature: 0.15, sunlight: 0.1, rockType: 0.15 });
  });

  it('has non-negative weights that sum to 1 in every preset', () => {
    for (const id of PRESET_IDS) {
      const w = PRESETS[id].weights;
      let total = 0;
      for (const factor of FACTOR_IDS) {
        ok(w[factor] >= 0);
        total += w[factor];
      }
      ok(near(total, 1, 1e-12), `${id} sums to ${total}`);
    }
  });

  it('raises the factors DESIGN.md says each preset raises', () => {
    const { base, rover, ice, astrobiology } = PRESETS;
    ok(rover.weights.terrain > base.weights.terrain);
    ok(ice.weights.temperature > base.weights.temperature);
    ok(ice.weights.rockType > base.weights.rockType);
    ok(astrobiology.weights.dryness > base.weights.dryness);
    ok(astrobiology.weights.rockType > base.weights.rockType);
  });

  it('changes weights only: factor similarities are identical under every preset', () => {
    const cell = makeCell({ precip: 400, slope: 12, tempMean: 25, lithology: 2 });
    const reference = scoreCell(cell, prepared, PRESETS.base.weights);
    const scores = new Set<number>();
    for (const id of PRESET_IDS) {
      const result = scoreCell(cell, prepared, PRESETS[id].weights);
      result.breakdown.forEach((f, i) => {
        equal(f.similarity, reference.breakdown[i]?.similarity);
      });
      scores.add(result.score ?? -1);
    }
    equal(scores.size, PRESET_IDS.length);
  });

  it('normalises weights to sum to 1', () => {
    const n = normaliseWeights({ terrain: 2, bareGround: 2, dryness: 2, temperature: 2, sunlight: 1, rockType: 1 });
    equal(n.terrain, 0.2);
    equal(n.sunlight, 0.1);
  });
});

describe('Clamping the target to what Earth offers', () => {
  const ranges: EarthRanges = { ...WIDE_RANGES, tempMean: { min: -55, max: 30 }, tempRange: { min: 2, max: 25 } };
  const cold = makeTarget({
    tempMean: { value: -170, sigma: 15, source: 'fixture', badge: 'Mission' },
    tempRange: { value: 60, sigma: 10, source: 'fixture', badge: 'Mission' },
  });
  const pt = prepareTarget(cold, ranges, TABLE);

  it('keeps the stored value unclamped and records the clamped one', () => {
    equal(cold.values.tempMean.value, -170);
    equal(pt.gaussian.tempMean?.value, -170);
    equal(pt.gaussian.tempMean?.clamped, -55);
    equal(pt.gaussian.tempRange?.clamped, 25);
  });

  it('scores against the clamped value: the coldest Earth cell is a perfect temperature match', () => {
    const result = scoreCell(makeCell({ tempMean: -55, tempRange: 25 }), pt, BASE);
    const temperature = result.breakdown.find((f) => f.factor === 'temperature');
    ok(temperature);
    ok(near(temperature.similarity, 1));
    const key = temperature.keys.find((k) => k.key === 'tempMean');
    ok(key);
    equal(key.targetValue, -170);
    equal(key.targetClamped, -55);
  });

  it('measures the distance from the clamped value, not the real one', () => {
    const result = scoreCell(makeCell({ tempMean: -40, tempRange: 25 }), pt, BASE);
    const key = result.breakdown.flatMap((f) => f.keys).find((k) => k.key === 'tempMean');
    ok(key);
    ok(near(key.similarity, Math.exp(-0.5))); // 15 degrees from -55 with sigma 15
  });

  it('reports the gap for "what Earth cannot copy"', () => {
    const gap = pt.gaps.find((g) => g.key === 'tempMean');
    ok(gap);
    equal(gap.targetValue, -170);
    equal(gap.clampedValue, -55);
    equal(gap.gap, -115);
    const high = pt.gaps.find((g) => g.key === 'tempRange');
    ok(high);
    equal(high.gap, 35);
  });

  it('does not clamp a target at the edge of or inside the range', () => {
    const inside = makeTarget({
      tempMean: { value: -55, sigma: 15, source: 'fixture', badge: 'Mission' },
      tempRange: { value: 10, sigma: 10, source: 'fixture', badge: 'Mission' },
    });
    const p = prepareTarget(inside, ranges, TABLE);
    equal(p.gaps.filter((g) => g.key === 'tempMean' || g.key === 'tempRange').length, 0);
    equal(p.gaussian.tempMean?.clamped, -55);
  });

  it('clamps the Sunlight target too, using the latitudes present in the grid', () => {
    const cells = [makeCell({ lat: -45.25 }), makeCell({ lat: 10.25 }), makeCell({ lat: 60.75 })];
    const observed = computeEarthRanges(cells);
    const polar = makeTarget({}, { body: 'moon', lat: -89.5 });
    const p = prepareTarget(polar, observed, TABLE);
    const sun = p.gaussian.sunElevation;
    ok(sun);
    ok(sun.value < 2);
    equal(sun.clamped, observed.sunElevation?.min);
    ok(p.gaps.some((g) => g.key === 'sunElevation'));
  });
});

describe('Earth ranges', () => {
  const cells: EarthCell[] = [
    makeCell({ tempMean: -12, precip: 40, slope: null, roughness: null }),
    makeCell({ tempMean: 27, precip: null, slope: null, roughness: null }),
    makeCell({ tempMean: null, precip: 2200, slope: null, roughness: null }),
  ];
  const ranges = computeEarthRanges(cells);

  it('takes the minimum and maximum over the cells, skipping nulls', () => {
    deepEqual(ranges.tempMean, { min: -12, max: 27 });
    deepEqual(ranges.precip, { min: 40, max: 2200 });
  });

  it('is null for a factor with no data anywhere, and such a target is not clamped', () => {
    equal(ranges.slope, null);
    const p = prepareTarget(makeTarget(), ranges, TABLE);
    equal(p.gaussian.slope?.clamped, 5);
    ok(!p.gaps.some((g) => g.key === 'slope'));
  });

  it('includes Sunlight from the cell latitudes', () => {
    ok(ranges.sunElevation);
    equal(ranges.sunElevation.min, ranges.sunElevation.max); // all fixture cells share one latitude
  });
});

describe('Missing factors: leave out and renormalise', () => {
  it('leaves out a missing factor and renormalises the rest', () => {
    const cell = makeCell({ lithology: null, precip: 250 });
    const result = scoreCell(cell, prepared, BASE);
    const expected = productScore([
      { s: Math.exp(-0.5), w: 0.15 },
      { s: SUN, w: 0.1 },
      { s: 1, w: 0.6 }, // terrain 0.25 + ndvi 0.2 + temperature 0.15
    ]);
    ok(near(result.score, expected));
    // The same cell with a perfect rock match scores differently: the factor really was left out.
    notEqual(scoreCell(makeCell({ precip: 250 }), prepared, BASE).score, result.score);
  });

  it('matches the three worked examples in data/SCHEMA.md', () => {
    const rock = scoreCell(makeCell({ lithology: null }), prepared, BASE);
    equal(rock.coverage, 0.85);
    equal(rock.confidence, 'medium');
    deepEqual(rock.missing, ['lithology']);

    const terrain = scoreCell(makeCell({ slope: null, roughness: null }), prepared, BASE);
    equal(terrain.coverage, 0.75);
    equal(terrain.confidence, 'low');
    deepEqual(terrain.missing, ['slope', 'roughness']);

    const roughness = scoreCell(makeCell({ roughness: null }), prepared, BASE);
    equal(roughness.coverage, 0.875);
    equal(roughness.confidence, 'medium');
    deepEqual(roughness.missing, ['roughness']);
  });

  it('sets the renormalised weights of the present factors to sum to 1', () => {
    const result = scoreCell(makeCell({ lithology: null, roughness: null }), prepared, BASE);
    const total = result.breakdown.reduce((sum, f) => sum + f.effectiveWeight, 0);
    ok(near(total, 1, 1e-12));
    equal(result.breakdown.find((f) => f.factor === 'rockType')?.effectiveWeight, 0);
    equal(result.breakdown.find((f) => f.factor === 'rockType')?.similarity, null);
  });

  it('treats undefined and NaN in a cell as missing', () => {
    const broken = { ...makeCell(), slope: Number.NaN, lithology: undefined } as unknown as EarthCell;
    const result = scoreCell(broken, prepared, BASE);
    deepEqual(result.missing, ['slope', 'lithology']);
  });

  it('never lists Sunlight as missing: it is computed from latitude', () => {
    const result = scoreCell(makeCell({ slope: null, roughness: null, tempMean: null, tempRange: null }), prepared, BASE);
    ok(!result.missing.some((key) => (key as string).startsWith('sun')));
    const sunlight = result.breakdown.find((f) => f.factor === 'sunlight');
    ok(sunlight);
    ok(near(sunlight.similarity, SUN));
  });
});

describe('Missing factors: two-key half weight', () => {
  it('scores the factor from the present key with half the weight', () => {
    // slope 2 sigma off, roughness missing: terrain enters with weight 0.125 and similarity e^-2
    const cell = makeCell({ slope: 15, roughness: null });
    const result = scoreCell(cell, prepared, BASE);
    const expected = productScore([{ s: Math.exp(-2), w: 0.125 }, { s: SUN, w: 0.1 }, { s: 1, w: 0.65 }]);
    ok(near(result.score, expected));
    const terrain = result.breakdown.find((f) => f.factor === 'terrain');
    ok(terrain);
    equal(terrain.coveredWeight, 0.125);
    ok(near(terrain.similarity, Math.exp(-2)));
    ok(near(terrain.effectiveWeight, 0.125 / 0.875, 1e-12));
  });

  it('works the same way for Temperature', () => {
    const result = scoreCell(makeCell({ tempMean: null }), prepared, BASE);
    equal(result.coverage, 0.925);
    equal(result.confidence, 'medium');
    deepEqual(result.missing, ['tempMean']);
  });

  it('drops the whole factor and lists both keys when both are missing', () => {
    const result = scoreCell(makeCell({ tempMean: null, tempRange: null }), prepared, BASE);
    equal(result.coverage, 0.85);
    deepEqual(result.missing, ['tempMean', 'tempRange']);
    const temperature = result.breakdown.find((f) => f.factor === 'temperature');
    ok(temperature);
    equal(temperature.similarity, null);
    equal(temperature.coveredWeight, 0);
  });
});

describe('Missing factors: required NDVI and precipitation', () => {
  it('gives no score when NDVI is missing', () => {
    const result = scoreCell(makeCell({ ndvi: null }), prepared, BASE);
    equal(result.score, null);
    equal(result.confidence, null);
    equal(result.unscoredReason, 'required-factor-missing');
    deepEqual(result.missing, ['ndvi']);
    equal(result.coverage, 0.8);
    equal(result.limitingFactor, null);
  });

  it('gives no score when precipitation is missing', () => {
    const result = scoreCell(makeCell({ precip: null }), prepared, BASE);
    equal(result.score, null);
    equal(result.unscoredReason, 'required-factor-missing');
    deepEqual(result.missing, ['precip']);
    equal(result.coverage, 0.85);
  });

  it('reports the required factor first when coverage is also too low', () => {
    const result = scoreCell(makeCell({ ndvi: null, slope: null, roughness: null, lithology: null }), prepared, BASE);
    equal(result.unscoredReason, 'required-factor-missing');
  });

  it('still requires them when their weight is zero', () => {
    const noDryness: Weights = { ...BASE, dryness: 0 };
    const result = scoreCell(makeCell({ precip: null }), prepared, noDryness);
    equal(result.score, null);
    equal(result.unscoredReason, 'required-factor-missing');
    deepEqual(result.missing, ['precip']);
  });
});

describe('Missing factors: minimum coverage of 0.6', () => {
  it('scores a cell at exactly 0.6 (Base without Terrain and Rock type)', () => {
    const result = scoreCell(makeCell({ slope: null, roughness: null, lithology: null }), prepared, BASE);
    equal(result.coverage, 0.6);
    ok(result.score !== null);
    equal(result.confidence, 'low');
    equal(result.unscoredReason, null);
  });

  it('gives no score just below 0.6', () => {
    const result = scoreCell(makeCell({ slope: null, roughness: null, lithology: null, tempRange: null }), prepared, BASE);
    equal(result.coverage, 0.525);
    equal(result.score, null);
    equal(result.confidence, null);
    equal(result.unscoredReason, 'coverage-too-low');
    deepEqual(result.missing, ['slope', 'roughness', 'tempRange', 'lithology']);
  });

  it('holds the line a hair on either side of the limit', () => {
    const at: Weights = { terrain: 0, bareGround: 0.3, dryness: 0.2, temperature: 0, sunlight: 0.1, rockType: 0.4 };
    const below: Weights = { ...at, rockType: 0.4001, bareGround: 0.2999 };
    const cell = makeCell({ lithology: null });
    equal(scoreCell(cell, prepared, at).coverage, 0.6);
    ok(scoreCell(cell, prepared, at).score !== null);
    equal(scoreCell(cell, prepared, below).coverage, 0.5999);
    equal(scoreCell(cell, prepared, below).unscoredReason, 'coverage-too-low');
  });

  it('measures coverage with the active preset, so it changes with the preset', () => {
    const cell = makeCell({ lithology: null });
    equal(scoreCell(cell, prepared, PRESETS.base.weights).coverage, 0.85);
    equal(scoreCell(cell, prepared, PRESETS.rover.weights).coverage, 0.9);
    equal(scoreCell(cell, prepared, PRESETS.ice.weights).coverage, 0.75);
    equal(scoreCell(cell, prepared, PRESETS.astrobiology.weights).coverage, 0.7);
  });

  it('does not count a missing factor whose weight is zero', () => {
    const noRock: Weights = { ...BASE, rockType: 0 };
    const result = scoreCell(makeCell({ lithology: null }), prepared, noRock);
    equal(result.coverage, 1);
    equal(result.confidence, 'high');
    deepEqual(result.missing, []);
  });
});

describe('Confidence levels', () => {
  const cell = makeCell({ lithology: null });
  const withRock = (rockType: number): Weights => ({
    terrain: 0.2,
    bareGround: 0.2,
    dryness: 0.2,
    temperature: 0.2,
    sunlight: 0.2 - rockType,
    rockType,
  });

  it('is high only when coverage is exactly 1', () => {
    equal(scoreCell(makeCell(), prepared, BASE).confidence, 'high');
    const almost = scoreCell(cell, prepared, withRock(0.001));
    equal(almost.coverage, 0.999);
    equal(almost.confidence, 'medium');
  });

  it('is medium at exactly 0.8 and low just below', () => {
    const at = scoreCell(cell, prepared, withRock(0.2));
    equal(at.coverage, 0.8);
    equal(at.confidence, 'medium');
    const below = scoreCell(cell, prepared, { ...withRock(0.2), rockType: 0.201, terrain: 0.199 });
    equal(below.coverage, 0.799);
    equal(below.confidence, 'low');
  });

  it('is low from 0.6 up to 0.8 and null when unscored', () => {
    equal(scoreCell(makeCell({ slope: null, roughness: null }), prepared, BASE).confidence, 'low');
    equal(scoreCell(makeCell({ ndvi: null }), prepared, BASE).confidence, null);
  });
});

describe('Missing target values', () => {
  it('treats a null target value as missing for every cell', () => {
    const t = makeTarget({ tempMean: NULL_VALUE });
    const p = prepareTarget(t, WIDE_RANGES, TABLE);
    deepEqual(p.missingTargetKeys, ['tempMean']);
    for (const cell of [makeCell(), makeCell({ tempMean: -30 }), makeCell({ lat: 60.25 })]) {
      const result = scoreCell(cell, p, BASE);
      deepEqual(result.missing, ['tempMean']);
      equal(result.coverage, 0.925);
      equal(result.confidence, 'medium');
    }
    const key = scoreCell(makeCell(), p, BASE).breakdown.flatMap((f) => f.keys).find((k) => k.key === 'tempMean');
    equal(key?.status, 'missing-target');
    equal(key?.earthValue, 10);
  });

  it('applies the same limits: null terrain and rock targets fall to the 0.6 line', () => {
    const t = makeTarget({ slope: NULL_VALUE, roughness: NULL_VALUE, lithology: NULL_VALUE });
    const p = prepareTarget(t, WIDE_RANGES, TABLE);
    const result = scoreCell(makeCell(), p, BASE);
    equal(result.coverage, 0.6);
    equal(result.confidence, 'low');
    const worse = scoreCell(makeCell({ tempRange: null }), p, BASE);
    equal(worse.unscoredReason, 'coverage-too-low');
  });

  it('gives no score anywhere when a required target value is null', () => {
    const p = prepareTarget(makeTarget({ ndvi: NULL_VALUE }), WIDE_RANGES, TABLE);
    const result = scoreCell(makeCell(), p, BASE);
    equal(result.score, null);
    equal(result.unscoredReason, 'required-factor-missing');
    ok(result.reason.includes('target has no published'));
  });

  it('does not crash when every target value is null', () => {
    const all = makeTarget({
      tempMean: NULL_VALUE,
      tempRange: NULL_VALUE,
      precip: NULL_VALUE,
      ndvi: NULL_VALUE,
      slope: NULL_VALUE,
      roughness: NULL_VALUE,
      lithology: NULL_VALUE,
    });
    const p = prepareTarget(all, WIDE_RANGES, TABLE);
    equal(p.missingTargetKeys.length, 7);
    const result = scoreCell(makeCell(), p, BASE);
    equal(result.score, null);
    equal(result.coverage, 0.1); // only Sunlight is left
  });

  it('treats a value with no usable sigma as missing and records a warning', () => {
    const p = prepareTarget(makeTarget({ slope: { value: 5, sigma: null, source: 'fixture', badge: 'Mission' } }), WIDE_RANGES, TABLE);
    ok(p.missingTargetKeys.includes('slope'));
    ok(p.warnings.some((w) => w.includes('slope')));
    const zero = prepareTarget(makeTarget({ slope: { value: 5, sigma: 0, source: 'fixture', badge: 'Mission' } }), WIDE_RANGES, TABLE);
    ok(zero.missingTargetKeys.includes('slope'));
  });
});

describe('Per-cell outputs', () => {
  it('returns the six factors in DESIGN.md order with weights that sum to 1', () => {
    const result = scoreCell(makeCell(), prepared, BASE);
    deepEqual(result.breakdown.map((f) => f.factor), FACTORS.map((f) => f.id));
    ok(near(result.breakdown.reduce((sum, f) => sum + f.weight, 0), 1, 1e-12));
    for (const f of result.breakdown) {
      ok(near(f.keys.reduce((sum, k) => sum + k.weight, 0), f.weight, 1e-12));
    }
  });

  it('carries Earth value, target value, sigma and similarity for every key', () => {
    const result = scoreCell(makeCell({ precip: 250 }), prepared, BASE);
    const precip = result.breakdown.flatMap((f) => f.keys).find((k) => k.key === 'precip');
    ok(precip);
    equal(precip.earthValue, 250);
    equal(precip.targetValue, 0);
    equal(precip.targetClamped, 0);
    equal(precip.sigma, 250);
    equal(precip.unit, 'mm/year');
    equal(precip.status, 'scored');
    ok(near(precip.similarity, Math.exp(-0.5)));
  });

  it('names the factor that lowers the score the most as the limiting factor', () => {
    equal(scoreCell(makeCell({ precip: 900 }), prepared, BASE).limitingFactor, 'dryness');
    equal(scoreCell(makeCell({ slope: 30, roughness: 900 }), prepared, BASE).limitingFactor, 'terrain');
    equal(scoreCell(makeCell({ lithology: 3 }), prepared, NO_SUN).limitingFactor, 'rockType');
  });

  it('weighs the penalty, not just the lowest similarity', () => {
    // Rock similarity 0.15 at weight 0.01 costs less than terrain similarity ~0.61 at weight 0.5.
    const w: Weights = { terrain: 0.5, bareGround: 0.2, dryness: 0.19, temperature: 0.1, sunlight: 0, rockType: 0.01 };
    const result = scoreCell(makeCell({ lithology: 3, slope: 10, roughness: 200 }), prepared, w);
    equal(result.limitingFactor, 'terrain');
  });

  it('has no limiting factor for a perfect match or an unscored cell', () => {
    equal(scoreCell(makeCell(), prepared, NO_SUN).limitingFactor, null);
    equal(scoreCell(makeCell({ precip: null }), prepared, BASE).limitingFactor, null);
  });

  it('explains a scored cell in plain language, naming the limiting factor', () => {
    const result = scoreCell(makeCell({ precip: 2000 }), prepared, BASE);
    ok(result.reason.includes('Fixture Planitia'));
    ok(result.reason.includes('Held back by dryness'));
    ok(result.reason.includes('2,000 mm/year wetter than the target'));
  });

  it('says so in the reason when the comparison is against a clamped target', () => {
    const ranges: EarthRanges = { ...WIDE_RANGES, tempMean: { min: -55, max: 30 } };
    const cold = prepareTarget(makeTarget({ tempMean: { value: -170, sigma: 15, source: 'fixture', badge: 'Mission' } }), ranges, TABLE);
    const result = scoreCell(makeCell({ tempMean: 20 }), cold, BASE);
    equal(result.limitingFactor, 'temperature');
    ok(result.reason.includes('75 °C warmer than the closest Earth gets to the target'));
  });

  it('mentions reduced confidence and what is missing', () => {
    const result = scoreCell(makeCell({ lithology: null }), prepared, BASE);
    ok(result.reason.includes('Medium confidence: no data for rock class.'));
  });

  it('explains why an unscored cell has no score', () => {
    ok(scoreCell(makeCell({ ndvi: null }), prepared, BASE).reason.startsWith('No score: this cell has no vegetation (NDVI) data.'));
    const low = scoreCell(makeCell({ slope: null, roughness: null, lithology: null, tempRange: null }), prepared, BASE);
    ok(low.reason.startsWith('No score: only 53% of the weighted factors have data and 60% is needed.'));
  });

  it('marks a key whose factor has zero weight, without letting it change the score', () => {
    const result = scoreCell(makeCell({ lithology: 3 }), prepared, { ...NO_SUN, rockType: 0 });
    ok(near(result.score, 100));
    const key = result.breakdown.flatMap((f) => f.keys).find((k) => k.key === 'lithology');
    equal(key?.status, 'zero-weight');
    equal(key?.similarity, 0.15);
  });
});

describe('Nearest cell', () => {
  const cells = [makeCell({ lat: -7.75, lon: 110.25 }), makeCell({ lat: -7.25, lon: 110.25 }), makeCell({ lat: 64.75, lon: -17.25 })];

  it('snaps a site to the closest cell centre', () => {
    const hit = nearestCell(cells, -7.54, 110.446);
    ok(hit);
    equal(hit.index, 0);
    ok(hit.distanceKm > 20 && hit.distanceKm < 40);
  });

  it('handles the date line and an empty list', () => {
    const wrap = nearestCell([makeCell({ lat: 0.25, lon: 179.75 }), makeCell({ lat: 0.25, lon: 170.25 })], 0.25, -179.9);
    equal(wrap?.index, 0);
    equal(nearestCell([], 0, 0), null);
  });
});
