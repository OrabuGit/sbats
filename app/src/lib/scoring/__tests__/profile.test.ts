import { describe, it } from 'node:test';
import { deepEqual, equal, ok, throws } from 'node:assert/strict';
import { FACTORS } from '../factors';
import { PRESETS } from '../presets';
import {
  DIMENSIONS,
  DIMENSION_IDS,
  PURPOSES,
  PURPOSE_IDS,
  analogProfile,
  buildProfileIndex,
  dimensionCoverage,
  dimensionSimilarities,
  purposeWeights,
  rankIn,
} from '../profile';
import type { PurposeId } from '../profile';
import { factorSimilarities, prepareTarget, scoreCell, scoreCells } from '../score';
import { FACTOR_IDS } from '../types';
import { BASE, makeCell, makeTarget, near, sunSimilarity, TABLE, TARGET_LAT, WIDE_RANGES } from './fixtures';

const target = makeTarget();
const prepared = prepareTarget(target, WIDE_RANGES, TABLE);
const SUN = sunSimilarity(TARGET_LAT, target);

describe('Dimensions', () => {
  it('are geology, terrain, climate, bare ground and sunlight', () => {
    deepEqual([...DIMENSION_IDS], ['geology', 'terrain', 'climate', 'bareGround', 'sunlight']);
  });

  it('cover every scoring factor exactly once', () => {
    deepEqual(dimensionCoverage(), { missing: [], repeated: [] });
    equal(DIMENSIONS.reduce((n, d) => n + d.factors.length, 0), FACTORS.length);
  });

  it('put temperature and dryness together as climate', () => {
    deepEqual([...(DIMENSIONS.find((d) => d.id === 'climate')?.factors ?? [])], ['temperature', 'dryness']);
  });
});

describe('Factor similarities (the raw material of the profile)', () => {
  it('equal the per-factor similarities that enter the score', () => {
    const cell = makeCell({ precip: 300, slope: 12, tempMean: 25, ndvi: 0.2, lithology: 2 });
    const fromScore = scoreCell(cell, prepared, BASE).breakdown;
    const direct = factorSimilarities(cell, prepared);
    for (const f of fromScore) {
      ok(near(direct[f.factor].similarity, f.similarity ?? -1), f.factor);
      equal(direct[f.factor].present, 1);
    }
  });

  it('do not depend on weights, limits or the veto', () => {
    // NDVI missing: the score is refused, but every other factor still has its similarity.
    const cell = makeCell({ ndvi: null, precip: 250 });
    equal(scoreCell(cell, prepared, BASE).score, null);
    const direct = factorSimilarities(cell, prepared);
    equal(direct.bareGround.similarity, null);
    equal(direct.bareGround.present, 0);
    ok(near(direct.dryness.similarity, Math.exp(-0.5)));
    ok(near(direct.terrain.similarity, 1));
  });

  it('use the key that is present when a two-key factor has one key missing', () => {
    const direct = factorSimilarities(makeCell({ slope: 15, roughness: null }), prepared);
    ok(near(direct.terrain.similarity, Math.exp(-2)));
    equal(direct.terrain.present, 0.5);
  });

  it('follow the bare ground and permanent ice rule', () => {
    ok(near(factorSimilarities(makeCell({ snowIceFrac: 0.5 }), prepared).bareGround.similarity, 0.5));
    ok(near(factorSimilarities(makeCell({ ndvi: null, barrenFrac: 0.148 }), prepared).bareGround.similarity, 0.148));
    equal(factorSimilarities(makeCell({ ndvi: null, barrenFrac: 0 }), prepared).bareGround.similarity, 0);
  });
});

describe('Dimension similarities', () => {
  it('are the factor similarity itself for the four one-factor dimensions', () => {
    const cell = makeCell({ slope: 10, ndvi: 0.15, lithology: 2, lat: 40.25 });
    const f = factorSimilarities(cell, prepared);
    const d = dimensionSimilarities(cell, prepared);
    equal(d.geology, 0.6);
    ok(near(d.terrain, f.terrain.similarity ?? -1));
    ok(near(d.bareGround, f.bareGround.similarity ?? -1));
    ok(near(d.sunlight, f.sunlight.similarity ?? -1));
  });

  it('make climate the geometric mean of temperature and dryness, weighted by the frozen Base weights', () => {
    // temperature: tempMean 1 sigma off, tempRange perfect -> sqrt(e^-0.5). dryness: 2 sigma off -> e^-2.
    const d = dimensionSimilarities(makeCell({ tempMean: 20, precip: 500 }), prepared);
    const temperature = Math.sqrt(Math.exp(-0.5));
    const dryness = Math.exp(-2);
    equal(PRESETS.base.weights.temperature, PRESETS.base.weights.dryness); // equal weights, so a plain geometric mean
    ok(near(d.climate, Math.sqrt(temperature * dryness)));
  });

  it('weigh a half-present temperature factor by half its weight, as the score does', () => {
    // tempRange missing: temperature counts 0.075 (similarity e^-0.5), dryness 0.15 (similarity e^-2).
    const d = dimensionSimilarities(makeCell({ tempMean: 20, tempRange: null, precip: 500 }), prepared);
    ok(near(d.climate, Math.exp((0.075 * -0.5 + 0.15 * -2) / 0.225)));
  });

  it('fall back to the factor that has data, and are null only when the dimension has none', () => {
    const noTemp = dimensionSimilarities(makeCell({ tempMean: null, tempRange: null, precip: 250 }), prepared);
    ok(near(noTemp.climate, Math.exp(-0.5)));
    const none = dimensionSimilarities(makeCell({ lithology: null, slope: null, roughness: null }), prepared);
    equal(none.geology, null);
    equal(none.terrain, null);
    ok(none.climate !== null && none.bareGround !== null && none.sunlight !== null);
  });

  it('have no veto: a forest keeps a perfect geology and terrain match', () => {
    const forest = makeCell({ ndvi: 0.85, precip: 3000 });
    ok((scoreCell(forest, prepared, BASE).score ?? 100) < 1);
    const d = dimensionSimilarities(forest, prepared);
    equal(d.geology, 1);
    ok(near(d.terrain, 1));
    ok((d.bareGround ?? 1) < 1e-6);
    ok((d.climate ?? 1) < 1e-6);
    ok(near(d.sunlight, SUN));
  });

  it('are null for geology when the target has no rock class', () => {
    const noRock = prepareTarget(makeTarget({ lithology: { value: null, sigma: null, source: null, badge: null } }), WIDE_RANGES, TABLE);
    equal(dimensionSimilarities(makeCell(), noRock).geology, null);
  });
});

describe('Rank among Earth cells', () => {
  const sorted = Float64Array.from([0.15, 0.15, 0.6, 1, 1]);

  it('counts the share strictly above, the share tied, and the share beaten or tied', () => {
    deepEqual(rankIn(sorted, 1), { percentile: 1, shareAbove: 0, shareTied: 0.4 });
    const mid = rankIn(sorted, 0.6);
    ok(near(mid.percentile, 0.6) && near(mid.shareAbove, 0.4) && near(mid.shareTied, 0.2));
    const low = rankIn(sorted, 0.15);
    ok(near(low.percentile, 0.4) && near(low.shareAbove, 0.6) && near(low.shareTied, 0.4));
  });

  it('handles a value that is not in the list, and the two ends', () => {
    const between = rankIn(sorted, 0.5);
    ok(near(between.percentile, 0.4) && near(between.shareTied, 0));
    equal(rankIn(sorted, 2).percentile, 1);
    equal(rankIn(sorted, 0).percentile, 0);
    equal(rankIn(sorted, 0).shareAbove, 1);
  });

  it('gives an empty list a percentile of 0', () => {
    deepEqual(rankIn(new Float64Array(0), 0.5), { percentile: 0, shareAbove: 1, shareTied: 0 });
  });
});

describe('Analog profile', () => {
  const cells = [
    makeCell({ lithology: 1, slope: 5 }), // same rock, perfect terrain
    makeCell({ lithology: 2, slope: 10 }), // related rock
    makeCell({ lithology: 3, slope: 15 }), // unrelated rock
    makeCell({ lithology: null, slope: 20 }), // no rock data
  ];
  const index = buildProfileIndex(cells, prepared);

  it('returns the five dimensions in order, each with similarity and percentile', () => {
    const profile = analogProfile(cells[1] as (typeof cells)[number], prepared, index);
    deepEqual(profile.map((p) => p.id), [...DIMENSION_IDS]);
    const geology = profile[0];
    ok(geology);
    equal(geology.label, 'Geology');
    equal(geology.similarity, 0.6);
    // three cells have rock data: 1.0, 0.6, 0.15. The related rock beats or ties two of three.
    ok(near(geology.percentile, 2 / 3));
    ok(near(geology.shareAbove, 1 / 3));
    ok(near(geology.shareTied, 1 / 3));
  });

  it('leaves cells without data out of that dimension only', () => {
    equal(index.sorted.geology.length, 3);
    equal(index.sorted.terrain.length, 4);
    const profile = analogProfile(cells[3] as (typeof cells)[number], prepared, index);
    equal(profile[0]?.similarity, null);
    equal(profile[0]?.percentile, null);
    equal(profile[0]?.shareAbove, null);
    ok(near(profile[1]?.percentile ?? -1, 0.25)); // worst terrain of four
  });

  it('ranks the best cell at the top of its dimension', () => {
    const profile = analogProfile(cells[0] as (typeof cells)[number], prepared, index);
    equal(profile.find((p) => p.id === 'terrain')?.percentile, 1);
    equal(profile.find((p) => p.id === 'terrain')?.shareAbove, 0);
    equal(profile.find((p) => p.id === 'geology')?.percentile, 1);
  });

  it('reports ties: identical cells share a percentile and show how many are tied', () => {
    const same = [makeCell(), makeCell(), makeCell(), makeCell({ lithology: 3 })];
    const idx = buildProfileIndex(same, prepared);
    const geology = analogProfile(same[0] as (typeof same)[number], prepared, idx)[0];
    equal(geology?.percentile, 1);
    equal(geology?.shareTied, 0.75);
  });
});

describe('Purposes', () => {
  it('are the five named purposes, each with valid dimensions and a written reason', () => {
    deepEqual([...PURPOSE_IDS], ['geology', 'mobility', 'ice', 'astrobiology', 'base']);
    for (const p of PURPOSES) {
      ok(p.dimensions.length > 0, p.id);
      for (const d of p.dimensions) ok(DIMENSION_IDS.includes(d), `${p.id}: ${d}`);
      equal(new Set(p.dimensions).size, p.dimensions.length, `${p.id}: repeated dimension`);
      ok(p.why.length > 40 && p.label.length > 0, `${p.id}: needs a justification`);
    }
  });

  it('depend on the dimensions written in validation/purposes/DEFINITIONS.md', () => {
    const dims = (id: PurposeId): string[] => [...(PURPOSES.find((p) => p.id === id)?.dimensions ?? [])].sort();
    deepEqual(dims('geology'), ['geology']);
    deepEqual(dims('mobility'), ['bareGround', 'terrain']);
    deepEqual(dims('ice'), ['climate', 'geology', 'sunlight']);
    deepEqual(dims('astrobiology'), ['bareGround', 'climate', 'geology']);
    deepEqual(dims('base'), ['bareGround', 'climate', 'geology', 'sunlight', 'terrain']);
  });

  it('use only the frozen Base weights or zero: no new parameter', () => {
    for (const id of PURPOSE_IDS) {
      const w = purposeWeights(id);
      for (const f of FACTOR_IDS) ok(w[f] === 0 || w[f] === PRESETS.base.weights[f], `${id}.${f} = ${w[f]}`);
    }
    deepEqual(purposeWeights('geology'), { terrain: 0, bareGround: 0, dryness: 0, temperature: 0, sunlight: 0, rockType: 0.15 });
    deepEqual(purposeWeights('mobility'), { terrain: 0.25, bareGround: 0.2, dryness: 0, temperature: 0, sunlight: 0, rockType: 0 });
    deepEqual(purposeWeights('ice'), { terrain: 0, bareGround: 0, dryness: 0.15, temperature: 0.15, sunlight: 0.1, rockType: 0.15 });
    deepEqual(purposeWeights('astrobiology'), { terrain: 0, bareGround: 0.2, dryness: 0.15, temperature: 0.15, sunlight: 0, rockType: 0.15 });
  });

  it('make full base rehearsal exactly the existing all-round score', () => {
    deepEqual(purposeWeights('base'), PRESETS.base.weights);
    const cells = [makeCell(), makeCell({ precip: 700, ndvi: 0.3 }), makeCell({ lithology: null }), makeCell({ ndvi: null }), makeCell({ slope: 20, tempMean: -30 })];
    deepEqual(scoreCells(cells, prepared, purposeWeights('base')), scoreCells(cells, prepared, PRESETS.base.weights));
  });

  it('score instrument and geology testing by rock class alone', () => {
    const w = purposeWeights('geology');
    for (const [code, expected] of [[1, 100], [2, 60], [3, 15]] as const) {
      // A forest in a wet climate: near zero all-round, but the rock is what it is.
      const cell = makeCell({ lithology: code, ndvi: 0.85, precip: 3000 });
      ok(near(scoreCell(cell, prepared, w).score, expected));
      ok((scoreCell(cell, prepared, PRESETS.base.weights).score ?? 100) < 1);
    }
    equal(scoreCell(makeCell({ lithology: null }), prepared, w).unscoredReason, 'coverage-too-low');
  });

  it('keep the veto inside a purpose: vegetation still rules a site out for rover mobility', () => {
    const forest = scoreCell(makeCell({ ndvi: 0.85 }), prepared, purposeWeights('mobility'));
    ok((forest.score ?? 100) < 1);
    equal(forest.limitingFactor, 'bareGround');
    // ...but the wrong rock and a wet climate do not matter to a rover.
    ok(near(scoreCell(makeCell({ lithology: 3, precip: 3000, tempMean: -40 }), prepared, purposeWeights('mobility')).score, 100));
  });

  it('score ice and resources from climate, sunlight and rock, ignoring terrain and vegetation', () => {
    const w = purposeWeights('ice');
    const rough = scoreCell(makeCell({ slope: 30, roughness: 1500, ndvi: 0.6 }), prepared, w);
    const expected = 100 * SUN ** (0.1 / 0.55);
    ok(near(rough.score, expected));
    ok((scoreCell(makeCell({ precip: 3000 }), prepared, w).score ?? 100) < 1);
  });

  it('reject an unknown purpose', () => {
    throws(() => purposeWeights('tourism' as PurposeId), RangeError);
  });
});
